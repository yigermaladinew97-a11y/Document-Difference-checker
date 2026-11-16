import React, { useState, useMemo } from 'react';
import {
  Table,
  Filter,
  Search,
  Download,
  Copy,
  Check,
  TrendingUp,
  TrendingDown,
  Layers,
  ArrowRight,
  Eye,
  Info
} from 'lucide-react';

/**
 * SpreadsheetGridDiff:
 * High-density, cell-by-cell interactive spreadsheet grid diff for .xlsx, .xls, and .csv files.
 * Highlights individual modified cells with numerical drift calculation (+/- delta, % shift),
 * added rows, and removed rows.
 */
export default function SpreadsheetGridDiff({
  spreadsheetDiff = [],
  meta = {},
  currentUser = null,
  onRequestAuth = null
}) {
  if (!spreadsheetDiff || spreadsheetDiff.length === 0) return null;

  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const [filterChangesOnly, setFilterChangesOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [isExportingExcel, setIsExportingExcel] = useState(false);

  const activeSheet = spreadsheetDiff[activeSheetIndex] || spreadsheetDiff[0];
  const stats = activeSheet.stats || {};

  // Filter rows based on "Changes Only" and "Search Query"
  const displayedRows = useMemo(() => {
    let rows = activeSheet.rows || [];

    if (filterChangesOnly) {
      rows = rows.filter(r => r.hasRowDiff);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      rows = rows.filter(r => {
        return r.cells.some(c =>
          c.valA.toLowerCase().includes(q) || c.valB.toLowerCase().includes(q)
        );
      });
    }

    return rows;
  }, [activeSheet, filterChangesOnly, searchQuery]);

  const handleCopySheetCsv = () => {
    const csvLines = (activeSheet.rows || []).map(r => {
      return r.cells.map(c => {
        if (c.status === 'modified') return `"${c.valA} -> ${c.valB}"`;
        if (c.status === 'added') return `"+${c.valB}"`;
        if (c.status === 'deleted') return `"-${c.valA}"`;
        return `"${c.valB || c.valA}"`;
      }).join(',');
    });
    navigator.clipboard.writeText(csvLines.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadExcel = async () => {
    if (!currentUser && onRequestAuth) {
      onRequestAuth('signup', 'Create a free account or sign in to export color-coded Excel (.xlsx) workbooks with delta cell notes.');
      return;
    }
    try {
      setIsExportingExcel(true);
      const res = await fetch('/api/export/excel-diff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ spreadsheetDiff, meta, stats: activeSheet.stats || {} })
      });

      if (!res.ok) throw new Error('Failed to generate annotated Excel workbook.');

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const baseName = (meta?.docB?.filename || meta?.docA?.filename || 'Spreadsheet').replace(/\.[^/.]+$/, '');
      a.href = url;
      a.download = `Diff_${baseName}_${Date.now()}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export Excel:', err);
      alert('Could not export Excel workbook. Please try again.');
    } finally {
      setIsExportingExcel(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Controls & Metrics Bar */}
      <div className="p-5 bg-slate-50/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/[0.08] rounded-3xl space-y-4 shadow-sm">
        
        {/* Header & Sheet Tabs */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
              <Table className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white tracking-tight">
                  Spreadsheet Cell-by-Cell Grid
                </h4>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  {stats.totalDiffCells || 0} Differences
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                Cell coordinates, financial drift, and row insertion/deletion mapping
              </p>
            </div>
          </div>

          {/* Multiple Sheets Switcher Tabs */}
          {spreadsheetDiff.length > 1 && (
            <div className="flex bg-white dark:bg-slate-950 p-1 rounded-full border border-slate-200/80 dark:border-white/[0.08] text-xs shadow-xs self-start md:self-auto overflow-x-auto max-w-full">
              {spreadsheetDiff.map((sheet, sIdx) => (
                <button
                  key={sIdx}
                  type="button"
                  onClick={() => setActiveSheetIndex(sIdx)}
                  className={`px-3 py-1 rounded-full font-bold transition-all shrink-0 ${
                    activeSheetIndex === sIdx
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span>{sheet.sheetName}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Quick Stats Metrics Chips */}
        <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-200/60 dark:border-white/[0.06] gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2 font-semibold">
            <span className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300">
              Total Cells: <strong className="font-mono text-slate-900 dark:text-white">{stats.totalCells || 0}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400">
              Modified: <strong className="font-mono">{stats.modifiedCells || 0}</strong>
            </span>
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400">
              Added: <strong className="font-mono">{stats.addedCells || 0} cells ({stats.addedRows || 0} rows)</strong>
            </span>
            <span className="px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400">
              Deleted: <strong className="font-mono">{stats.deletedCells || 0} cells ({stats.deletedRows || 0} rows)</strong>
            </span>
          </div>

          {/* Filter & Search Toolbar */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => setFilterChangesOnly(!filterChangesOnly)}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-full text-xs font-bold border transition ${
                filterChangesOnly
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border-amber-300'
                  : 'bg-white dark:bg-slate-950 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-white/[0.08] hover:text-slate-900'
              }`}
            >
              <Filter className="w-3 h-3" />
              <span>{filterChangesOnly ? 'Changed Rows Only' : 'Show All Rows'}</span>
            </button>

            <div className="relative">
              <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search cells..."
                className="pl-7 pr-3 py-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/[0.08] rounded-full text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none w-32 sm:w-40 font-mono"
              />
            </div>

            <button
              type="button"
              onClick={handleCopySheetCsv}
              className="flex items-center space-x-1 px-3 py-1 rounded-full bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-white/[0.08] text-xs font-bold hover:bg-slate-100 transition"
              title="Copy sheet diff as CSV"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-slate-400" />}
              <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy CSV'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadExcel}
              disabled={isExportingExcel}
              className="flex items-center space-x-1.5 px-3.5 py-1 rounded-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white border border-emerald-700 text-xs font-bold shadow-sm transition disabled:opacity-50"
              title="Download color-coded Microsoft Excel (.xlsx) file with cell notes & summary sheet"
            >
              <Download className="w-3 h-3" />
              <span>{isExportingExcel ? 'Exporting...' : 'Export Excel (.xlsx)'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Spreadsheet Grid Display */}
      <div className="rounded-3xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-[#111726] shadow-card overflow-hidden">
        
        {/* Scrollable Grid Container */}
        <div className="overflow-x-auto max-h-[650px] overflow-y-auto select-text font-mono text-xs">
          <table className="w-full border-collapse text-left">
            {/* Column Headers (A, B, C, D...) */}
            <thead className="sticky top-0 z-20 bg-slate-100 dark:bg-slate-900 border-b border-slate-200 dark:border-white/[0.08]">
              <tr>
                {/* Row Number Header Cell */}
                <th className="sticky left-0 z-30 w-12 px-3 py-2 text-center text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-900 border-r border-slate-200 dark:border-white/[0.08] select-none">
                  #
                </th>
                {activeSheet.colHeaders.map((colLetter, cIdx) => (
                  <th
                    key={cIdx}
                    className="px-3.5 py-2 min-w-[140px] text-xs font-bold text-slate-600 dark:text-slate-300 border-r border-slate-200/60 dark:border-white/[0.06] select-none"
                  >
                    {colLetter}
                  </th>
                ))}
              </tr>
            </thead>

            {/* Table Rows Body */}
            <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
              {displayedRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={activeSheet.colHeaders.length + 1}
                    className="py-12 text-center text-xs text-slate-400 font-sans"
                  >
                    No rows match your current filter or search criteria.
                  </td>
                </tr>
              ) : (
                displayedRows.map((row) => {
                  const isAddedRow = row.isRowAdded;
                  const isDeletedRow = row.isRowDeleted;

                  return (
                    <tr
                      key={row.rowNum}
                      className={`transition-colors ${
                        isAddedRow
                          ? 'bg-emerald-50/40 dark:bg-emerald-950/20'
                          : isDeletedRow
                          ? 'bg-rose-50/40 dark:bg-rose-950/20'
                          : row.hasRowDiff
                          ? 'hover:bg-slate-50/80 dark:hover:bg-slate-900/40'
                          : 'hover:bg-slate-50/50 dark:hover:bg-slate-900/20'
                      }`}
                    >
                      {/* Sticky Row Index Cell on Left */}
                      <td
                        className={`sticky left-0 z-10 px-2.5 py-2 text-center text-[10px] font-bold border-r border-slate-200 dark:border-white/[0.08] select-none ${
                          isAddedRow
                            ? 'bg-emerald-100/80 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400'
                            : isDeletedRow
                            ? 'bg-rose-100/80 dark:bg-rose-950 text-rose-700 dark:text-rose-400'
                            : row.hasRowDiff
                            ? 'bg-amber-100/70 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400'
                            : 'bg-slate-50 dark:bg-slate-900 text-slate-400'
                        }`}
                      >
                        {row.rowNum}
                      </td>

                      {/* Cells in Row */}
                      {row.cells.map((cell, cIdx) => {
                        const isMod = cell.status === 'modified';
                        const isAdd = cell.status === 'added';
                        const isDel = cell.status === 'deleted';

                        return (
                          <td
                            key={cIdx}
                            className={`px-3 py-2 border-r border-slate-100 dark:border-white/[0.04] align-top text-xs transition-colors ${
                              isMod
                                ? 'bg-amber-50/50 dark:bg-amber-950/30'
                                : isAdd
                                ? 'bg-emerald-50/60 dark:bg-emerald-950/30'
                                : isDel
                                ? 'bg-rose-50/60 dark:bg-rose-950/30'
                                : ''
                            }`}
                          >
                            {isMod ? (
                              <div className="space-y-1">
                                <div className="text-rose-600 dark:text-rose-400 line-through decoration-rose-400 opacity-75 text-[11px] truncate">
                                  {cell.valA || <span className="italic opacity-50">[empty]</span>}
                                </div>
                                <div className="text-emerald-700 dark:text-emerald-300 font-bold truncate">
                                  {cell.valB || <span className="italic opacity-50">[empty]</span>}
                                </div>

                                {/* Numerical Delta Shift Badge */}
                                {cell.isNumeric && cell.delta !== null && (
                                  <div className="pt-0.5">
                                    <span
                                      className={`inline-flex items-center space-x-0.5 px-1.5 py-0.2 rounded text-[9px] font-sans font-bold ${
                                        cell.delta > 0
                                          ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                          : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                                      }`}
                                    >
                                      {cell.delta > 0 ? (
                                        <TrendingUp className="w-2.5 h-2.5" />
                                      ) : (
                                        <TrendingDown className="w-2.5 h-2.5" />
                                      )}
                                      <span>
                                        {cell.delta > 0 ? `+${cell.delta}` : cell.delta}
                                        {cell.percentChange !== null ? ` (${cell.percentChange > 0 ? `+${cell.percentChange}` : cell.percentChange}%)` : ''}
                                      </span>
                                    </span>
                                  </div>
                                )}
                              </div>
                            ) : isAdd ? (
                              <div className="text-emerald-700 dark:text-emerald-300 font-bold">
                                +{cell.valB}
                              </div>
                            ) : isDel ? (
                              <div className="text-rose-600 dark:text-rose-400 line-through decoration-rose-500 opacity-75">
                                -{cell.valA}
                              </div>
                            ) : (
                              <div className="text-slate-700 dark:text-slate-300 truncate">
                                {cell.valB || cell.valA || ''}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
