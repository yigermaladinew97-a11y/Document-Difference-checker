/**
 * ============================================================================
 * Document Difference Checker - Enterprise API Server
 * ============================================================================
 * Architecture Overview:
 *  - 100% In-Memory Processing: Zero disk retention for maximum security and privacy.
 *  - Multi-Format Document Ingestion: PDF, Word (DOCX), Excel (XLSX), PPTX, and TXT.
 *  - Dual-Engine Diffing: Myers diff algorithm (word-level) + Sørensen-Dice similarity.
 *  - Legal & Commercial Risk Radar: AI semantic audit with deterministic fallback.
 *  - Bank-Grade Security: PBKDF2 hashing (SHA-512, 10k iterations), JWT, 2FA OTP.
 * ============================================================================
 */

// Polyfill globalThis.Iterator for Node runtimes < 22 where PDF.js expects it
if (typeof globalThis.Iterator === 'undefined') {
  globalThis.Iterator = class Iterator {};
}

import express from 'express';
import compression from 'compression';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import { extractDocumentContent } from './parsers.js';
import { compareDocuments } from './comparator.js';
import { analyzeDocumentContext, generateLocalContextAnalysis } from './ai_summarizer.js';
import { generateAnnotatedExcel } from './excelExporter.js';
import {
  createUser,
  authenticateUser,
  verify2FACode,
  resend2FACode,
  requestPasswordReset,
  resetPasswordWithCode,
  resendPasswordResetCode,
  updateUserProfile,
  generateSvgAvatar,
  getUserById,
  verifyToken,
  saveCloudSession,
  getCloudSessions
} from './authService.js';
import { createShareReport, getShareReport } from './shareService.js';
import { getEmailDeliveryMode } from './emailService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Remove server fingerprinting header
app.disable('x-powered-by');

// ============================================================================
// 1. HARDENED HTTP SECURITY HEADERS (OWASP Top 10 Compliance)
// ============================================================================
app.use((req, res, next) => {
  // Prevent MIME-sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Prevent clickjacking & framing attacks
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  // Legacy XSS filter activation
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Strict Referrer disclosure policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  // Permissions Policy to prevent hardware access abuse
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  // Strict Transport Security (HSTS) in production
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  }
  next();
});

// ============================================================================
// 2. SLIDING-WINDOW RATE LIMITERS (Brute-Force & Denial-of-Service Defense)
// ============================================================================
const rateLimitBuckets = new Map();

function createRateLimiter({ windowMs = 60 * 1000, maxRequests = 120, message = 'Too many requests' }) {
  return (req, res, next) => {
    // Skip in test runner or internal health checks
    if (process.env.NODE_ENV === 'test' || req.path === '/api/health') {
      return next();
    }
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const key = `${req.baseUrl || req.path}:${ip}`;
    const now = Date.now();

    let bucket = rateLimitBuckets.get(key);
    if (!bucket || now > bucket.resetTime) {
      bucket = { count: 1, resetTime: now + windowMs };
      rateLimitBuckets.set(key, bucket);
    } else {
      bucket.count++;
      if (bucket.count > maxRequests) {
        const retryAfterSeconds = Math.max(1, Math.ceil((bucket.resetTime - now) / 1000));
        res.setHeader('Retry-After', retryAfterSeconds);
        return res.status(429).json({
          success: false,
          error: `${message}. Please try again in ${retryAfterSeconds}s.`
        });
      }
    }
    next();
  };
}

// Background cleanup of expired rate limit keys every 10 minutes
const rlCleanupTimer = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of rateLimitBuckets.entries()) {
    if (now > bucket.resetTime) rateLimitBuckets.delete(key);
  }
}, 10 * 60 * 1000);
if (rlCleanupTimer.unref) rlCleanupTimer.unref();

const generalLimiter = createRateLimiter({ windowMs: 60 * 1000, maxRequests: 240, message: 'Too many API requests' });
const diffLimiter = createRateLimiter({ windowMs: 60 * 1000, maxRequests: 60, message: 'Comparison rate limit reached' });
const authLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, maxRequests: 30, message: 'Too many authentication attempts' });

// ============================================================================
// 3. CORE PARSING, COMPRESSION & STATIC DELIVERY
// ============================================================================

// High-performance gzip/deflate compression
app.use(compression());

// Dynamic CORS configuration (development & Render deployment)
const configuredOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(origin => origin.trim().replace(/\/+$/, ''))
  .filter(Boolean);

const allowedOrigins = new Set(configuredOrigins);
if (process.env.RENDER_EXTERNAL_URL) {
  allowedOrigins.add(process.env.RENDER_EXTERNAL_URL.replace(/\/+$/, ''));
}

app.use(cors({
  origin(origin, callback) {
    if (!origin) return callback(null, true);
    const normalizedOrigin = origin.replace(/\/+$/, '');
    if (configuredOrigins.length === 0) return callback(null, true);
    if (allowedOrigins.has(normalizedOrigin) || normalizedOrigin.includes('localhost') || normalizedOrigin.includes('127.0.0.1')) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static client assets with aggressive caching & connection keep-alive
app.use(express.static(path.join(__dirname, 'public'), {
  maxAge: '1y',
  immutable: true,
  setHeaders: (res, filePath) => {
    res.setHeader('Keep-Alive', 'timeout=65');
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// Apply general rate limit to all /api endpoints
app.use('/api', generalLimiter);

// ============================================================================
// 4. SECURE FILE UPLOAD CONFIGURATION (Whitelist & Path Traversal Defense)
// ============================================================================
const ALLOWED_EXTENSIONS = new Set([
  '.pdf', '.docx', '.doc', '.xlsx', '.xls', '.pptx', '.ppt',
  '.txt', '.md', '.csv', '.json', '.png', '.jpg', '.jpeg', '.webp', '.svg'
]);

const DANGEROUS_EXTENSIONS = new Set([
  '.exe', '.bat', '.cmd', '.sh', '.php', '.pl', '.cgi', '.js',
  '.vbs', '.jar', '.bin', '.scr', '.pif', '.msi', '.com'
]);

function secureFileFilter(req, file, cb) {
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (DANGEROUS_EXTENSIONS.has(ext)) {
    return cb(new Error(`Security Exception: Uploading executable or script files (${ext}) is strictly prohibited.`));
  }
  if (!ALLOWED_EXTENSIONS.has(ext) && ext !== '') {
    return cb(new Error(`Unsupported file type: "${ext}". Supported formats: PDF, DOCX, XLSX, PPTX, TXT, Images.`));
  }
  cb(null, true);
}

function sanitizeFilename(name, fallback = 'document') {
  if (!name || typeof name !== 'string') return fallback;
  const clean = path.basename(name.replace(/[\x00-\x1f\x7f]/g, '').trim());
  return clean || fallback;
}

// In-Memory file upload storage (Zero Disk Retention)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: secureFileFilter
});

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    emailMode: getEmailDeliveryMode(),
    supportedFormats: ['.pdf', '.docx', '.xlsx', '.xls', '.pptx', '.txt', '.md', '.csv', '.json']
  });
});

/**
 * Returns supported formats metadata
 */
app.get('/api/formats', (req, res) => {
  res.json({
    formats: [
      { ext: '.pdf', label: 'PDF Document', desc: 'Page-by-page text & layout extraction' },
      { ext: '.docx', label: 'Word Document', desc: 'Paragraphs, headers, and bullet points' },
      { ext: '.xlsx', label: 'Excel Spreadsheet', desc: 'Multi-sheet tabular grid comparisons' },
      { ext: '.pptx', label: 'PowerPoint Presentation', desc: 'Slide-by-slide sequence matching' },
      { ext: '.txt', label: 'Plain Text & Markdown', desc: 'Raw character and token comparison' },
      { ext: '.png, .jpg', label: 'Visual Photos & Images', desc: 'Profile photo and visual asset mismatch comparison' }
    ]
  });
});

/**
 * Main Comparison Endpoint
 * Accepts:
 *   - fileA and fileB (multipart/form-data) OR raw textA and textB
 *   - apiKey (optional user-provided Gemini key)
 */
app.post(
  '/api/compare',
  diffLimiter,
  upload.fields([
    { name: 'fileA', maxCount: 1 },
    { name: 'fileB', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const files = req.files || {};
      const fileA = files.fileA ? files.fileA[0] : null;
      const fileB = files.fileB ? files.fileB[0] : null;

      const rawTextA = req.body.textA;
      const rawTextB = req.body.textB;
      const userApiKey = req.body.apiKey;

      let docAContent, docBContent;

      if (!fileA && (!rawTextA || !rawTextA.trim())) {
        return res.status(400).json({
          success: false,
          error: 'Document A is missing. Please upload a file or provide text for Document A.'
        });
      }
      if (!fileB && (!rawTextB || !rawTextB.trim())) {
        return res.status(400).json({
          success: false,
          error: 'Document B is missing. Please upload a file or provide text for Document B.'
        });
      }

      // Parallel Concurrent Ingestion of Document A and Document B (50% parsing time reduction)
      [docAContent, docBContent] = await Promise.all([
        fileA
          ? extractDocumentContent(fileA.buffer, sanitizeFilename(fileA.originalname, 'Document_A'))
          : extractDocumentContent(Buffer.from(rawTextA, 'utf8'), 'Document_A.txt'),
        fileB
          ? extractDocumentContent(fileB.buffer, sanitizeFilename(fileB.originalname, 'Document_B'))
          : extractDocumentContent(Buffer.from(rawTextB, 'utf8'), 'Document_B.txt')
      ]);

      // 3. Extract Smart Noise Filtering Options
      const filterOptions = {
        ignoreCase: req.body.ignoreCase === 'true' || req.body.ignoreCase === true,
        ignorePunctuation: req.body.ignorePunctuation === 'true' || req.body.ignorePunctuation === true,
        ignoreWhitespace: typeof req.body.ignoreWhitespace !== 'undefined' ? (req.body.ignoreWhitespace === 'true' || req.body.ignoreWhitespace === true) : true,
        ignoreNumbers: req.body.ignoreNumbers === 'true' || req.body.ignoreNumbers === true,
        trimLines: req.body.trimLines === 'true' || req.body.trimLines === true
      };

      // 4. Perform Word-by-Word Lexical Comparison & Diffing with Smart Filters
      const comparison = compareDocuments(docAContent, docBContent, filterOptions);

      // 5. Perform Contextual & Semantic Analysis (AI or Local Fallback)
      const contextAnalysis = await analyzeDocumentContext({
        textA: docAContent.text,
        textB: docBContent.text,
        stats: comparison.stats,
        sectionReports: comparison.sectionReports,
        summary: comparison.summary,
        apiKey: userApiKey,
        entitySwaps: comparison.entitySwaps || [],
        imageDiff: comparison.imageDiff || null
      });

      // 6. Build Unified Result Payload
      res.json({
        success: true,
        filters: comparison.filters,
        meta: {
          docA: {
            filename: docAContent.filename,
            format: docAContent.format,
            wordCount: docAContent.wordCount,
            charCount: docAContent.charCount,
            sectionsCount: docAContent.sections.length,
            imagesCount: (docAContent.images || []).length
          },
          docB: {
            filename: docBContent.filename,
            format: docBContent.format,
            wordCount: docBContent.wordCount,
            charCount: docBContent.charCount,
            sectionsCount: docBContent.sections.length,
            imagesCount: (docBContent.images || []).length
          }
        },
        metrics: {
          isIdentical: comparison.isIdentical,
          lexicalSimilarityPercent: comparison.similarityPercent,
          contextSimilarityPercent: contextAnalysis.contextSimilarityPercent,
          analysisMode: contextAnalysis.mode
        },
        stats: comparison.stats,
        summary: comparison.summary,
        contextAnalysis,
        entitySwaps: comparison.entitySwaps || [],
        imageDiff: comparison.imageDiff || null,
        sectionReports: comparison.sectionReports,
        spreadsheetDiff: comparison.spreadsheetDiff || null,
        diffTokens: comparison.diffTokens
      });
    } catch (error) {
      console.error('[API Error /api/compare]:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'An error occurred while comparing documents.'
      });
    }
  }
);

/**
 * Batch Comparison Endpoint
 * Ingests multiple files, pairs them up according to user mapping, and executes
 * high-throughput word & structural diffing across all pairs.
 */
app.post(
  '/api/batch-compare',
  diffLimiter,
  upload.any(),
  async (req, res) => {
    try {
      const files = req.files || [];
      if (!files.length) {
        return res.status(400).json({ success: false, error: 'No files were uploaded for batch comparison.' });
      }

      let pairs = [];
      try {
        pairs = typeof req.body.pairs === 'string' ? JSON.parse(req.body.pairs) : req.body.pairs;
      } catch (e) {
        return res.status(400).json({ success: false, error: 'Malformed pairs mapping JSON.' });
      }

      if (!Array.isArray(pairs) || pairs.length === 0) {
        return res.status(400).json({ success: false, error: 'No document pairs defined for comparison.' });
      }

      const userApiKey = req.body.apiKey;
      const filterOptions = {
        ignoreCase: req.body.ignoreCase === 'true' || req.body.ignoreCase === true,
        ignorePunctuation: req.body.ignorePunctuation === 'true' || req.body.ignorePunctuation === true,
        ignoreWhitespace: typeof req.body.ignoreWhitespace !== 'undefined' ? (req.body.ignoreWhitespace === 'true' || req.body.ignoreWhitespace === true) : true,
        ignoreNumbers: req.body.ignoreNumbers === 'true' || req.body.ignoreNumbers === true,
        trimLines: req.body.trimLines === 'true' || req.body.trimLines === true
      };

      // Map files by originalname (and sanitized safe key)
      const fileMap = new Map();
      files.forEach(f => {
        fileMap.set(f.originalname, f);
      });

      // Cache parsed document contents across pairs to prevent duplicate parsing
      const parsedCache = new Map();
      const getParsedContent = async (filename) => {
        if (parsedCache.has(filename)) return parsedCache.get(filename);
        const fileObj = fileMap.get(filename);
        if (!fileObj) {
          throw new Error(`File "${filename}" was missing from uploaded batch payload.`);
        }
        const content = await extractDocumentContent(fileObj.buffer, fileObj.originalname);
        parsedCache.set(filename, content);
        return content;
      };

      // Parallel Concurrent Batch Pair Processing
      const results = await Promise.all(
        pairs.map(async (pair, idx) => {
          const { id, aName, bName } = pair;

          const [docAContent, docBContent] = await Promise.all([
            getParsedContent(aName),
            getParsedContent(bName)
          ]);

          const comparison = compareDocuments(docAContent, docBContent, filterOptions);

          // Fast analytical context generation
          let contextAnalysis;
          if (userApiKey && pairs.length <= 3) {
            try {
              contextAnalysis = await analyzeDocumentContext({
                textA: docAContent.text,
                textB: docBContent.text,
                stats: comparison.stats,
                sectionReports: comparison.sectionReports,
                summary: comparison.summary,
                apiKey: userApiKey,
                entitySwaps: comparison.entitySwaps || [],
                imageDiff: comparison.imageDiff || null
              });
            } catch (e) {
              contextAnalysis = generateLocalContextAnalysis(comparison.stats, comparison.sectionReports, comparison.summary, docAContent.text, docBContent.text, comparison.entitySwaps || [], comparison.imageDiff || null);
            }
          } else {
            contextAnalysis = generateLocalContextAnalysis(comparison.stats, comparison.sectionReports, comparison.summary, docAContent.text, docBContent.text, comparison.entitySwaps || [], comparison.imageDiff || null);
          }

          return {
            pairId: id || `pair_${idx}`,
            index: idx,
            meta: {
              docA: {
                filename: docAContent.filename,
                format: docAContent.format,
                wordCount: docAContent.wordCount,
                charCount: docAContent.charCount,
                sectionsCount: docAContent.sections.length,
                imagesCount: (docAContent.images || []).length
              },
              docB: {
                filename: docBContent.filename,
                format: docBContent.format,
                wordCount: docBContent.wordCount,
                charCount: docBContent.charCount,
                sectionsCount: docBContent.sections.length,
                imagesCount: (docBContent.images || []).length
              }
            },
            metrics: {
              isIdentical: comparison.isIdentical,
              lexicalSimilarityPercent: comparison.similarityPercent,
              contextSimilarityPercent: contextAnalysis.contextSimilarityPercent,
              analysisMode: contextAnalysis.mode || 'local'
            },
            stats: comparison.stats,
            summary: comparison.summary,
            contextAnalysis,
            entitySwaps: comparison.entitySwaps || [],
            imageDiff: comparison.imageDiff || null,
            sectionReports: comparison.sectionReports,
            spreadsheetDiff: comparison.spreadsheetDiff || null,
            diffTokens: comparison.diffTokens,
            filters: comparison.filters
          };
        })
      );

      let totalSim = 0;
      let identicalCount = 0;
      let mostChangedPair = null;

      for (const pairResult of results) {
        const sim = pairResult.metrics.lexicalSimilarityPercent;
        totalSim += sim;
        if (pairResult.metrics.isIdentical) identicalCount++;

        if (!mostChangedPair || sim < mostChangedPair.similarityPercent) {
          mostChangedPair = {
            pairId: pairResult.pairId,
            nameA: pairResult.meta.docA.filename,
            nameB: pairResult.meta.docB.filename,
            similarityPercent: sim,
            changeCount: pairResult.stats?.totalDifferences || 0
          };
        }
      }

      const avgSim = results.length > 0 ? Math.round(totalSim / results.length) : 0;

      res.json({
        success: true,
        results,
        batchMetrics: {
          totalPairs: results.length,
          averageSimilarityPercent: avgSim,
          identicalCount,
          mostChangedPair
        }
      });
    } catch (err) {
      console.error('[API Error /api/batch-compare]:', err);
      res.status(500).json({ success: false, error: err.message || 'Batch comparison failed.' });
    }
  }
);

/**
 * POST /api/export/excel-diff
 * Generates and downloads a color-coded Microsoft Excel (.xlsx) workbook with delta notes
 */
app.post('/api/export/excel-diff', async (req, res) => {
  try {
    const { spreadsheetDiff, meta, stats } = req.body;
    if (!spreadsheetDiff || !Array.isArray(spreadsheetDiff)) {
      return res.status(400).json({ error: 'Missing spreadsheetDiff array payload.' });
    }

    const buffer = await generateAnnotatedExcel(spreadsheetDiff, meta || {}, stats || {});
    const baseName = (meta?.docB?.filename || meta?.docA?.filename || 'Spreadsheet').replace(/\.[^/.]+$/, '');
    const filename = `Diff_${baseName}_${Date.now()}.xlsx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.end(buffer);
  } catch (err) {
    console.error('[API Error /api/export/excel-diff]:', err);
    res.status(500).json({ error: 'Failed to generate annotated Excel workbook.' });
  }
});

// Auth Verification Middleware
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required.' });
  }

  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded || !decoded.userId) {
    return res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }

  req.userId = decoded.userId;
  next();
}

// Auth: Sign up
app.post('/api/auth/signup', authLimiter, async (req, res) => {
  try {
    const { name, email, password, avatar, title, organization } = req.body;
    const result = await createUser({ name, email, password, avatar, title, organization });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Signup failed.' });
  }
});

// Auth: Login
app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await authenticateUser({ email, password });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Login failed.' });
  }
});

// Auth: Verify Two-Factor Authentication (2FA) Code
app.post('/api/auth/verify-2fa', authLimiter, async (req, res) => {
  try {
    const { tempToken, code } = req.body;
    const result = await verify2FACode({ tempToken, code });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message || 'Verification failed.' });
  }
});

// Auth: Resend Two-Factor Authentication (2FA) Code
app.post('/api/auth/resend-2fa', authLimiter, async (req, res) => {
  try {
    const { tempToken } = req.body;
    const result = await resend2FACode({ tempToken });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to resend code.' });
  }
});

// Auth: Forgot Password Request (Sends 6-digit OTP to email)
app.post('/api/auth/forgot-password', authLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    const result = await requestPasswordReset({ email });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message || 'Password reset request failed.' });
  }
});

// Auth: Reset Password with 6-digit OTP Code
app.post('/api/auth/reset-password', authLimiter, async (req, res) => {
  try {
    const { tempToken, code, newPassword } = req.body;
    const result = await resetPasswordWithCode({ tempToken, code, newPassword });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message || 'Password reset failed.' });
  }
});

// Auth: Resend Password Reset Code
app.post('/api/auth/resend-reset-code', async (req, res) => {
  try {
    const { tempToken } = req.body;
    const result = await resendPasswordResetCode({ tempToken });
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to resend reset code.' });
  }
});

// Never trust profile data submitted by a browser as proof of Google identity.
app.post('/api/auth/google', (req, res) => {
  res.status(501).json({ error: 'Google sign-in is unavailable until verified OAuth is configured.' });
});

// Auth: Current User Profile
app.get('/api/auth/me', requireAuth, (req, res) => {
  const user = getUserById(req.userId);
  if (!user) return res.status(404).json({ error: 'User not found.' });
  res.json({ success: true, user });
});

// Auth: Update User Profile
app.put('/api/auth/profile', requireAuth, (req, res) => {
  try {
    const updatedUser = updateUserProfile(req.userId, req.body);
    res.json({ success: true, user: updatedUser });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Failed to update profile.' });
  }
});

// Auth: Generate SVG Avatar Data URI
app.post('/api/auth/avatar-generator', (req, res) => {
  const { name, theme } = req.body;
  const avatar = generateSvgAvatar(name || 'User', theme || 'orange');
  res.json({ success: true, avatar });
});

// Cloud History: Save session
app.post('/api/user/cloud-history', requireAuth, (req, res) => {
  try {
    const record = saveCloudSession(req.userId, req.body);
    res.json({ success: true, record });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save cloud comparison.' });
  }
});

// Cloud History: Get sessions
app.get('/api/user/cloud-history', requireAuth, (req, res) => {
  try {
    const records = getCloudSessions(req.userId);
    res.json({ success: true, records });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve cloud history.' });
  }
});

/**
 * POST /api/share
 * Generates an encrypted/short shareable public link for a comparison report
 */
app.post('/api/share', (req, res) => {
  try {
    const { comparisonData, title } = req.body;
    if (!comparisonData) {
      return res.status(400).json({ success: false, error: 'Missing comparisonData in request.' });
    }

    // Optional user ID from token if present
    let userId = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const decoded = verifyToken(authHeader.split(' ')[1]);
      if (decoded) userId = decoded.userId;
    }

    const share = createShareReport(comparisonData, { title, userId });
    res.json({
      success: true,
      shareId: share.shareId,
      shareUrl: `/share/${share.shareId}`,
      expiresAt: share.expiresAt,
      title: share.title
    });
  } catch (err) {
    console.error('[API Error /api/share]:', err);
    res.status(500).json({ success: false, error: err.message || 'Failed to create share link.' });
  }
});

/**
 * GET /api/share/:id
 * Fetches a shared report for public read-only viewing
 */
app.get('/api/share/:id', (req, res) => {
  try {
    const share = getShareReport(req.params.id);
    if (!share) {
      return res.status(404).json({
        success: false,
        error: 'This shared report does not exist or has expired after 7 days.'
      });
    }

    res.json({
      success: true,
      share: {
        shareId: share.shareId,
        createdAt: share.createdAt,
        expiresAt: share.expiresAt,
        title: share.title,
        comparisonData: share.comparisonData
      }
    });
  } catch (err) {
    console.error('[API Error /api/share/:id]:', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve shared report.' });
  }
});

// ============================================================================
// 5. CENTRALIZED SECURITY & MULTER ERROR HANDLER
// ============================================================================
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, error: 'File size limit exceeded (maximum allowed is 50MB per document).' });
    }
    return res.status(400).json({ success: false, error: `Upload error: ${err.message}` });
  }
  if (err && err.message && err.message.startsWith('Security Exception')) {
    return res.status(403).json({ success: false, error: err.message });
  }
  console.error('[Unhandled Server Error]:', err);
  res.status(500).json({ success: false, error: err.message || 'Internal server error.' });
});

// Fallback route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'), err => {
    if (err) {
      res.status(200).send('<h1>Document Difference Checker API</h1><p>API is active. Frontend will load here.</p>');
    }
  });
});

let server;
if (!process.env.VERCEL) {
  server = app.listen(PORT, () => {
    console.log(`\n🚀 Server is running on http://localhost:${PORT}`);
    console.log(`📡 Compare API ready at POST http://localhost:${PORT}/api/compare`);

    // Keep-Alive Self-Pinger for Render Free Tier
    // Automatically pings /api/health every 13 minutes to prevent the service from sleeping
    const externalUrl = process.env.RENDER_EXTERNAL_URL;
    if (externalUrl) {
      console.log(`⏱️ Keep-Alive service active for: ${externalUrl}`);
      const pingUrl = `${externalUrl.replace(/\/+$/, '')}/api/health`;
      setInterval(async () => {
        try {
          const pingRes = await fetch(pingUrl);
          console.log(`[Keep-Alive Ping] Status: ${pingRes.status} at ${new Date().toISOString()}`);
        } catch (pingErr) {
          console.warn('[Keep-Alive Ping] Failed to ping:', pingErr.message);
        }
      }, 13 * 60 * 1000); // Every 13 minutes (Render free tier sleeps at 15m)
    }
  });
}

export { server };
export default app;
