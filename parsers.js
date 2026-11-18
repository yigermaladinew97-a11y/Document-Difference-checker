import path from 'path';
import { extractText as extractPdfText } from 'unpdf';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import AdmZip from 'adm-zip';

// Polyfill globalThis.Iterator for Node runtimes (< v22) where PDF.js expects it
if (typeof globalThis.Iterator === 'undefined') {
  globalThis.Iterator = class Iterator {};
}

/**
 * Clean & sanitize extracted text from raw file streams:
 * - Unifies line breaks (\r\n and \r -> \n)
 * - Removes zero-width spaces, byte-order marks, soft hyphens
 * - Normalizes exotic Unicode space variants (non-breaking space, em space) to standard space
 * NOTE: Intentionally preserves raw spaces, indentation, tabs, and line breaks so that
 * whitespace-sensitive diffing works when 'Normalize Spaces' is disabled.
 * Whitespace normalization is applied on-demand via comparator.js `filterText`.
 */
function normalizeText(text) {
  if (!text) return '';
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
  
    // Remove zero-width spaces, byte-order marks, soft hyphens
    .replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '')
    // Normalize all Unicode space variants (non-breaking space, thin space, em space, etc.) to standard space
    .replace(/[\u00A0\u1680\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]/g, ' ');
}

/**
 * Decode basic XML entities
 */
function decodeXmlEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

/**
 * Extract text from PDF buffer using modern unpdf (per-page extraction)
 * with automatic, resilient fallback to pdf-parse if unpdf / PDF.js fails.
 */
async function parsePdf(buffer) {
  // 1. Try modern unpdf first
  try {
    const data = await extractPdfText(buffer);
    const rawPages = Array.isArray(data.text) ? data.text : [data.text || ''];
    
    const sections = rawPages.map((pageText, idx) => ({
      title: `Page ${idx + 1}`,
      content: normalizeText(pageText)
    })).filter(s => s.content.length > 0);

    const fullText = sections.map(s => s.content).join('\n\n');

    if (fullText && fullText.trim()) {
      return {
        type: 'pdf',
        pagesCount: data.totalPages || sections.length || 1,
        sections: sections.length > 0 ? sections : [{ title: 'Page 1', content: '' }],
        text: normalizeText(fullText)
      };
    }
  } catch (err) {
    console.warn('[PDF Parser] unpdf extraction encountered an issue, seamlessly switching to pdf-parse fallback:', err.message);
  }

  // 2. Resilient fallback: pdf-parse (runs in any Node runtime)
  const pdfData = await pdfParse(buffer);
  const text = normalizeText(pdfData.text || '');

  // Split by form feeds or generate page sections
  const pageChunks = text.split(/\f+/).map((p, idx) => ({
    title: `Page ${idx + 1}`,
    content: normalizeText(p)
  })).filter(s => s.content.length > 0);

  const sections = pageChunks.length > 0
    ? pageChunks
    : [{ title: 'Page 1', content: text }];

  return {
    type: 'pdf',
    pagesCount: pdfData.numpages || sections.length || 1,
    sections,
    text
  };
}

/**
 * Extract text from Word (.docx) buffer
 */
async function parseDocx(buffer) {
  const result = await mammoth.extractRawText({ buffer });
  const text = normalizeText(result.value);

  // Group into logical paragraph blocks as sections
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
  const sections = paragraphs.map((para, idx) => ({
    title: `Section ${idx + 1}`,
    content: para
  }));

  return {
    type: 'docx',
    sections: sections.length > 0 ? sections : [{ title: 'Document Body', content: text }],
    text
  };
}

/**
 * Extract text from Excel (.xlsx, .xls) buffer
 */
function parseExcel(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sections = [];
  const fullTextParts = [];
  const sheets = [];

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    // Convert to tab/pipe formatted text for readability
    const csvData = XLSX.utils.sheet_to_csv(sheet, { FS: ' | ', RS: '\n' });
    const cleaned = normalizeText(csvData);
    if (cleaned) {
      sections.push({
        title: `Sheet: ${sheetName}`,
        content: cleaned
      });
      fullTextParts.push(cleaned);
    }

    // Extract structured matrix for cell-by-cell spreadsheet grid comparison
    const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    if (matrix && matrix.length > 0) {
      sheets.push({
        name: sheetName,
        matrix
      });
    }
  }

  const text = fullTextParts.join('\n\n');
  return {
    type: 'xlsx',
    sheetsCount: workbook.SheetNames.length,
    sheets,
    sections: sections.length > 0 ? sections : [{ title: 'Sheet 1', content: '' }],
    text
  };
}

/**
 * Resolve true sequential slide order in PPTX using presentation.xml & presentation.xml.rels
 */
function getOrderedPptxSlides(zip) {
  try {
    const allEntries = zip.getEntries();
    const relsEntry = allEntries.find(e => e.entryName.toLowerCase() === 'ppt/_rels/presentation.xml.rels');
    const presEntry = allEntries.find(e => e.entryName.toLowerCase() === 'ppt/presentation.xml');

    if (relsEntry && presEntry) {
      const relsXml = relsEntry.getData().toString('utf8');
      const presXml = presEntry.getData().toString('utf8');

      // Map relationship ID (rId) -> target slide file path
      const relMatches = [...relsXml.matchAll(/<Relationship\s+[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/gi)];
      const rIdMap = new Map();
      for (const m of relMatches) {
        let target = m[2].replace(/\\/g, '/');
        if (!target.toLowerCase().startsWith('ppt/')) {
          target = 'ppt/' + target.replace(/^\/?/, '');
        }
        rIdMap.set(m[1], target.toLowerCase());
      }

      // Extract ordered slide references in <p:sldIdLst>
      const sldIdMatches = [...presXml.matchAll(/<p:sldId\b[^>]*\br:id="([^"]+)"/gi)];
      if (sldIdMatches.length > 0) {
        const ordered = [];
        for (let idx = 0; idx < sldIdMatches.length; idx++) {
          const rId = sldIdMatches[idx][1];
          const targetPath = rIdMap.get(rId);
          if (targetPath) {
            const entry = allEntries.find(e => e.entryName.toLowerCase() === targetPath);
            if (entry) {
              ordered.push({
                slideNum: idx + 1,
                entry
              });
            }
          }
        }
        if (ordered.length > 0) {
          return ordered;
        }
      }
    }
  } catch (err) {
    // If presentation.xml is missing or unparseable, fall back to natural sorting
  }

  // Fallback: collect ppt/slides/slide*.xml and sort naturally
  const slideEntries = [];
  for (const entry of zip.getEntries()) {
    const match = entry.entryName.match(/^ppt\/slides\/slide(\d+)\.xml$/i);
    if (match) {
      slideEntries.push({
        num: parseInt(match[1], 10),
        entry
      });
    }
  }
  slideEntries.sort((a, b) => a.num - b.num);
  return slideEntries.map((item, idx) => ({
    slideNum: idx + 1,
    entry: item.entry
  }));
}

/**
 * Extract clean slide text from slide XML:
 * - Strips auto-numbered slide footer fields (<a:fld type="slidenum">) to prevent false diff cascades
 * - Preserves in-paragraph runs (<a:r><a:t>) without splitting words
 */
function extractSlideXmlText(xml) {
  // Strip dynamic slide number and date/time footer fields
  const cleanXml = xml
    .replace(/<a:fld\b[^>]*\btype=["']slidenum["'][\s\S]*?<\/a:fld>/gi, '')
    .replace(/<a:fld\b[^>]*\btype=["']datetime["'][\s\S]*?<\/a:fld>/gi, '');

  // Extract text paragraph by paragraph (<a:p>)
  const pMatches = [...cleanXml.matchAll(/<a:p(?:\s+[^>]*)?>([\s\S]*?)<\/a:p>/g)];
  const paragraphs = [];

  for (const pMatch of pMatches) {
    const pXml = pMatch[1];
    const tMatches = [...pXml.matchAll(/<a:t(?:\s+[^>]*)?>([\s\S]*?)<\/a:t>/g)];
    if (tMatches.length > 0) {
      const pText = tMatches.map(m => decodeXmlEntities(m[1])).join('');
      if (pText.trim().length > 0) {
        paragraphs.push(pText);
      }
    }
  }

  // Fallback if no <a:p> matched
  if (paragraphs.length === 0) {
    const tMatches = [...cleanXml.matchAll(/<a:t(?:\s+[^>]*)?>([\s\S]*?)<\/a:t>/g)];
    return normalizeText(tMatches.map(m => decodeXmlEntities(m[1])).join(' '));
  }

  return normalizeText(paragraphs.join('\n'));
}

/**
 * Extract text from PowerPoint (.pptx) buffer
 */
function parsePptx(buffer) {
  const zip = new AdmZip(buffer);
  const slideEntries = getOrderedPptxSlides(zip);

  const sections = [];
  const fullTextParts = [];

  for (const item of slideEntries) {
    const xml = item.entry.getData().toString('utf8');
    const cleaned = extractSlideXmlText(xml);

    if (cleaned) {
      sections.push({
        title: `Slide ${item.slideNum}`,
        content: cleaned
      });
      fullTextParts.push(cleaned);
    }
  }

  const text = fullTextParts.join('\n\n');
  return {
    type: 'pptx',
    slidesCount: slideEntries.length,
    sections: sections.length > 0 ? sections : [{ title: 'Slide 1', content: '' }],
    text
  };
}

/**
 * Extract text from plain text formats (.txt, .md, .csv, .json)
 */
function parsePlainText(buffer, ext) {
  const text = normalizeText(buffer.toString('utf8'));
  const sheets = [];

  // If CSV, extract structured rows/columns matrix for cell-by-cell spreadsheet view
  if (ext === '.csv') {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      if (workbook.SheetNames && workbook.SheetNames.length > 0) {
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const matrix = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
        if (matrix && matrix.length > 0) {
          sheets.push({
            name: 'CSV Sheet',
            matrix
          });
        }
      }
    } catch (e) {
      // Fallback cleanly to text
    }
  }

  return {
    type: ext.replace('.', '') || 'text',
    sheets,
    sections: [{ title: 'Full Content', content: text }],
    text
  };
}

/**
 * Unified Document Extractor: Automatically identifies file format by extension / content
 * @param {Buffer} buffer - File buffer
 * @param {string} originalname - Original file name (e.g. report.docx)
 */
export async function extractDocumentContent(buffer, originalname) {
  const ext = path.extname(originalname || '').toLowerCase();

  let parsedResult;
  switch (ext) {
    case '.pdf':
      parsedResult = await parsePdf(buffer);
      break;
    case '.docx':
      parsedResult = await parseDocx(buffer);
      break;
    case '.xlsx':
    case '.xls':
      parsedResult = parseExcel(buffer);
      break;
    case '.pptx':
      parsedResult = parsePptx(buffer);
      break;
    case '.txt':
    case '.md':
    case '.csv':
    case '.json':
      parsedResult = parsePlainText(buffer, ext);
      break;
    default:
      // Try text fallback, or throw helpful error
      try {
        parsedResult = parsePlainText(buffer, ext);
      } catch (e) {
        throw new Error(`Unsupported file format "${ext}". Supported: .pdf, .docx, .xlsx, .pptx, .txt`);
      }
  }

  const words = parsedResult.text ? parsedResult.text.trim().split(/\s+/).filter(Boolean) : [];

  return {
    filename: originalname,
    format: parsedResult.type,
    text: parsedResult.text,
    sections: parsedResult.sections,
    sheets: parsedResult.sheets || [],
    wordCount: words.length,
    charCount: parsedResult.text.length
  };
}
