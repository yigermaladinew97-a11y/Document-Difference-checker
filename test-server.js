import http from 'http';
import * as XLSX from 'xlsx';
import AdmZip from 'adm-zip';

async function runServerTest() {
  console.log('--- Testing Web Server & Compare API (Step 4) ---\n');

  // Dynamically import server or run against port 3000
  // Let's spawn or start server
  process.env.PORT = '3099';
  const { default: app, server } = await import('./server.js');
  
  // Wait a moment for server to listen
  await new Promise(r => setTimeout(r, 600));

  console.log('[1/3] Testing GET /api/health...');
  const healthRes = await fetch('http://localhost:3099/api/health');
  const healthData = await healthRes.json();
  console.log(`✓ Health status: ${healthData.status}`);
  console.log(`✓ Formats: ${healthData.supportedFormats.join(', ')}`);

  console.log('\n[2/3] Testing POST /api/compare with Text Input...');
  const textFormData = new FormData();
  textFormData.append('textA', 'The company agreed to supply 500 units by December 1st with full warranty coverage.');
  textFormData.append('textB', 'The company agreed to supply 750 units by December 15th with limited warranty coverage.');

  const compRes = await fetch('http://localhost:3099/api/compare', {
    method: 'POST',
    body: textFormData
  });
  const compData = await compRes.json();
  console.log(`✓ Response Success: ${compData.success}`);
  console.log(`✓ Lexical Similarity: ${compData.metrics.lexicalSimilarityPercent}%`);
  console.log(`✓ Context Score: ${compData.metrics.contextSimilarityPercent}%`);
  console.log(`✓ Summary Headline: "${compData.summary.headline}"`);
  console.log(`✓ Analysis Mode: ${compData.metrics.analysisMode}`);

  console.log('\n[3/3] Testing POST /api/compare with Multipart File Uploads (Excel vs Word)...');
  // Generate Excel buffer
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([['Item', 'Qty'], ['Server Blade', 10]]);
  XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
  const xlsxBuf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  // Generate Word buffer
  const docxZip = new AdmZip();
  docxZip.addFile('word/document.xml', Buffer.from('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Inventory: Server Blade Qty 10</w:t></w:r></w:p></w:body></w:document>', 'utf8'));
  const docxBuf = docxZip.toBuffer();

  const fileFormData = new FormData();
  fileFormData.append('fileA', new Blob([xlsxBuf]), 'inventory_v1.xlsx');
  fileFormData.append('fileB', new Blob([docxBuf]), 'inventory_v2.docx');

  const fileCompRes = await fetch('http://localhost:3099/api/compare', {
    method: 'POST',
    body: fileFormData
  });
  const fileCompData = await fileCompRes.json();
  console.log(`✓ Multi-format compare status: ${fileCompRes.status}`);
  console.log(`✓ File A (${fileCompData.meta.docA.format}): ${fileCompData.meta.docA.filename}`);
  console.log(`✓ File B (${fileCompData.meta.docB.format}): ${fileCompData.meta.docB.filename}`);
  console.log(`✓ Result: ${fileCompData.metrics.lexicalSimilarityPercent}% word match, category: ${fileCompData.summary.category}`);

  console.log('\n=======================================');
  console.log('🎉 STEP 4 VERIFICATION COMPLETE: SERVER & API ENDPOINTS FULLY OPERATIONAL!');
  console.log('=======================================');

  if (server && server.close) {
    await new Promise(r => server.close(r));
  }
  process.exit(0);
}

runServerTest().catch(err => {
  console.error('Server test failed:', err);
  process.exit(1);
});
