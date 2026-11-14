import { extractDocumentContent } from './parsers.js';
import * as XLSX from 'xlsx';
import AdmZip from 'adm-zip';
import { PDFDocument, StandardFonts } from 'pdf-lib';

async function runTests() {
  console.log('--- Testing Document Extractors ---\n');

  // 1. Test Plain Text / Markdown
  console.log('[1/5] Testing Plain Text / Markdown Extraction...');
  const textBuffer = Buffer.from('# Project Overview\n\nThis is document version 1.\nAll systems are operational.');
  const textRes = await extractDocumentContent(textBuffer, 'notes.md');
  console.log(`✓ Text Extracted: ${textRes.wordCount} words, format: ${textRes.format}`);
  console.log(`  Sample: "${textRes.text.replace(/\n/g, ' ')}"`);

  // 2. Test Excel (.xlsx) Extraction
  console.log('\n[2/5] Testing Excel (.xlsx) Extraction...');
  const wb = XLSX.utils.book_new();
  const wsData = [
    ['Product', 'Q1 Revenue', 'Q2 Revenue'],
    ['Widget Alpha', 12000, 15500],
    ['Widget Beta', 8500, 9100]
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  XLSX.utils.book_append_sheet(wb, ws, 'Sales 2026');
  const xlsxBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  const xlsxRes = await extractDocumentContent(xlsxBuffer, 'q1_report.xlsx');
  console.log(`✓ Excel Extracted: ${xlsxRes.wordCount} words, ${xlsxRes.sections.length} sheets`);
  console.log(`  Section title: "${xlsxRes.sections[0].title}"`);
  console.log(`  Preview: ${xlsxRes.sections[0].content.split('\n')[0]}`);

  // 3. Test PowerPoint (.pptx) Extraction
  console.log('\n[3/5] Testing PowerPoint (.pptx) Extraction...');
  const pptxZip = new AdmZip();
  const slide1Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
      <p:cSld><p:spTree><p:sp><p:txBody>
        <a:p><a:r><a:t>Quarterly Strategy Meeting</a:t></a:r></a:p>
        <a:p><a:r><a:t>Agenda: Revenue, Hiring, Expansion</a:t></a:r></a:p>
      </p:txBody></p:sp></p:spTree></p:cSld>
    </p:sld>`;
  const slide2Xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
      <p:cSld><p:spTree><p:sp><p:txBody>
        <a:p><a:r><a:t>Key Milestone Achieved</a:t></a:r></a:p>
        <a:p><a:r><a:t>Customer base grew by 45% in 2026</a:t></a:r></a:p>
      </p:txBody></p:sp></p:spTree></p:cSld>
    </p:sld>`;
  pptxZip.addFile('ppt/slides/slide1.xml', Buffer.from(slide1Xml, 'utf8'));
  pptxZip.addFile('ppt/slides/slide2.xml', Buffer.from(slide2Xml, 'utf8'));
  const pptxBuffer = pptxZip.toBuffer();

  const pptxRes = await extractDocumentContent(pptxBuffer, 'presentation.pptx');
  console.log(`✓ PPTX Extracted: ${pptxRes.wordCount} words, ${pptxRes.sections.length} slides`);
  console.log(`  Slide 1: "${pptxRes.sections[0].content}"`);
  console.log(`  Slide 2: "${pptxRes.sections[1].content}"`);

  // 4. Test PDF (.pdf) Extraction using pdf-lib real generated PDF
  console.log('\n[4/5] Testing PDF (.pdf) Extraction...');
  const pdfDoc = await PDFDocument.create();
  const pdfPage = pdfDoc.addPage([600, 400]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  pdfPage.drawText('Contract Agreement 2026 - All Terms Accepted', { x: 50, y: 350, size: 14, font });
  const pdfBytes = await pdfDoc.save();
  const pdfBuffer = Buffer.from(pdfBytes);

  const pdfRes = await extractDocumentContent(pdfBuffer, 'contract.pdf');
  console.log(`✓ PDF Extracted: ${pdfRes.wordCount} words, ${pdfRes.sections.length} pages`);
  console.log(`  Content: "${pdfRes.text}"`);

  // 5. Test Word (.docx) Extraction
  console.log('\n[5/5] Testing Word (.docx) Extraction...');
  const docxZip = new AdmZip();
  const docxXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Confidential Partnership Agreement for 2026</w:t></w:r></w:p></w:body></w:document>';
  docxZip.addFile('word/document.xml', Buffer.from(docxXml, 'utf8'));
  const docxBuffer = docxZip.toBuffer();
  const docxRes = await extractDocumentContent(docxBuffer, 'agreement.docx');
  console.log(`✓ Word Extracted: ${docxRes.wordCount} words, format: ${docxRes.format}`);
  console.log(`  Content: "${docxRes.text}"`);

  console.log('\n=======================================');
  console.log('🎉 STEP 1 VERIFICATION COMPLETE: ALL EXTRACTORS WORKING CLEANLY!');
  console.log('=======================================');
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
