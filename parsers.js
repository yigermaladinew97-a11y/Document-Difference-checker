import path from 'path';
import { extractText as extractPdfText } from 'unpdf';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import AdmZip from 'adm-zip';

/**
 * Clean & normalize extracted text
 */
function normalizeText(text) {
  if (!text) return '';
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n\s*\n+/g, '\n\n')
    .trim();
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
 */
async function parsePdf(buffer) {
  const data = await extractPdfText(buffer);
  const rawPages = Array.isArray(data.text) ? data.text : [data.text || ''];
  
  const sections = rawPages.map((pageText, idx) => ({
    title: `Page ${idx + 1}`,
    content: normalizeText(pageText)
  })).filter(s => s.content.length > 0);

  const fullText = sections.map(s => `[${s.title}]\n${s.content}`).join('\n\n');

  return {
    type: 'pdf',
    pagesCount: data.totalPages || sections.length,
    sections: sections.length > 0 ? sections : [{ title: 'Page 1', content: '' }],
    text: normalizeText(fullText)
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
    content: para.trim()
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
      fullTextParts.push(`=== Sheet: ${sheetName} ===\n${cleaned}`);
    }
  }

  const text = fullTextParts.join('\n\n');
  return {
    type: 'xlsx',
    sheetsCount: workbook.SheetNames.length,
    sections: sections.length > 0 ? sections : [{ title: 'Sheet 1', content: '' }],
    text
  };
}

/**
 * Extract text from PowerPoint (.pptx) buffer
 */
function parsePptx(buffer) {
  const zip = new AdmZip(buffer);
  const zipEntries = zip.getEntries();
  const slideEntries = [];

  for (const entry of zipEntries) {
    const match = entry.entryName.match(/^ppt\/slides\/slide(\d+)\.xml$/i);
    if (match) {
      slideEntries.push({
        slideNum: parseInt(match[1], 10),
        entry
      });
    }
  }

  // Sort slides in natural presentation order (slide1, slide2, slide3...)
  slideEntries.sort((a, b) => a.slideNum - b.slideNum);

  const sections = [];
  const fullTextParts = [];

  for (const item of slideEntries) {
    const xml = item.entry.getData().toString('utf8');
    // Extract all text inside <a:t>...</a:t> elements
    const matches = [...xml.matchAll(/<a:t(?:\s+[^>]*)?>([\s\S]*?)<\/a:t>/g)];
    const slideText = matches
      .map(m => decodeXmlEntities(m[1].trim()))
      .filter(t => t.length > 0)
      .join(' ');

    const cleaned = normalizeText(slideText);
    if (cleaned) {
      sections.push({
        title: `Slide ${item.slideNum}`,
        content: cleaned
      });
      fullTextParts.push(`[Slide ${item.slideNum}]\n${cleaned}`);
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
  return {
    type: ext.replace('.', '') || 'text',
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
    wordCount: words.length,
    charCount: parsedResult.text.length
  };
}
