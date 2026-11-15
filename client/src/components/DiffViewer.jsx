import React, { useState, useRef, useEffect } from 'react';
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
  Hash,
  ChevronRight,
  ChevronLeft
} from 'lucide-react';

export default function DiffViewer({ diffTokens, meta, stats }) {
  const [viewMode, setViewMode] = useState('sideBySide'); // 'sideBySide' | 'unified'
  const [filterChangesOnly, setFilterChangesOnly] = useState(false);
  const [wrapText, setWrapText] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [copied, setCopied] = useState(false);

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

  // Filter tokens if search query is active
  const filteredTokens = diffTokens.filter(token => {
    if (filterChangesOnly && token.type === 'unchanged') return false;
    if (searchQuery.trim()) {
      return token.value.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  // Prepare tokens for Document A (Left): Show unchanged and removed
  const tokensDocA = diffTokens.filter(t => t.type === 'unchanged' || t.type === 'removed');
  // Prepare tokens for Document B (Right): Show unchanged and added
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
    <div className="rounded-3xl bg-dark-900/90 border border-white/[0.08] shadow-2xl backdrop-blur-xl overflow-hidden space-y-0">
      {/* Top Toolbar */}
      <div className="p-4 sm:p-5 bg-dark-950/80 border-b border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
        {/* Left: View Mode Segmented Control */}
        <div className="flex items-center space-x-2">
          <div className="flex bg-dark-900 p-1 rounded-xl border border-white/[0.06] text-xs">
            <button
              type="button"
              onClick={() => setViewMode('sideBySide')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg font-semibold transition ${
                viewMode === 'sideBySide' 
                  ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Side-by-Side</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('unified')}
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg font-semibold transition ${
                viewMode === 'unified' 
                  ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <AlignLeft className="w-3.5 h-3.5" />
              <span>Unified Redline</span>
            </button>
          </div>

          {/* Filter Changes Only */}
          <button
            type="button"
            onClick={() => setFilterChangesOnly(!filterChangesOnly)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
              filterChangesOnly
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-sm'
                : 'bg-dark-900 border-white/[0.06] text-slate-400 hover:text-slate-200 hover:border-white/20'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Changes Only</span>
          </button>

          {/* Wrap Toggle */}
          <button
            type="button"
            onClick={() => setWrapText(!wrapText)}
            className={`hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition ${
              wrapText
                ? 'bg-dark-850 border-white/[0.1] text-slate-200'
                : 'bg-dark-900 border-white/[0.06] text-slate-400'
            }`}
            title="Toggle word wrap"
          >
            <WrapText className="w-3.5 h-3.5" />
            <span>Wrap</span>
          </button>
        </div>

        {/* Right: Search, Export & Copy */}
        <div className="flex items-center space-x-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search in diff..."
              className="pl-9 pr-3 py-1.5 bg-dark-900 border border-white/[0.08] rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40 w-36 sm:w-48 transition font-mono"
            />
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-dark-900 hover:bg-dark-850 border border-white/[0.08] text-xs font-medium text-slate-300 hover:text-white transition shadow-sm"
            title="Copy diff with redline tags"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportReport}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-dark-900 hover:bg-dark-850 border border-white/[0.08] text-xs font-medium text-slate-300 hover:text-white transition shadow-sm"
            title="Export Diff Report as JSON"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Export</span>
          </button>
        </div>
      </div>

      {/* Legend & Sync Bar */}
      <div className="px-6 py-2.5 bg-dark-950/40 border-b border-white/[0.04] flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center space-x-5">
          <span className="flex items-center space-x-2">
            <span className="w-3.5 h-2 rounded bg-rose-500/20 border-b-2 border-rose-500/60 inline-block" />
            <span className="font-medium text-slate-300">Removed text (Doc A)</span>
          </span>
          <span className="flex items-center space-x-2">
            <span className="w-3.5 h-2 rounded bg-emerald-500/20 border-b-2 border-emerald-500/60 inline-block" />
            <span className="font-medium text-slate-300">Added text (Doc B)</span>
          </span>
        </div>
        <div className="hidden sm:flex items-center space-x-2 text-slate-500 font-mono text-[10px]">
          <span className="w-2 h-2 rounded-full bg-emerald-500/60" />
          <span>Synchronized scroll enabled</span>
        </div>
      </div>

      {/* --- CONTENT PANES --- */}
      {viewMode === 'sideBySide' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-white/[0.08]">
          {/* Document A (Original Base) */}
          <div className="flex flex-col bg-dark-950/20">
            <div className="px-5 py-3 bg-dark-950/80 border-b border-white/[0.06] flex items-center justify-between text-xs font-medium">
              <span className="font-semibold text-slate-200 truncate flex items-center space-x-2">
                <FileText className="w-4 h-4 text-sky-400 shrink-0" />
                <span className="truncate">{meta?.docA?.filename}</span>
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
                -{stats?.deletedWords || 0} words
              </span>
            </div>
            <div
              ref={leftPaneRef}
              onScroll={() => handleScroll('left')}
              className={`p-6 max-h-[600px] overflow-y-auto leading-relaxed text-xs sm:text-sm font-mono select-text text-slate-300 ${
                wrapText ? 'whitespace-pre-wrap' : 'whitespace-pre overflow-x-auto'
              }`}
            >
              {tokensDocA.map((token, idx) => {
                if (token.type === 'removed') {
                  return (
                    <mark
                      key={idx}
                      className="bg-rose-500/15 text-rose-200 px-1 py-0.5 rounded-sm border-b-2 border-rose-500/60 font-semibold line-through decoration-rose-400/50 mr-1 inline-block"
                    >
                      {token.value}
                    </mark>
                  );
                }
                return <span key={idx}>{token.value}</span>;
              })}
            </div>
          </div>

          {/* Document B (Comparison Revised) */}
          <div className="flex flex-col bg-dark-950/20">
            <div className="px-5 py-3 bg-dark-950/80 border-b border-white/[0.06] flex items-center justify-between text-xs font-medium">
              <span className="font-semibold text-slate-200 truncate flex items-center space-x-2">
                <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="truncate">{meta?.docB?.filename}</span>
              </span>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                +{stats?.addedWords || 0} words
              </span>
            </div>
            <div
              ref={rightPaneRef}
              onScroll={() => handleScroll('right')}
              className={`p-6 max-h-[600px] overflow-y-auto leading-relaxed text-xs sm:text-sm font-mono select-text text-slate-300 ${
                wrapText ? 'whitespace-pre-wrap' : 'whitespace-pre overflow-x-auto'
              }`}
            >
              {tokensDocB.map((token, idx) => {
                if (token.type === 'added') {
                  return (
                    <mark
                      key={idx}
                      className="bg-emerald-500/15 text-emerald-200 px-1 py-0.5 rounded-sm border-b-2 border-emerald-500/60 font-semibold mr-1 inline-block"
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
        <div className="p-7 max-h-[650px] overflow-y-auto leading-relaxed text-xs sm:text-sm font-mono whitespace-pre-wrap select-text text-slate-300 bg-dark-950/50">
          {filteredTokens.map((token, idx) => {
            if (token.type === 'added') {
              return (
                <mark
                  key={idx}
                  className="bg-emerald-500/15 text-emerald-200 px-1.5 py-0.5 rounded-sm border-b-2 border-emerald-500/60 font-semibold mr-1 inline-block"
                >
                  +{token.value}
                </mark>
              );
            }
            if (token.type === 'removed') {
              return (
                <mark
                  key={idx}
                  className="bg-rose-500/15 text-rose-200 px-1.5 py-0.5 rounded-sm border-b-2 border-rose-500/60 font-semibold line-through decoration-rose-400/50 mr-1 inline-block"
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
