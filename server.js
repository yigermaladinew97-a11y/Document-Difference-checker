import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

import { extractDocumentContent } from './parsers.js';
import { compareDocuments } from './comparator.js';
import { analyzeDocumentContext } from './ai_summarizer.js';
import { generateAnnotatedExcel } from './excelExporter.js';

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
