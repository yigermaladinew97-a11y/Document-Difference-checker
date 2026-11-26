import ExcelJS from 'exceljs';

/**
 * Generates a professionally styled, color-coded Microsoft Excel (.xlsx) workbook
 * highlighting every modified, added, and deleted cell with hover comments and delta calculations.
 *
 * @param {Array} spreadsheetDiff - Array of sheet diff objects from comparator.js
 * @param {Object} meta - Comparison metadata (docA, docB, filenames, timestamps)
 * @param {Object} stats - Aggregate comparison stats
 * @returns {Promise<Buffer>} - Buffer of the .xlsx file
 */
export async function generateAnnotatedExcel(spreadsheetDiff = [], meta = {}, stats = {}) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Ydiff Studio';
  workbook.lastModifiedBy = 'Ydiff Studio';
  workbook.created = new Date();
  workbook.modified = new Date();

  // 1. Audit Summary Cover Sheet
  const summarySheet = workbook.addWorksheet('Comparison Summary', {
    views: [{ showGridLines: true }]
  });

  // Title Row
  summarySheet.mergeCells('B2:F2');
  const titleCell = summarySheet.getCell('B2');
  titleCell.value = 'EXCEL SPREADSHEET DIFFERENCE AUDIT';
  titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  summarySheet.getRow(2).height = 36;

  // Metadata Card
  const nowStr = new Date().toLocaleString();
  const docAName = meta?.docA?.filename || 'Document A';
  const docBName = meta?.docB?.filename || 'Document B';

  const metaRows = [
    ['Baseline Document (Doc A):', docAName],
    ['Revised Document (Doc B):', docBName],
    ['Audit Timestamp:', nowStr],
    ['Sheets Compared:', String(spreadsheetDiff.length)]
  ];

  let curRow = 4;
  for (const [label, val] of metaRows) {
    summarySheet.getCell(`B${curRow}`).value = label;
    summarySheet.getCell(`B${curRow}`).font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF475569' } };
    summarySheet.getCell(`C${curRow}`).value = val;
    summarySheet.getCell(`C${curRow}`).font = { name: 'Calibri', size: 11, color: { argb: 'FF0F172A' } };
    curRow++;
  }

  curRow += 1;

  // Legend Box
  summarySheet.getCell(`B${curRow}`).value = 'COLOR LEGEND & KEY';
  summarySheet.getCell(`B${curRow}`).font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF1E293B' } };
  curRow++;

  const legendItems = [
    { label: 'Modified Cell', desc: 'Value changed between versions. Hover over cell to view baseline & % delta note.', fill: 'FFFEF3C7', text: 'FF92400E' },
    { label: 'Added Row / Value', desc: 'Newly inserted row or value in Document B.', fill: 'FFE6F4EA', text: 'FF0D8050' },
    { label: 'Deleted Row / Value', desc: 'Removed row or value from Document A (shown with strikethrough).', fill: 'FFFCE8E6', text: 'FFC00000' }
  ];

  for (const item of legendItems) {
    const badgeCell = summarySheet.getCell(`B${curRow}`);
    badgeCell.value = item.label;
    badgeCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: item.text } };
    badgeCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: item.fill } };
    badgeCell.alignment = { horizontal: 'center', vertical: 'middle' };
    badgeCell.border = {
      top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
      right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
    };

    summarySheet.mergeCells(`C${curRow}:F${curRow}`);
    const descCell = summarySheet.getCell(`C${curRow}`);
    descCell.value = item.desc;
    descCell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: 'FF64748B' } };
    descCell.alignment = { vertical: 'middle' };
    summarySheet.getRow(curRow).height = 24;
    curRow++;
  }

  curRow += 2;

  // Sheet-by-Sheet Statistics Table
  summarySheet.getCell(`B${curRow}`).value = 'SHEET-BY-SHEET AUDIT BREAKDOWN';
  summarySheet.getCell(`B${curRow}`).font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF1E293B' } };
  curRow++;

  const statHeaders = ['Sheet Name', 'Modified Cells', 'Added Rows', 'Deleted Rows', 'Total Diffs'];
  statHeaders.forEach((h, idx) => {
    const colLetter = String.fromCharCode(66 + idx); // B, C, D, E, F
    const cell = summarySheet.getCell(`${colLetter}${curRow}`);
    cell.value = h;
    cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });
  summarySheet.getRow(curRow).height = 22;
  curRow++;

  for (const s of spreadsheetDiff) {
    const st = s.stats || {};
    summarySheet.getCell(`B${curRow}`).value = s.sheetName;
    summarySheet.getCell(`B${curRow}`).font = { name: 'Calibri', size: 10, bold: true };

    summarySheet.getCell(`C${curRow}`).value = st.modifiedCells || 0;
    summarySheet.getCell(`C${curRow}`).alignment = { horizontal: 'center' };

    summarySheet.getCell(`D${curRow}`).value = st.addedRows || 0;
    summarySheet.getCell(`D${curRow}`).alignment = { horizontal: 'center' };

    summarySheet.getCell(`E${curRow}`).value = st.deletedRows || 0;
    summarySheet.getCell(`E${curRow}`).alignment = { horizontal: 'center' };

    summarySheet.getCell(`F${curRow}`).value = st.totalDiffCells || 0;
    summarySheet.getCell(`F${curRow}`).alignment = { horizontal: 'center' };
    summarySheet.getCell(`F${curRow}`).font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFD97706' } };

    ['B', 'C', 'D', 'E', 'F'].forEach(c => {
      summarySheet.getCell(`${c}${curRow}`).border = {
        top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };
    });

    curRow++;
  }

  summarySheet.getColumn('A').width = 4;
  summarySheet.getColumn('B').width = 28;
  summarySheet.getColumn('C').width = 18;
  summarySheet.getColumn('D').width = 16;
  summarySheet.getColumn('E').width = 16;
  summarySheet.getColumn('F').width = 16;

  // 2. Diffed Worksheets
  for (const s of spreadsheetDiff) {
    const safeSheetName = (s.sheetName || 'Diff').substring(0, 31).replace(/[\\/*?:[\]]/g, '_');
    const ws = workbook.addWorksheet(safeSheetName, {
      views: [{ state: 'frozen', xSplit: 1, ySplit: 1, showGridLines: true }]
    });

    const colHeaders = s.colHeaders || [];
    const maxCols = s.maxCols || (colHeaders.length > 0 ? colHeaders.length : 1);
    const colWidths = new Array(maxCols + 1).fill(12);

    // Row 1: Header Row
    const headerRow = ws.getRow(1);
    headerRow.height = 24;

    // Corner cell (Row # indicator)
    const cornerCell = headerRow.getCell(1);
    cornerCell.value = '#';
    cornerCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
    cornerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
    cornerCell.alignment = { horizontal: 'center', vertical: 'middle' };

    for (let c = 0; c < maxCols; c++) {
      const headerCell = headerRow.getCell(c + 2);
      const colLetter = colHeaders[c] || String.fromCharCode(65 + c);
      headerCell.value = colLetter;
      headerCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
      headerCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E293B' } };
      headerCell.alignment = { horizontal: 'center', vertical: 'middle' };
      headerCell.border = {
        right: { style: 'thin', color: { argb: 'FF334155' } },
        bottom: { style: 'medium', color: { argb: 'FF0F172A' } }
      };
    }

    // Rows
    const rows = s.rows || [];
    rows.forEach((row, rIdx) => {
      const excelRow = ws.getRow(rIdx + 2);
      excelRow.height = 20;

      const isAddedRow = row.isRowAdded;
      const isDeletedRow = row.isRowDeleted;

      // Column A: Row Number
      const rowNumCell = excelRow.getCell(1);
      rowNumCell.value = row.rowNum;
      rowNumCell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: 'FF64748B' } };
      rowNumCell.alignment = { horizontal: 'center', vertical: 'middle' };
      rowNumCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: {
          argb: isAddedRow ? 'FFE6F4EA' : isDeletedRow ? 'FFFCE8E6' : row.hasRowDiff ? 'FFFEF3C7' : 'FFF8FAFC'
        }
      };
      rowNumCell.border = {
        right: { style: 'thin', color: { argb: 'FFE2E8F0' } },
        bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } }
      };

      // Cells
      (row.cells || []).forEach((cell, cIdx) => {
        const excelCell = excelRow.getCell(cIdx + 2);
        const isMod = cell.status === 'modified';
        const isAdd = cell.status === 'added' || isAddedRow;
        const isDel = cell.status === 'deleted' || isDeletedRow;

        let displayVal = cell.valB || cell.valA || '';
        if (isDel && !isMod) displayVal = cell.valA;

        // Try to cast to number if pure numerical
        const numVal = Number(displayVal.replace(/[^0-9.-]/g, ''));
        if (displayVal !== '' && !isNaN(numVal) && !displayVal.includes('$') && !displayVal.includes('%')) {
          excelCell.value = numVal;
        } else {
          excelCell.value = displayVal;
        }

        // Measure width for auto-fit
        const len = String(displayVal).length;
        if (len > colWidths[cIdx + 1]) {
          colWidths[cIdx + 1] = Math.min(Math.max(len + 4, 12), 40);
        }

        // Apply cell colors & borders
        if (isMod) {
          // Yellow fill for modified
          excelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
          excelCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF92400E' } };

          // Add cell note / comment with original value & delta
          let noteText = `Original (Doc A): ${cell.valA || '[empty]'}\nRevised (Doc B): ${cell.valB || '[empty]'}`;
          if (cell.isNumeric && cell.delta !== null) {
            const deltaSign = cell.delta > 0 ? `+${cell.delta}` : cell.delta;
            const pctSign = cell.percentChange !== null ? ` (${cell.percentChange > 0 ? `+${cell.percentChange}` : cell.percentChange}%)` : '';
            noteText += `\nShift: ${deltaSign}${pctSign}`;
          }
          excelCell.note = noteText;
        } else if (isAdd) {
          // Green fill for added
          excelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F4EA' } };
          excelCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF0D8050' } };
        } else if (isDel) {
          // Red fill with strikethrough for deleted
          excelCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCE8E6' } };
          excelCell.font = { name: 'Calibri', size: 10, strike: true, color: { argb: 'FFC00000' } };
        } else {
          excelCell.font = { name: 'Calibri', size: 10, color: { argb: 'FF1E293B' } };
        }

        excelCell.border = {
          top: { style: 'thin', color: { argb: 'FFF1F5F9' } },
          bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
          left: { style: 'thin', color: { argb: 'FFF1F5F9' } },
          right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
        };
      });
    });

    // Set column widths
    ws.getColumn(1).width = 6;
    for (let c = 1; c <= maxCols; c++) {
      ws.getColumn(c + 1).width = colWidths[c] || 15;
    }
  }

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}
