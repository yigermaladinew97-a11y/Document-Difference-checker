import express from 'express';
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
  authenticateGoogleUser,
  updateUserProfile,
  generateSvgAvatar,
  getUserById,
  verifyToken,
  saveCloudSession,
  getCloudSessions
} from './authService.js';
import { createShareReport, getShareReport } from './shareService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Enable CORS and JSON parsing
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve frontend static assets from public/ directory
app.use(express.static(path.join(__dirname, 'public')));

// Configure Multer for in-memory file handling (up to 50MB per file)
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
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
      { ext: '.txt', label: 'Plain Text & Markdown', desc: 'Raw character and token comparison' }
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

      // 1. Ingest Document A
      if (fileA) {
        docAContent = await extractDocumentContent(fileA.buffer, fileA.originalname);
      } else if (rawTextA && rawTextA.trim()) {
        docAContent = await extractDocumentContent(Buffer.from(rawTextA, 'utf8'), 'Document_A.txt');
      } else {
        return res.status(400).json({
          success: false,
          error: 'Document A is missing. Please upload a file or provide text for Document A.'
        });
      }

      // 2. Ingest Document B
      if (fileB) {
        docBContent = await extractDocumentContent(fileB.buffer, fileB.originalname);
      } else if (rawTextB && rawTextB.trim()) {
        docBContent = await extractDocumentContent(Buffer.from(rawTextB, 'utf8'), 'Document_B.txt');
      } else {
        return res.status(400).json({
          success: false,
          error: 'Document B is missing. Please upload a file or provide text for Document B.'
        });
      }

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
        apiKey: userApiKey
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
            sectionsCount: docAContent.sections.length
          },
          docB: {
            filename: docBContent.filename,
            format: docBContent.format,
            wordCount: docBContent.wordCount,
            charCount: docBContent.charCount,
            sectionsCount: docBContent.sections.length
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

      const results = [];
      let totalSim = 0;
      let identicalCount = 0;
      let mostChangedPair = null;

      for (let idx = 0; idx < pairs.length; idx++) {
        const pair = pairs[idx];
        const { id, aName, bName } = pair;

        const docAContent = await getParsedContent(aName);
        const docBContent = await getParsedContent(bName);

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
              apiKey: userApiKey
            });
          } catch (e) {
            contextAnalysis = generateLocalContextAnalysis(comparison.stats, comparison.sectionReports, comparison.summary);
          }
        } else {
          contextAnalysis = generateLocalContextAnalysis(comparison.stats, comparison.sectionReports, comparison.summary);
        }

        const sim = comparison.similarityPercent;
        totalSim += sim;
        if (comparison.isIdentical) identicalCount++;

        const pairResult = {
          pairId: id || `pair_${idx}`,
          index: idx,
          meta: {
            docA: {
              filename: docAContent.filename,
              format: docAContent.format,
              wordCount: docAContent.wordCount,
              charCount: docAContent.charCount,
              sectionsCount: docAContent.sections.length
            },
            docB: {
              filename: docBContent.filename,
              format: docBContent.format,
              wordCount: docBContent.wordCount,
              charCount: docBContent.charCount,
              sectionsCount: docBContent.sections.length
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
          sectionReports: comparison.sectionReports,
          spreadsheetDiff: comparison.spreadsheetDiff || null,
          diffTokens: comparison.diffTokens,
          filters: comparison.filters
        };

        if (!mostChangedPair || sim < mostChangedPair.similarityPercent) {
          mostChangedPair = {
            pairId: pairResult.pairId,
            nameA: docAContent.filename,
            nameB: docBContent.filename,
            similarityPercent: sim,
            changeCount: comparison.stats?.totalDifferences || 0
          };
        }

        results.push(pairResult);
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
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password, avatar, title, organization } = req.body;
    const result = await createUser({ name, email, password, avatar, title, organization });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Signup failed.' });
  }
});

// Auth: Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await authenticateUser({ email, password });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Login failed.' });
  }
});

// Auth: 1-Click Google Sign-In
app.post('/api/auth/google', async (req, res) => {
  try {
    const { email, name, avatar } = req.body;
    const result = await authenticateGoogleUser({ email, name, avatar });
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ error: err.message || 'Google authentication failed.' });
  }
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

// Fallback route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'), err => {
    if (err) {
      res.status(200).send('<h1>Document Difference Checker API</h1><p>API is active. Frontend will load here.</p>');
    }
  });
});

export const server = app.listen(PORT, () => {
  console.log(`\n🚀 Server is running on http://localhost:${PORT}`);
  console.log(`📡 Compare API ready at POST http://localhost:${PORT}/api/compare`);
});
