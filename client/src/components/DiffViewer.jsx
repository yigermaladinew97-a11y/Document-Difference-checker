import React, { useState, useRef, useMemo, useEffect } from 'react';
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
  SlidersHorizontal,
  FileEdit,
  RotateCcw,
  Sparkles,
  ChevronUp,
  ChevronDown,
  X,
  Table
} from 'lucide-react';
import NoiseFiltersBar from './NoiseFiltersBar';
import MergeResolver from './MergeResolver';
import InlineChangeAction from './InlineChangeAction';
import SpreadsheetGridDiff from './SpreadsheetGridDiff';
import { extractChangeBlocks, tagTokensWithChangeIds, exportRedlineDocx } from '../utils/mergeExporter';

export default function DiffViewer({
  diffTokens,
  meta,
  stats,
  filters,
  onFilterChange,
  onApplyFilters,
  isComparing = false,
  onExportPdf,
  initialDecisions = {},
  onDecisionsChange,
  spreadsheetDiff
}) {
  const hasSpreadsheet = Boolean(spreadsheetDiff && spreadsheetDiff.length > 0);
  const [viewMode, setViewMode] = useState(() => (hasSpreadsheet ? 'spreadsheet' : 'sideBySide'));
  const [filterChangesOnly, setFilterChangesOnly] = useState(false);
  const [wrapText, setWrapText] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const [showFilterTray, setShowFilterTray] = useState(false);
  const [isExportingWord, setIsExportingWord] = useState(false);

  // In-line change decision state shared across Side-by-Side, Unified, and MergeResolver
  const [decisions, setDecisions] = useState(() => initialDecisions || {});
  const [hoveredChangeId, setHoveredChangeId] = useState(null);
  const [currentChangeIndex, setCurrentChangeIndex] = useState(0);

  const handleExportRedlineWord = async () => {
    try {
      setIsExportingWord(true);
      await exportRedlineDocx(diffTokens, meta, stats);
    } catch (err) {
      console.error('Failed to export redline Word document:', err);
      alert('Could not export redline Word document.');
    } finally {
      setIsExportingWord(false);
    }
  };

  // Auto-switch to spreadsheet view if spreadsheetDiff is provided
  useEffect(() => {
    if (hasSpreadsheet) {
      setViewMode('spreadsheet');
    }
  }, [hasSpreadsheet]);

  // Synchronize when restored from history
  useEffect(() => {
    if (initialDecisions) {
      setDecisions(initialDecisions);
    }
  }, [initialDecisions]);

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

  // Tag raw tokens with change metadata (changeId, changeNum, changeType, etc.)
  const taggedDiffTokens = useMemo(() => tagTokensWithChangeIds(diffTokens), [diffTokens]);
  const changeBlocks = useMemo(() => extractChangeBlocks(diffTokens).filter(b => b.isChange), [diffTokens]);

  const totalChanges = changeBlocks.length;
  const acceptedCount = changeBlocks.filter(b => decisions[b.id] === 'accepted').length;
  const rejectedCount = changeBlocks.filter(b => decisions[b.id] === 'rejected').length;
  const resolvedCount = acceptedCount + rejectedCount;
  const percentResolved = totalChanges > 0 ? Math.round((resolvedCount / totalChanges) * 100) : 100;

  // Single change decision handler
  const handleInlineDecision = (changeId, choice) => {
    setDecisions(prev => {
      const next = { ...prev, [changeId]: choice };
      if (onDecisionsChange) onDecisionsChange(next);
      return next;
    });
  };

  // Bulk decision handlers
  const handleAcceptAll = () => {
    const next = {};
    changeBlocks.forEach(b => { next[b.id] = 'accepted'; });
    setDecisions(next);
    if (onDecisionsChange) onDecisionsChange(next);
  };

  const handleRejectAll = () => {
    const next = {};
    changeBlocks.forEach(b => { next[b.id] = 'rejected'; });
    setDecisions(next);
    if (onDecisionsChange) onDecisionsChange(next);
  };

  const handleResetAll = () => {
    setDecisions({});
    if (onDecisionsChange) onDecisionsChange({});
  };

  // Smooth jump to next/previous change
  const jumpToChange = (direction) => {
    if (totalChanges === 0) return;
    let nextIdx = direction === 'next' ? currentChangeIndex + 1 : currentChangeIndex - 1;
    if (nextIdx >= totalChanges) nextIdx = 0;
    if (nextIdx < 0) nextIdx = totalChanges - 1;
    setCurrentChangeIndex(nextIdx);

    const target = changeBlocks[nextIdx];
    if (target) {
      setHoveredChangeId(target.id);
      const el = document.getElementById(`diff-change-${target.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  if (!diffTokens || diffTokens.length === 0) return null;

  // Format whitespace characters into visible symbols for clarity
  const renderWhitespaceGlyphs = (val) => {
    if (!val) return '';
    return val
      .replace(/ /g, '·')
      .replace(/\t/g, '⇥   ')
      .replace(/\n/g, '↵\n');
  };

  const filteredTokens = taggedDiffTokens.filter(token => {
    if (filterChangesOnly && token.type === 'unchanged') return false;
    if (searchQuery.trim()) {
      return token.value.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const tokensDocA = taggedDiffTokens.filter(t => t.type === 'unchanged' || t.type === 'removed');
  const tokensDocB = taggedDiffTokens.filter(t => t.type === 'unchanged' || t.type === 'added');

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
            {hasSpreadsheet && (
              <button
                type="button"
                onClick={() => setViewMode('spreadsheet')}
                className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-full font-bold transition-all duration-200 ${viewMode === 'spreadsheet'
                    ? 'bg-[#FF5E1E] text-white shadow-sm scale-100'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                title="Spreadsheet cell-by-cell grid diff with numerical delta analysis"
              >
                <Table className="w-3.5 h-3.5" />
                <span>Spreadsheet Grid</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setViewMode('sideBySide')}
              className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-full font-bold transition-all duration-200 ${viewMode === 'sideBySide'
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
              className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-full font-bold transition-all duration-200 ${viewMode === 'unified'
                  ? 'bg-[#FF5E1E] text-white shadow-sm scale-100'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
            >
              <AlignLeft className="w-3.5 h-3.5" />
              <span>Unified Redline</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('merge')}
              className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-full font-bold transition-all duration-200 ${viewMode === 'merge'
                  ? 'bg-[#FF5E1E] text-white shadow-sm scale-100'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              title="Track changes: Accept / Reject individual changes and export clean document"
            >
              <FileEdit className="w-3.5 h-3.5" />
              <span>Merge &amp; Resolve</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => setFilterChangesOnly(!filterChangesOnly)}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all duration-200 ${filterChangesOnly
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
            className={`hidden sm:flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition ${wrapText
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
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all duration-200 ${showFilterTray
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

          <button
            type="button"
            onClick={handleExportRedlineWord}
            disabled={isExportingWord}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold shadow-sm hover:scale-105 active:scale-95 transition disabled:opacity-50"
            title="Download Legal Redline Word Document (.docx) with strikethrough & underline markup"
          >
            <FileEdit className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>{isExportingWord ? 'Exporting...' : 'Redline Word'}</span>
          </button>
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

      {/* Quick In-Line Resolver & Jump Navigation Bar */}
      {viewMode !== 'merge' && viewMode !== 'spreadsheet' && totalChanges > 0 && (
        <div className="px-6 py-2.5 bg-slate-50/90 dark:bg-slate-900/80 border-b border-slate-100 dark:border-white/[0.04] flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Left: Progress info */}
          <div className="flex items-center space-x-3">
            <span className="flex items-center space-x-1.5 font-bold text-slate-800 dark:text-slate-200">
              <span className="w-2 h-2 rounded-full bg-[#FF5E1E] animate-pulse" />
              <span>In-Line Resolver:</span>
            </span>
            <span className="text-slate-500 font-mono text-[11px]">
              <strong className="text-[#FF5E1E]">{resolvedCount}</strong> of <strong>{totalChanges}</strong> resolved ({percentResolved}%)
            </span>
            <div className="w-24 bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden hidden sm:block">
              <div
                className="h-full bg-gradient-to-r from-[#FF5E1E] to-emerald-500 transition-all duration-300 rounded-full"
                style={{ width: `${percentResolved}%` }}
              />
            </div>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold hidden md:inline">
              ✓ {acceptedCount} accepted
            </span>
            <span className="text-[11px] text-rose-500 font-bold hidden md:inline">
              ✕ {rejectedCount} rejected
            </span>
          </div>

          {/* Right: Change Jump Navigation & Quick Bulk Actions */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center bg-white dark:bg-slate-950 rounded-full border border-slate-200 dark:border-white/[0.08] p-0.5 shadow-xs">
              <button
                type="button"
                onClick={() => jumpToChange('prev')}
                className="px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:text-[#FF5E1E] transition flex items-center space-x-1"
                title="Jump to previous change"
              >
                <span>↑ Prev</span>
              </button>
              <span className="text-slate-300 dark:text-slate-700 font-mono text-[10px] px-1">
                {currentChangeIndex + 1}/{totalChanges}
              </span>
              <button
                type="button"
                onClick={() => jumpToChange('next')}
                className="px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:text-[#FF5E1E] transition flex items-center space-x-1"
                title="Jump to next change"
              >
                <span>Next ↓</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleAcceptAll}
              className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition shadow-xs"
              title="Accept all revisions"
            >
              Accept All
            </button>
            <button
              type="button"
              onClick={handleRejectAll}
              className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 transition shadow-xs"
              title="Reject all revisions"
            >
              Reject All
            </button>
            <button
              type="button"
              onClick={handleResetAll}
              className="p-1 rounded-full bg-white dark:bg-slate-950 text-slate-400 hover:text-slate-700 dark:hover:text-white border border-slate-200 dark:border-white/[0.08] transition shadow-xs"
              title="Reset decisions"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Legend & Status */}
      {viewMode !== 'merge' && viewMode !== 'spreadsheet' && (
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
            <span className="hidden md:inline text-slate-400">
              Tip: Hover over any colored change to Accept or Reject in-line
            </span>
          </div>
          <div className="hidden sm:flex items-center space-x-1.5 text-slate-400 font-mono text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Synchronized scroll active</span>
          </div>
        </div>
      )}

      {/* Content Panes */}
      {viewMode === 'spreadsheet' && hasSpreadsheet ? (
        <div className="p-6 sm:p-8 bg-slate-50/40 dark:bg-transparent">
          <SpreadsheetGridDiff spreadsheetDiff={spreadsheetDiff} meta={meta} />
        </div>
      ) : viewMode === 'merge' ? (
        <div className="p-6 sm:p-8 bg-slate-50/40 dark:bg-transparent">
          <MergeResolver
            diffTokens={diffTokens}
            meta={meta}
            decisions={decisions}
            onDecision={handleInlineDecision}
            onAcceptAll={handleAcceptAll}
            onRejectAll={handleRejectAll}
            onResetAll={handleResetAll}
          />
        </div>
      ) : viewMode === 'sideBySide' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-100 dark:divide-white/[0.08]">
          {/* Doc A */}
          <div className="flex flex-col bg-slate-50/30 dark:bg-transparent">
            <div className="px-6 py-3.5 bg-slate-100/70 dark:bg-slate-900/80 border-b border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-xs font-semibold">
              <span className="text-slate-800 dark:text-slate-200 truncate flex items-center space-x-2">
                <FileText className="w-4 h-4 text-[#FF5E1E] shrink-0" />
                <span className="truncate">{meta?.docA?.filename}</span>
              </span>
              <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold border border-rose-200 dark:border-rose-900">
                -{stats?.deletedWords || 0} words{stats?.deletedWhitespace > 0 ? ` · -${stats.deletedWhitespace} spaces` : ''}
              </span>
            </div>
            <div
              ref={leftPaneRef}
              onScroll={() => handleScroll('left')}
              className={`p-6 sm:p-8 max-h-[600px] overflow-y-auto leading-relaxed text-xs sm:text-sm font-mono select-text text-slate-800 dark:text-slate-300 ${wrapText ? 'whitespace-pre-wrap' : 'whitespace-pre overflow-x-auto'
                }`}
            >
              {tokensDocA.map((token, idx) => {
                if (token.type === 'unchanged') {
                  return <span key={idx}>{token.value}</span>;
                }

                // Removed token in Doc A
                const isWs = token.isWhitespace || /^\s+$/.test(token.value);
                const decision = decisions[token.changeId] || 'pending';
                const isAccepted = decision === 'accepted';
                const isRejected = decision === 'rejected';
                const isHovered = hoveredChangeId === token.changeId;

                let markClass = '';
                let markTitle = '';

                if (isAccepted) {
                  markClass = 'diff-token bg-slate-100 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 line-through decoration-slate-400 px-1.5 py-0.5 rounded mr-1 opacity-50 select-text';
                  markTitle = `Replaced by revision in Change #${token.changeNum}`;
                } else if (isRejected) {
                  markClass = 'diff-token bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-b-2 border-emerald-500 font-bold px-1.5 py-0.5 rounded mr-1 select-text shadow-xs';
                  markTitle = `Original preserved in Change #${token.changeNum}`;
                } else {
                  if (isWs) {
                    markClass = 'diff-token-ws inline-block bg-rose-200/90 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 px-1 py-0.5 rounded text-[11px] font-mono border border-dashed border-rose-400 select-all mx-0.5 align-middle';
                    markTitle = `Removed whitespace (${token.value.length} char${token.value.length > 1 ? 's' : ''})`;
                  } else {
                    markClass = `diff-token bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 px-1.5 py-0.5 rounded-md border-b-2 border-rose-500 font-bold line-through decoration-rose-500/60 mr-1 cursor-pointer transition ${
                      isHovered ? 'ring-2 ring-[#FF5E1E] bg-rose-200 dark:bg-rose-900/60' : ''
                    }`;
                    markTitle = `Hover/Click to resolve Change #${token.changeNum}`;
                  }
                }

                const content = isWs ? (
                  <mark className={markClass} title={markTitle}>
                    <span className="opacity-80 font-bold">{renderWhitespaceGlyphs(token.value)}</span>
                  </mark>
                ) : (
                  <mark className={markClass} title={markTitle}>
                    {token.value}
                  </mark>
                );

                const wrapped = (
                  <span
                    key={idx}
                    onMouseEnter={() => setHoveredChangeId(token.changeId)}
                    onMouseLeave={() => setHoveredChangeId(null)}
                    className="inline"
                  >
                    {content}
                  </span>
                );

                if (token.isFirstInChange) {
                  return (
                    <InlineChangeAction
                      key={idx}
                      changeId={token.changeId}
                      changeNum={token.changeNum}
                      changeType={token.changeType}
                      originalText={token.originalText}
                      newText={token.newText}
                      decision={decision}
                      onDecision={handleInlineDecision}
                      pane="left"
                      isHovered={isHovered}
                    >
                      {wrapped}
                    </InlineChangeAction>
                  );
                }

                return wrapped;
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
                +{stats?.addedWords || 0} words{stats?.addedWhitespace > 0 ? ` · +${stats.addedWhitespace} spaces` : ''}
              </span>
            </div>
            <div
              ref={rightPaneRef}
              onScroll={() => handleScroll('right')}
              className={`p-6 sm:p-8 max-h-[600px] overflow-y-auto leading-relaxed text-xs sm:text-sm font-mono select-text text-slate-800 dark:text-slate-300 ${wrapText ? 'whitespace-pre-wrap' : 'whitespace-pre overflow-x-auto'
                }`}
            >
              {tokensDocB.map((token, idx) => {
                if (token.type === 'unchanged') {
                  return <span key={idx}>{token.value}</span>;
                }

                // Added token in Doc B
                const isWs = token.isWhitespace || /^\s+$/.test(token.value);
                const decision = decisions[token.changeId] || 'pending';
                const isAccepted = decision === 'accepted';
                const isRejected = decision === 'rejected';
                const isHovered = hoveredChangeId === token.changeId;

                let markClass = '';
                let markTitle = '';

                if (isAccepted) {
                  markClass = 'diff-token bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border-b-2 border-emerald-500 font-bold px-1.5 py-0.5 rounded mr-1 select-text shadow-xs';
                  markTitle = `Accepted revision in Change #${token.changeNum}`;
                } else if (isRejected) {
                  markClass = 'diff-token bg-slate-100 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 line-through decoration-rose-400 px-1.5 py-0.5 rounded mr-1 opacity-50 select-text';
                  markTitle = `Rejected in Change #${token.changeNum}`;
                } else {
                  if (isWs) {
                    markClass = 'diff-token-ws inline-block bg-emerald-200/90 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 px-1 py-0.5 rounded text-[11px] font-mono border border-dashed border-emerald-400 select-all mx-0.5 align-middle';
                    markTitle = `Added whitespace (${token.value.length} char${token.value.length > 1 ? 's' : ''})`;
                  } else {
                    markClass = `diff-token bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded-md border-b-2 border-emerald-500 font-bold mr-1 cursor-pointer transition ${
                      isHovered ? 'ring-2 ring-[#FF5E1E] bg-emerald-200 dark:bg-emerald-900/60' : ''
                    }`;
                    markTitle = `Hover/Click to resolve Change #${token.changeNum}`;
                  }
                }

                const content = isWs ? (
                  <mark className={markClass} title={markTitle}>
                    <span className="opacity-80 font-bold">+{renderWhitespaceGlyphs(token.value)}</span>
                  </mark>
                ) : (
                  <mark className={markClass} title={markTitle}>
                    +{token.value}
                  </mark>
                );

                const wrapped = (
                  <span
                    key={idx}
                    onMouseEnter={() => setHoveredChangeId(token.changeId)}
                    onMouseLeave={() => setHoveredChangeId(null)}
                    className="inline"
                  >
                    {content}
                  </span>
                );

                if (token.isFirstInChange) {
                  return (
                    <InlineChangeAction
                      key={idx}
                      changeId={token.changeId}
                      changeNum={token.changeNum}
                      changeType={token.changeType}
                      originalText={token.originalText}
                      newText={token.newText}
                      decision={decision}
                      onDecision={handleInlineDecision}
                      pane="right"
                      isHovered={isHovered}
                    >
                      {wrapped}
                    </InlineChangeAction>
                  );
                }

                return wrapped;
              })}
            </div>
          </div>
        </div>
      ) : (
        /* Unified View */
        <div className="p-8 max-h-[650px] overflow-y-auto leading-relaxed text-xs sm:text-sm font-mono whitespace-pre-wrap select-text text-slate-800 dark:text-slate-300 bg-white dark:bg-slate-900/40">
          {filteredTokens.map((token, idx) => {
            if (token.type === 'unchanged') {
              return <span key={idx}>{token.value}</span>;
            }

            const isWs = token.isWhitespace || /^\s+$/.test(token.value);
            const decision = decisions[token.changeId] || 'pending';
            const isAccepted = decision === 'accepted';
            const isRejected = decision === 'rejected';
            const isHovered = hoveredChangeId === token.changeId;

            let markClass = '';
            let markTitle = '';

            if (token.type === 'added') {
              if (isAccepted) {
                markClass = 'diff-token bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border-b-2 border-emerald-500 font-bold px-1.5 py-0.5 rounded mr-1 select-text shadow-xs';
                markTitle = `Accepted revision in Change #${token.changeNum}`;
              } else if (isRejected) {
                markClass = 'diff-token bg-slate-100 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 line-through decoration-rose-400 px-1.5 py-0.5 rounded mr-1 opacity-50 select-text';
                markTitle = `Rejected in Change #${token.changeNum}`;
              } else {
                if (isWs) {
                  markClass = 'diff-token-ws inline-block bg-emerald-200/90 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 px-1 py-0.5 rounded text-[11px] font-mono border border-dashed border-emerald-400 select-all mx-0.5 align-middle';
                  markTitle = `Added whitespace (${token.value.length} char${token.value.length > 1 ? 's' : ''})`;
                } else {
                  markClass = `diff-token bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded-md border-b-2 border-emerald-500 font-bold mr-1 cursor-pointer transition ${
                    isHovered ? 'ring-2 ring-[#FF5E1E] bg-emerald-200 dark:bg-emerald-900/60' : ''
                  }`;
                  markTitle = `Hover/Click to resolve Change #${token.changeNum}`;
                }
              }

              const content = isWs ? (
                <mark className={markClass} title={markTitle}>
                  <span className="opacity-80 font-bold">+{renderWhitespaceGlyphs(token.value)}</span>
                </mark>
              ) : (
                <mark className={markClass} title={markTitle}>
                  +{token.value}
                </mark>
              );

              const wrapped = (
                <span
                  key={idx}
                  onMouseEnter={() => setHoveredChangeId(token.changeId)}
                  onMouseLeave={() => setHoveredChangeId(null)}
                  className="inline"
                >
                  {content}
                </span>
              );

              if (token.isFirstInChange) {
                return (
                  <InlineChangeAction
                    key={idx}
                    changeId={token.changeId}
                    changeNum={token.changeNum}
                    changeType={token.changeType}
                    originalText={token.originalText}
                    newText={token.newText}
                    decision={decision}
                    onDecision={handleInlineDecision}
                    pane="unified"
                    isHovered={isHovered}
                  >
                    {wrapped}
                  </InlineChangeAction>
                );
              }

              return wrapped;
            }

            if (token.type === 'removed') {
              if (isAccepted) {
                markClass = 'diff-token bg-slate-100 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 line-through decoration-slate-400 px-1.5 py-0.5 rounded mr-1 opacity-50 select-text';
                markTitle = `Replaced by revision in Change #${token.changeNum}`;
              } else if (isRejected) {
                markClass = 'diff-token bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-b-2 border-emerald-500 font-bold px-1.5 py-0.5 rounded mr-1 select-text shadow-xs';
                markTitle = `Original preserved in Change #${token.changeNum}`;
              } else {
                if (isWs) {
                  markClass = 'diff-token-ws inline-block bg-rose-200/90 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 px-1 py-0.5 rounded text-[11px] font-mono border border-dashed border-rose-400 select-all mx-0.5 align-middle';
                  markTitle = `Removed whitespace (${token.value.length} char${token.value.length > 1 ? 's' : ''})`;
                } else {
                  markClass = `diff-token bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 px-1.5 py-0.5 rounded-md border-b-2 border-rose-500 font-bold line-through decoration-rose-500/60 mr-1 cursor-pointer transition ${
                    isHovered ? 'ring-2 ring-[#FF5E1E] bg-rose-200 dark:bg-rose-900/60' : ''
                  }`;
                  markTitle = `Hover/Click to resolve Change #${token.changeNum}`;
                }
              }

              const content = isWs ? (
                <mark className={markClass} title={markTitle}>
                  <span className="opacity-80 font-bold">-{renderWhitespaceGlyphs(token.value)}</span>
                </mark>
              ) : (
                <mark className={markClass} title={markTitle}>
                  -{token.value}
                </mark>
              );

              const wrapped = (
                <span
                  key={idx}
                  onMouseEnter={() => setHoveredChangeId(token.changeId)}
                  onMouseLeave={() => setHoveredChangeId(null)}
                  className="inline"
                >
                  {content}
                </span>
              );

              if (token.isFirstInChange) {
                return (
                  <InlineChangeAction
                    key={idx}
                    changeId={token.changeId}
                    changeNum={token.changeNum}
                    changeType={token.changeType}
                    originalText={token.originalText}
                    newText={token.newText}
                    decision={decision}
                    onDecision={handleInlineDecision}
                    pane="unified"
                    isHovered={isHovered}
                  >
                    {wrapped}
                  </InlineChangeAction>
                );
              }

              return wrapped;
            }

            return <span key={idx}>{token.value}</span>;
          })}
        </div>
      )}
    </div>
  );
}
