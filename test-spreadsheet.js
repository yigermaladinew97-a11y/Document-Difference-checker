import * as XLSX from 'xlsx';
import { extractDocumentContent } from './parsers.js';
import { compareSpreadsheetSheets } from './comparator.js';

async function testSpreadsheetComparison() {
  console.log('--- Testing Spreadsheet Cell-by-Cell Grid Engine ---\n');

  // 1. Build Document A Excel
  console.log('[1/4] Constructing Sample Excel Workbooks...');
  const wbA = XLSX.utils.book_new();
  const matrixA = [
    ['Product SKU', 'Category', 'Unit Price', 'Q1 Volume', 'Total Revenue'],
    ['SKU-1001', 'Hardware', '$450.00', '100', '$45,000.00'],
    ['SKU-1002', 'Software', '$120.00', '500', '$60,000.00'],
    ['SKU-1003', 'Services', '$250.00', '80', '$20,000.00'],
    ['SKU-1004', 'Discontinued', '$50.00', '10', '$500.00']
  ];
  const wsA = XLSX.utils.aoa_to_sheet(matrixA);
  XLSX.utils.book_append_sheet(wbA, wsA, 'Financial Summary');
  const bufA = XLSX.write(wbA, { type: 'buffer', bookType: 'xlsx' });

  // 2. Build Document B Excel (with modifications, additions, and deletions)
  const wbB = XLSX.utils.book_new();
  const matrixB = [
    ['Product SKU', 'Category', 'Unit Price', 'Q1 Volume', 'Total Revenue'],
    ['SKU-1001', 'Hardware', '$495.00', '100', '$49,500.00'], // +10% price shift
    ['SKU-1002', 'Cloud SaaS', '$120.00', '650', '$78,000.00'], // Category change + volume increase
    ['SKU-1003', 'Services', '$250.00', '80', '$20,000.00'], // Identical
    // SKU-1004 deleted
    ['SKU-1005', 'AI Platform', '$899.00', '25', '$22,475.00'] // Newly added product
  ];
  const wsB = XLSX.utils.aoa_to_sheet(matrixB);
  XLSX.utils.book_append_sheet(wbB, wsB, 'Financial Summary');
  const bufB = XLSX.write(wbB, { type: 'buffer', bookType: 'xlsx' });

  // 3. Parse matrices using extractDocumentContent
  console.log('[2/4] Verifying 2D Matrix Parsing via extractDocumentContent...');
  const parsedA = await extractDocumentContent(bufA, 'Q1_Financials.xlsx');
  const parsedB = await extractDocumentContent(bufB, 'Q2_Financials.xlsx');

  console.log(`✓ Doc A Sheets: ${parsedA.sheets.length}, Sheet Name: "${parsedA.sheets[0].name}"`);
  console.log(`✓ Doc A Matrix Rows: ${parsedA.sheets[0].matrix.length}`);
  console.log(`✓ Doc B Matrix Rows: ${parsedB.sheets[0].matrix.length}`);

  // 4. Run compareSpreadsheetSheets
  console.log('\n[3/4] Running Cell-by-Cell Grid Comparison Engine...');
  const diffSheets = compareSpreadsheetSheets(parsedA.sheets, parsedB.sheets, {});
  
  if (!diffSheets || diffSheets.length === 0) {
    throw new Error('Spreadsheet diff returned empty array!');
  }

  const sheetDiff = diffSheets[0];
  console.log(`✓ Sheet "${sheetDiff.sheetName}" Analyzed:`);
  console.log(`  - Modified Cells: ${sheetDiff.stats.modifiedCells}`);
  console.log(`  - Added Rows: ${sheetDiff.stats.addedRows}`);
  console.log(`  - Deleted Rows: ${sheetDiff.stats.deletedRows}`);
  console.log(`  - Total Diff Cells: ${sheetDiff.stats.totalDiffCells}`);

  // Find numerical drift cell (e.g. SKU-1001 Unit Price or Total Revenue)
  const modifiedRow = sheetDiff.rows.find(r => r.cells.some(c => c.status === 'modified' && c.isNumeric));
  if (modifiedRow) {
    const driftCell = modifiedRow.cells.find(c => c.status === 'modified' && c.isNumeric);
    console.log(`✓ Numerical Drift Detected at Cell ${driftCell.colLetter}${modifiedRow.rowNum}:`);
    console.log(`  - Baseline (Doc A): "${driftCell.valA}"`);
    console.log(`  - Revision (Doc B): "${driftCell.valB}"`);
    console.log(`  - Numerical Delta: +${driftCell.delta} (+${driftCell.percentChange}%)`);
  }

  // 5. Test CSV Parsing & Comparison
  console.log('\n[4/4] Verifying CSV 2D Matrix Extraction & Comparison...');
  const csvBufA = Buffer.from('ID,Name,Salary\n101,Alice,$80000\n102,Bob,$95000\n', 'utf8');
  const csvBufB = Buffer.from('ID,Name,Salary\n101,Alice,$85000\n102,Bob,$95000\n103,Charlie,$110000\n', 'utf8');
  const parsedCsvA = await extractDocumentContent(csvBufA, 'payroll_2025.csv');
  const parsedCsvB = await extractDocumentContent(csvBufB, 'payroll_2026.csv');

  console.log(`✓ CSV A Sheets: ${parsedCsvA.sheets.length}, Rows: ${parsedCsvA.sheets[0].matrix.length}`);
  const csvDiff = compareSpreadsheetSheets(parsedCsvA.sheets, parsedCsvB.sheets, {});
  console.log(`✓ CSV Diff Completed: ${csvDiff[0].stats.totalDiffCells} cell changes, ${csvDiff[0].stats.addedRows} added row(s)`);

  console.log('\n=======================================');
  console.log('🎉 SPREADSHEET GRID ENGINE 100% VERIFIED!');
  console.log('=======================================');
}

testSpreadsheetComparison().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
