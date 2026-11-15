import React, { useState, useRef } from 'react';
import { 
  Columns, 
  AlignLeft, 
  Filter, 
  Search, 
  Copy, 
  Check, 
  Download, 
  WrapText, 
  FileText,
  SlidersHorizontal
} from 'lucide-react';
import NoiseFiltersBar from './NoiseFiltersBar';

export default function DiffViewer({ 
  diffTokens, 
  meta, 
  stats, 
  filters, 
  onFilterChange, 
  onApplyFilters, 
  isComparing = false,
  onExportPdf 
}) {
  const [viewMode, setViewMode] = useState('sideBySide');
  const [filterChangesOnly, setFilterChangesOnly] = useState(false);
  const [wrapText, setWrapText] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [showFilterTray, setShowFilterTray] = useState(false);

  const activeFilterCount = filters ? Object.values(filters).filter(Boolean).length : 0;

  const leftPaneRef = useRef(null);
  const rightPaneRef = useRef(null);
  const isSyncingRef = useRef(false);

  // Synchronized Scrolling between Left and Right Panes
  const handleScroll = (source) => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;

    if (source === 'left' && leftPaneRef.current && rightPaneRef.current) {
      rightPaneRef.current.scrollTop = leftPaneRef.current.scrollTop;
    } else if (source === 'right' && rightPaneRef.current && leftPaneRef.current) {
      leftPaneRef.current.scrollTop = rightPaneRef.current.scrollTop;
    }

    setTimeout(() => {
      isSyncingRef.current = false;
    }, 35);
  };

  if (!diffTokens || diffTokens.length === 0) return null;

  const filteredTokens = diffTokens.filter(token => {
    if (filterChangesOnly && token.type === 'unchanged') return false;
    if (searchQuery.trim()) {
      return token.value.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const tokensDocA = diffTokens.filter(t => t.type === 'unchanged' || t.type === 'removed');
  const tokensDocB = diffTokens.filter(t => t.type === 'unchanged' || t.type === 'added');

  const handleCopy = () => {
    const textDiff = diffTokens.map(t => {
      if (t.type === 'added') return `[+ ${t.value.trim()} +]`;
      if (t.type === 'removed') return `[- ${t.value.trim()} -]`;
      return t.value;
    }).join(' ');
    navigator.clipboard.writeText(textDiff);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportReport = () => {
    const reportData = {
      timestamp: new Date().toISOString(),
      meta,
      stats,
      diffSummary: diffTokens.filter(t => t.type !== 'unchanged').map(t => ({
        type: t.type,
        text: t.value.trim()
      }))
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DocDiff_Report_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-[32px] bg-white dark:bg-[#111726] border border-slate-200/80 dark:border-white/[0.08] shadow-card hover:shadow-clean-hover transition-shadow duration-300 overflow-hidden">
      {/* Top Toolbar */}
      <div className="p-5 bg-slate-50/70 dark:bg-slate-900/60 border-b border-slate-100 dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
        {/* Left: View Mode Controls */}
        <div className="flex items-center space-x-2">
          <div className="flex bg-white dark:bg-slate-950 p-1 rounded-full border border-slate-200/80 dark:border-white/[0.08] text-xs shadow-sm">
            <button
              type="button"
              onClick={() => setViewMode('sideBySide')}
              className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-full font-bold transition-all duration-200 ${
                viewMode === 'sideBySide' 
                  ? 'bg-[#FF5E1E] text-white shadow-sm scale-100' 
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Side-by-Side</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('unified')}
              className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-full font-bold transition-all duration-200 ${
                viewMode === 'unified' 
                  ? 'bg-[#FF5E1E] text-white shadow-sm scale-100' 
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <AlignLeft className="w-3.5 h-3.5" />
              <span>Unified Redline</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setFilterChangesOnly(!filterChangesOnly)}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all duration-200 ${
              filterChangesOnly
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300 shadow-sm scale-105'
                : 'bg-white dark:bg-slate-950 border-slate-200/80 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 hover:text-slate-900 shadow-sm hover:scale-105'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Changes Only</span>
          </button>

          <button
            type="button"
            onClick={() => setWrapText(!wrapText)}
            className={`hidden sm:flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition ${
              wrapText
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-white border-transparent'
                : 'bg-white dark:bg-slate-950 border-slate-200/80 dark:border-white/[0.08] text-slate-500 hover:text-slate-900'
            }`}
            title="Toggle word wrap"
          >
            <WrapText className="w-3.5 h-3.5" />
            <span>Wrap</span>
          </button>

          {filters && onFilterChange && (
            <button
              type="button"
              onClick={() => setShowFilterTray(!showFilterTray)}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all duration-200 ${
                showFilterTray
                  ? 'bg-[#FF5E1E] text-white border-transparent shadow-xs scale-105'
                  : activeFilterCount > 0
                    ? 'bg-[#FF5E1E]/10 text-[#FF5E1E] border-[#FF5E1E]/30 shadow-xs'
                    : 'bg-white dark:bg-slate-950 border-slate-200/80 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 hover:text-slate-900 shadow-xs'
              }`}
              title="Toggle Smart Noise Filters"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters ({activeFilterCount})</span>
            </button>
          )}
        </div>

        {/* Right: Search, Export & Copy */}
        <div className="flex items-center space-x-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in diff..."
              className="pl-9 pr-3.5 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/[0.08] rounded-full text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF5E1E]/30 w-36 sm:w-48 shadow-sm font-mono"
            />
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 border border-slate-200 dark:border-white/[0.08] text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm hover:scale-105 active:scale-95 transition"
            title="Copy diff to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            <span className="hidden sm:inline">{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportReport}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 border border-slate-200 dark:border-white/[0.08] text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm hover:scale-105 active:scale-95 transition"
            title="Export JSON report"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Export</span>
          </button>

          {onExportPdf && (
            <button
              type="button"
              onClick={onExportPdf}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-[#FF5E1E]/10 hover:bg-[#FF5E1E]/20 text-[#FF5E1E] border border-[#FF5E1E]/30 text-xs font-bold shadow-sm hover:scale-105 active:scale-95 transition"
              title="Export Executive PDF Audit Report"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>PDF Report</span>
            </button>
          )}
        </div>
      </div>

      {/* Expandable Smart Noise Filters Tray */}
      {showFilterTray && filters && onFilterChange && (
        <div className="p-4 bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-white/[0.08] animate-in fade-in duration-200">
          <NoiseFiltersBar
            filters={filters}
            onFilterChange={onFilterChange}
            onApply={onApplyFilters}
            isComparing={isComparing}
            showApplyButton={true}
            compact={true}
          />
        </div>
      )}

      {/* Legend & Status */}
      <div className="px-6 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-white/[0.04] flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
        <div className="flex items-center space-x-6">
          <span className="flex items-center space-x-2">
            <span className="w-3.5 h-2 rounded bg-rose-100 dark:bg-rose-950/60 border-b-2 border-rose-500 inline-block" />
            <span>Deleted text (Doc A)</span>
          </span>
          <span className="flex items-center space-x-2">
            <span className="w-3.5 h-2 rounded bg-emerald-100 dark:bg-emerald-950/60 border-b-2 border-emerald-500 inline-block" />
            <span>Added text (Doc B)</span>
          </span>
        </div>
        <div className="hidden sm:flex items-center space-x-1.5 text-slate-400 font-mono text-[11px]">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Synchronized scroll active</span>
        </div>
      </div>

      {/* Content Panes */}
      {viewMode === 'sideBySide' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-100 dark:divide-white/[0.08]">
          {/* Doc A */}
          <div className="flex flex-col bg-slate-50/30 dark:bg-transparent">
            <div className="px-6 py-3.5 bg-slate-100/70 dark:bg-slate-900/80 border-b border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-800 dark:text-slate-200 truncate flex items-center space-x-2">
                <FileText className="w-4 h-4 text-[#FF5E1E] shrink-0" />
                <span className="truncate">{meta?.docA?.filename}</span>
              </span>
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold border border-rose-200 dark:border-rose-900">
                -{stats?.deletedWords || 0} words
              </span>
            </div>
            <div
              ref={leftPaneRef}
              onScroll={() => handleScroll('left')}
              className={`p-6 sm:p-8 max-h-[600px] overflow-y-auto leading-relaxed text-xs sm:text-sm font-mono select-text text-slate-800 dark:text-slate-300 ${
                wrapText ? 'whitespace-pre-wrap' : 'whitespace-pre overflow-x-auto'
              }`}
            >
              {tokensDocA.map((token, idx) => {
                if (token.type === 'removed') {
                  return (
                    <mark
                      key={idx}
                      className="diff-token bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 px-1.5 py-0.5 rounded-md border-b-2 border-rose-500 font-bold line-through decoration-rose-500/60 mr-1"
                      title="Deleted word"
                    >
                      {token.value}
                    </mark>
                  );
                }
                return <span key={idx}>{token.value}</span>;
              })}
            </div>
          </div>

          {/* Doc B */}
          <div className="flex flex-col bg-slate-50/30 dark:bg-transparent">
            <div className="px-6 py-3.5 bg-slate-100/70 dark:bg-slate-900/80 border-b border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-800 dark:text-slate-200 truncate flex items-center space-x-2">
                <FileText className="w-4 h-4 text-emerald-500 shrink-0" />
                <span className="truncate">{meta?.docB?.filename}</span>
              </span>
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-200 dark:border-emerald-900">
                +{stats?.addedWords || 0} words
              </span>
            </div>
            <div
              ref={rightPaneRef}
              onScroll={() => handleScroll('right')}
              className={`p-6 sm:p-8 max-h-[600px] overflow-y-auto leading-relaxed text-xs sm:text-sm font-mono select-text text-slate-800 dark:text-slate-300 ${
                wrapText ? 'whitespace-pre-wrap' : 'whitespace-pre overflow-x-auto'
              }`}
            >
              {tokensDocB.map((token, idx) => {
                if (token.type === 'added') {
                  return (
                    <mark
                      key={idx}
                      className="diff-token bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded-md border-b-2 border-emerald-500 font-bold mr-1"
                      title="Added word"
                    >
                      {token.value}
                    </mark>
                  );
                }
                return <span key={idx}>{token.value}</span>;
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Unified View */
        <div className="p-8 max-h-[650px] overflow-y-auto leading-relaxed text-xs sm:text-sm font-mono whitespace-pre-wrap select-text text-slate-800 dark:text-slate-300 bg-white dark:bg-slate-900/40">
          {filteredTokens.map((token, idx) => {
            if (token.type === 'added') {
              return (
                <mark
                  key={idx}
                  className="diff-token bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded-md border-b-2 border-emerald-500 font-bold mr-1"
                >
                  +{token.value}
                </mark>
              );
            }
            if (token.type === 'removed') {
              return (
                <mark
                  key={idx}
                  className="diff-token bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 px-1.5 py-0.5 rounded-md border-b-2 border-rose-500 font-bold line-through decoration-rose-500/60 mr-1"
                >
                  -{token.value}
                </mark>
              );
            }
            return <span key={idx}>{token.value}</span>;
          })}
        </div>
      )}
    </div>
  );
}
