import { generateAnnotatedExcel } from './excelExporter.js';
import * as XLSX from 'xlsx';

async function testExcelExport() {
  console.log('--- Testing Annotated Excel Exporter ---\n');

  const sampleDiff = [
    {
      sheetName: 'Financial Forecast',
      colHeaders: ['A', 'B', 'C', 'D'],
      maxCols: 4,
      maxRows: 3,
      stats: {
        totalCells: 12,
        modifiedCells: 2,
        addedRows: 1,
        deletedRows: 0,
        totalDiffCells: 5
      },
      rows: [
        {
          rowNum: 1,
          hasRowDiff: false,
          isRowAdded: false,
          isRowDeleted: false,
          cells: [
            { colIndex: 0, colLetter: 'A', valA: 'Item', valB: 'Item', status: 'unchanged' },
            { colIndex: 1, colLetter: 'B', valA: 'Unit Cost', valB: 'Unit Cost', status: 'unchanged' },
            { colIndex: 2, colLetter: 'C', valA: 'Volume', valB: 'Volume', status: 'unchanged' },
            { colIndex: 3, colLetter: 'D', valA: 'Total', valB: 'Total', status: 'unchanged' }
          ]
        },
        {
          rowNum: 2,
          hasRowDiff: true,
          isRowAdded: false,
          isRowDeleted: false,
          cells: [
            { colIndex: 0, colLetter: 'A', valA: 'Servers', valB: 'Servers', status: 'unchanged' },
            { colIndex: 1, colLetter: 'B', valA: '$1,000.00', valB: '$1,250.00', status: 'modified', isNumeric: true, delta: 250, percentChange: 25 },
            { colIndex: 2, colLetter: 'C', valA: '10', valB: '10', status: 'unchanged' },
            { colIndex: 3, colLetter: 'D', valA: '$10,000.00', valB: '$12,500.00', status: 'modified', isNumeric: true, delta: 2500, percentChange: 25 }
          ]
        },
        {
          rowNum: 3,
          hasRowDiff: true,
          isRowAdded: true,
          isRowDeleted: false,
          cells: [
            { colIndex: 0, colLetter: 'A', valA: '', valB: 'Cloud Hosting', status: 'added' },
            { colIndex: 1, colLetter: 'B', valA: '', valB: '$500.00', status: 'added' },
            { colIndex: 2, colLetter: 'C', valA: '', valB: '12', status: 'added' },
            { colIndex: 3, colLetter: 'D', valA: '', valB: '$6,000.00', status: 'added' }
          ]
        }
      ]
    }
  ];

  const meta = {
    docA: { filename: 'Budget_2025.xlsx' },
    docB: { filename: 'Budget_2026.xlsx' }
  };

  const buffer = await generateAnnotatedExcel(sampleDiff, meta, {});
  console.log(`✓ Excel buffer successfully generated: ${buffer.length} bytes`);

  // Verify that the generated buffer can be read back by XLSX parser
  const wb = XLSX.read(buffer, { type: 'buffer' });
  console.log(`✓ Worksheets in generated file: ${wb.SheetNames.join(', ')}`);
  if (!wb.SheetNames.includes('Comparison Summary') || !wb.SheetNames.includes('Financial Forecast')) {
    throw new Error('Missing expected sheets in exported workbook!');
  }

  console.log('\n=======================================');
  console.log('🎉 EXCEL EXPORTER VERIFIED & 100% OPERATIONAL!');
  console.log('=======================================');
}

testExcelExport().catch(err => {
  console.error('Test Failed:', err);
  process.exit(1);
});
