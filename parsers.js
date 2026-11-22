/**
 * ============================================================================
 * Document Parsing & Ingestion Subsystem
 * ============================================================================
 * Multi-format document parser that extracts clean text streams, page/slide chunks,
 * and tabular matrix structures directly from in-memory binary buffers.
 *
 * Supported Formats:
 *  1. PDF (.pdf)         : unpdf + high-speed pdf-parse fallback
 *  2. Word (.docx)       : Mammoth raw text & paragraph chunker
 *  3. Excel (.xlsx, .xls): SheetJS tabular CSV & 2D cell matrix
 *  4. PowerPoint (.pptx) : AdmZip XML parser for slide sequences
 *  5. Plain Text (.txt)  : Standard UTF-8 decoding
 * ============================================================================
 */

import path from 'path';
import crypto from 'crypto';
import { extractText as extractPdfText } from 'unpdf';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import AdmZip from 'adm-zip';
import { PDFDocument, PDFRawStream, PDFName } from 'pdf-lib';

// Polyfill globalThis.Iterator for Node runtimes (< v22) where PDF.js expects it
if (typeof globalThis.Iterator === 'undefined') {
  globalThis.Iterator = class Iterator {};
}

// Detect if running on Node 22+ where unpdf/PDF.js has native Iterator support
const isNode22OrHigher = parseInt(process.versions.node.split('.')[0], 10) >= 22;
// In Node < 22 (e.g. Render default Node 20, Docker), immediately use high-performance pdf-parse
let unpdfFailedGlobally = !isNode22OrHigher;

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
 * Extract embedded images from a zip package (.docx or .pptx)
 */
function extractImagesFromZip(buffer, mediaPrefix = 'word/media/') {
  try {
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();
    const images = [];

    for (const entry of entries) {
      if (entry.entryName.startsWith(mediaPrefix) && !entry.isDirectory) {
        const filename = path.basename(entry.entryName);
        const ext = path.extname(filename).toLowerCase();
        if (['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg', '.bmp'].includes(ext)) {
          const imgBuffer = entry.getData();
          const hash = crypto.createHash('sha256').update(imgBuffer).digest('hex');
          const mimeType = ext === '.png' ? 'image/png'
            : (ext === '.jpg' || ext === '.jpeg') ? 'image/jpeg'
            : ext === '.webp' ? 'image/webp'
            : ext === '.svg' ? 'image/svg+xml'
            : 'image/png';

          const dataUri = imgBuffer.length <= 2 * 1024 * 1024
            ? `data:${mimeType};base64,${imgBuffer.toString('base64')}`
            : null;

          images.push({
            id: `img_${images.length + 1}`,
            name: filename,
            ext,
            size: imgBuffer.length,
            sizeKb: Math.round(imgBuffer.length / 1024),
            hash,
            mimeType,
            dataUri
          });
        }
      }
    }
    return images;
  } catch (err) {
    return [];
  }
}

/**
 * Extract embedded image streams from a PDF document
 */
async function extractImagesFromPdf(buffer) {
  try {
    const pdfDoc = await PDFDocument.load(buffer, { ignoreEncryption: true });
    const images = [];
    const context = pdfDoc.context;
    let idx = 1;

    for (const [ref, obj] of context.enumerateIndirectObjects()) {
      if (obj instanceof PDFRawStream) {
        const dict = obj.dict;
        const subtype = dict.get(PDFName.of('Subtype'));
        if (subtype && subtype.toString() === '/Image') {
          const filter = dict.get(PDFName.of('Filter'))?.toString() || '';
          const rawBytes = obj.contents;
          if (!rawBytes || rawBytes.length === 0) continue;

          const hash = crypto.createHash('sha256').update(rawBytes).digest('hex');
          let ext = '.jpg';
          let mimeType = 'image/jpeg';
          if (filter.includes('FlateDecode')) {
            ext = '.png';
            mimeType = 'image/png';
          }

          const dataUri = (rawBytes.length <= 2 * 1024 * 1024 && (ext === '.jpg' || filter.includes('DCTDecode')))
            ? `data:${mimeType};base64,${Buffer.from(rawBytes).toString('base64')}`
            : null;

          images.push({
            id: `pdf_img_${idx}`,
            name: `PDF_Embedded_Image_${idx}${ext}`,
            ext,
            size: rawBytes.length,
            sizeKb: Math.round(rawBytes.length / 1024),
            hash,
            mimeType,
            dataUri
          });
          idx++;
        }
      }
    }
    return images;
  } catch (err) {
    return [];
  }
}

/**
 * Parse standalone image file (.png, .jpg, .jpeg, .webp, .svg)
 */
function parseImageFile(buffer, originalname, ext) {
  const mimeType = ext === '.png' ? 'image/png'
    : (ext === '.jpg' || ext === '.jpeg') ? 'image/jpeg'
    : ext === '.webp' ? 'image/webp'
    : ext === '.svg' ? 'image/svg+xml'
    : 'image/png';

  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  const sizeKb = Math.round(buffer.length / 1024);
  const dataUri = `data:${mimeType};base64,${buffer.toString('base64')}`;

  return {
    type: 'image',
    images: [{
      id: 'img_1',
      name: originalname,
      ext,
      size: buffer.length,
      sizeKb,
      hash,
      mimeType,
      dataUri
    }],
    sections: [{
      title: 'Visual Asset',
      content: `[Visual Asset / Profile Photo: ${originalname} (${sizeKb} KB, Hash: ${hash.slice(0, 12)})]`
    }],
    text: `[Visual Asset / Profile Photo: ${originalname} (${sizeKb} KB, Hash: ${hash.slice(0, 12)})]`
  };
}

/**
 * Extract text from PDF buffer using modern unpdf (per-page extraction)
 * with automatic, resilient fallback to pdf-parse if unpdf / PDF.js fails.
 */
async function parsePdf(buffer) {
  // 1. Try modern unpdf only if environment supports it and hasn't failed
  if (!unpdfFailedGlobally) {
    try {
      const data = await extractPdfText(buffer);
      const rawPages = Array.isArray(data.text) ? data.text : [data.text || ''];
      
      const sections = rawPages.map((pageText, idx) => ({
        title: `Page ${idx + 1}`,
        content: normalizeText(pageText)
      })).filter(s => s.content.length > 0);

      const fullText = sections.map(s => s.content).join('\n\n');
      const images = await extractImagesFromPdf(buffer);

      if (fullText && fullText.trim()) {
        return {
          type: 'pdf',
          pagesCount: data.totalPages || sections.length || 1,
          sections: sections.length > 0 ? sections : [{ title: 'Page 1', content: '' }],
          text: normalizeText(fullText),
          images
        };
      }
    } catch (err) {
      unpdfFailedGlobally = true;
      console.warn('[PDF Parser] unpdf extraction encountered an issue, permanently switching to fast pdf-parse fallback:', err.message);
    }
  }

  // 2. High-speed, universal parser: pdf-parse (runs in all Node versions in ~20-50ms)
  const pdfData = await pdfParse(buffer);
  const text = normalizeText(pdfData.text || '');
  const images = await extractImagesFromPdf(buffer);

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
    text,
    images
  };
}

/**
 * Extract text from Word (.docx) buffer
 */
async function parseDocx(buffer) {
  let text = '';
  try {
    const result = await mammoth.extractRawText({ buffer });
    text = normalizeText(result.value);
  } catch (err) {
    try {
      const zip = new AdmZip(buffer);
      const docXml = zip.readAsText('word/document.xml');
      text = normalizeText(docXml.replace(/<[^>]+>/g, ' '));
    } catch {
      text = '';
    }
  }
  const images = extractImagesFromZip(buffer, 'word/media/');

  // Group into logical paragraph blocks as sections
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());
  const sections = paragraphs.map((para, idx) => ({
    title: `Section ${idx + 1}`,
    content: para
  }));

  return {
    type: 'docx',
    sections: sections.length > 0 ? sections : [{ title: 'Document Body', content: text }],
    text,
    images
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
  const images = extractImagesFromZip(buffer, 'ppt/media/');
  return {
    type: 'pptx',
    slidesCount: slideEntries.length,
    sections: sections.length > 0 ? sections : [{ title: 'Slide 1', content: '' }],
    text,
    images
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
    case '.png':
    case '.jpg':
    case '.jpeg':
    case '.webp':
    case '.svg':
      parsedResult = parseImageFile(buffer, originalname, ext);
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
    images: parsedResult.images || [],
    imagesCount: (parsedResult.images || []).length,
    wordCount: words.length,
    charCount: parsedResult.text.length
  };
}
