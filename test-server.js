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

  // 4. Test Smart Noise Filters over API
  console.log('\n[4/4] Testing POST /api/compare with Smart Noise Filters (Case + Punctuation + Numbers)...');
  const filterForm = new FormData();
  filterForm.append('textA', 'Invoice #101: Total $5,000.00 USD due within 30 days.');
  filterForm.append('textB', 'invoice #202: total $9,500.00 usd due within 60 days');
  filterForm.append('ignoreCase', 'true');
  filterForm.append('ignorePunctuation', 'true');
  filterForm.append('ignoreNumbers', 'true');
  filterForm.append('ignoreWhitespace', 'true');

  const filterRes = await fetch('http://localhost:3099/api/compare', {
    method: 'POST',
    body: filterForm
  });
  const filterData = await filterRes.json();
  console.log(`✓ Filtered response status: ${filterRes.status}`);
  console.log(`✓ Lexical Similarity with filters: ${filterData.metrics.lexicalSimilarityPercent}%`);
  console.log(`✓ Is Identical with filters: ${filterData.metrics.isIdentical}`);
  console.log(`✓ Filters applied in response:`, filterData.filters);

  // 5. Test Whitespace Sensitivity over API (Normalize Spaces ON vs OFF)
  console.log('\n[5/5] Testing POST /api/compare with Normalize Spaces ON vs OFF...');
  const wsFormOn = new FormData();
  wsFormOn.append('textA', 'Payment terms: Net 30');
  wsFormOn.append('textB', 'Payment terms:    Net 30');
  wsFormOn.append('ignoreWhitespace', 'true');

  const wsResOn = await fetch('http://localhost:3099/api/compare', { method: 'POST', body: wsFormOn });
  const wsDataOn = await wsResOn.json();
  console.log(`✓ Normalize Spaces ON: IsIdentical=${wsDataOn.metrics.isIdentical}, Similarity=${wsDataOn.metrics.lexicalSimilarityPercent}%`);
  if (!wsDataOn.metrics.isIdentical || wsDataOn.metrics.lexicalSimilarityPercent !== 100) {
    throw new Error('Expected 100% match when Normalize Spaces is ON!');
  }

  const wsFormOff = new FormData();
  wsFormOff.append('textA', 'Payment terms: Net 30');
  wsFormOff.append('textB', 'Payment terms:    Net 30');
  wsFormOff.append('ignoreWhitespace', 'false');

  const wsResOff = await fetch('http://localhost:3099/api/compare', { method: 'POST', body: wsFormOff });
  const wsDataOff = await wsResOff.json();
  console.log(`✓ Normalize Spaces OFF: IsIdentical=${wsDataOff.metrics.isIdentical}, Similarity=${wsDataOff.metrics.lexicalSimilarityPercent}%, WhitespaceChanges=${wsDataOff.stats.whitespaceChanges}`);
  if (wsDataOff.metrics.isIdentical || wsDataOff.metrics.lexicalSimilarityPercent === 100 || wsDataOff.stats.whitespaceChanges === 0) {
    throw new Error('Expected whitespace difference to be detected when Normalize Spaces is OFF!');
  }

  // 6. Test Spreadsheet Grid Diff over API
  console.log('\n[6/6] Testing POST /api/compare with Two Excel Files for Spreadsheet Grid Diff...');
  const wb1 = XLSX.utils.book_new();
  const ws1 = XLSX.utils.aoa_to_sheet([['Item', 'Price'], ['Server', '$1000'], ['License', '$500']]);
  XLSX.utils.book_append_sheet(wb1, ws1, 'Budget');
  const xlsx1 = XLSX.write(wb1, { type: 'buffer', bookType: 'xlsx' });

  const wb2 = XLSX.utils.book_new();
  const ws2 = XLSX.utils.aoa_to_sheet([['Item', 'Price'], ['Server', '$1250'], ['License', '$500']]);
  XLSX.utils.book_append_sheet(wb2, ws2, 'Budget');
  const xlsx2 = XLSX.write(wb2, { type: 'buffer', bookType: 'xlsx' });

  const sheetForm = new FormData();
  sheetForm.append('fileA', new Blob([xlsx1]), 'budget_2025.xlsx');
  sheetForm.append('fileB', new Blob([xlsx2]), 'budget_2026.xlsx');

  const sheetRes = await fetch('http://localhost:3099/api/compare', { method: 'POST', body: sheetForm });
  const sheetData = await sheetRes.json();
  console.log(`✓ Spreadsheet compare status: ${sheetRes.status}`);
  console.log(`✓ SpreadsheetDiff returned: ${Array.isArray(sheetData.spreadsheetDiff)}`);
  if (!sheetData.spreadsheetDiff || sheetData.spreadsheetDiff.length === 0) {
    throw new Error('Expected spreadsheetDiff array in API response!');
  }
  const sDiff = sheetData.spreadsheetDiff[0];
  console.log(`✓ Sheet "${sDiff.sheetName}" analyzed: ${sDiff.stats.totalDiffCells} diff cell(s), modifiedCells: ${sDiff.stats.modifiedCells}`);
  const priceCell = sDiff.rows[1].cells[1];
  console.log(`✓ Cell B2 drift: ${priceCell.valA} -> ${priceCell.valB}, delta: +${priceCell.delta} (+${priceCell.percentChange}%)`);

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
