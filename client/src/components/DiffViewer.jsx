import React, { useState, useRef, useEffect } from 'react';
import { 
  Columns, 
  AlignLeft, 
  Filter, 
  Search, 
  Copy, 
  Check, 
  ArrowDown, 
  ArrowUp,
  FileText
} from 'lucide-react';

export default function DiffViewer({ diffTokens, meta, stats }) {
  const [viewMode, setViewMode] = useState('sideBySide'); // 'sideBySide' | 'unified'
  const [filterChangesOnly, setFilterChangesOnly] = useState(false);
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
    }, 40);
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

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden space-y-0">
      {/* Diff Controls Toolbar */}
      <div className="p-4 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          {/* View Mode Buttons */}
          <div className="flex bg-slate-800 p-0.5 rounded-lg border border-slate-700 text-xs">
            <button
              type="button"
              onClick={() => setViewMode('sideBySide')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md font-medium transition ${
                viewMode === 'sideBySide' ? 'bg-sky-500 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Side-by-Side</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('unified')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md font-medium transition ${
                viewMode === 'unified' ? 'bg-sky-500 text-white shadow' : 'text-slate-400 hover:text-slate-200'
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
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
              filterChangesOnly
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Changes Only</span>
          </button>
        </div>

        {/* Search & Copy */}
        <div className="flex items-center space-x-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search diff..."
              className="pl-8 pr-3 py-1 bg-slate-800/80 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-sky-500 w-36 sm:w-48"
            />
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center space-x-1 px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 hover:text-white transition"
            title="Copy diff to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Legend Bar */}
      <div className="px-5 py-2 bg-slate-950/60 border-b border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center space-x-4">
          <span className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded bg-rose-500/20 border border-rose-500/40 inline-block" />
            <span>Deleted words (Document A)</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded bg-emerald-500/20 border border-emerald-500/40 inline-block" />
            <span>Added words (Document B)</span>
          </span>
        </div>
        <div className="hidden sm:block text-slate-500">
          Sync scrolling enabled
        </div>
      </div>

      {/* --- CONTENT PANES --- */}
      {viewMode === 'sideBySide' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
          {/* Document A (Original) */}
          <div className="flex flex-col">
            <div className="px-4 py-2.5 bg-slate-850 border-b border-slate-800 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 truncate">
                📄 Document A: {meta?.docA?.filename}
              </span>
              <span className="text-[11px] text-rose-400 font-mono">
                -{stats?.deletedWords || 0} words
              </span>
            </div>
            <div
              ref={leftPaneRef}
              onScroll={() => handleScroll('left')}
              className="p-5 max-h-[550px] overflow-y-auto leading-relaxed text-xs sm:text-sm font-mono whitespace-pre-wrap select-text text-slate-300"
            >
              {tokensDocA.map((token, idx) => {
                if (token.type === 'removed') {
                  return (
                    <mark
                      key={idx}
                      className="bg-rose-500/20 text-rose-300 px-1 py-0.5 rounded border border-rose-500/40 font-semibold line-through decoration-rose-500/60 mr-1 inline-block"
                    >
                      {token.value}
                    </mark>
                  );
                }
                return <span key={idx}>{token.value}</span>;
              })}
            </div>
          </div>

          {/* Document B (Modified) */}
          <div className="flex flex-col">
            <div className="px-4 py-2.5 bg-slate-850 border-b border-slate-800 flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 truncate">
                📄 Document B: {meta?.docB?.filename}
              </span>
              <span className="text-[11px] text-emerald-400 font-mono">
                +{stats?.addedWords || 0} words
              </span>
            </div>
            <div
              ref={rightPaneRef}
              onScroll={() => handleScroll('right')}
              className="p-5 max-h-[550px] overflow-y-auto leading-relaxed text-xs sm:text-sm font-mono whitespace-pre-wrap select-text text-slate-300"
            >
              {tokensDocB.map((token, idx) => {
                if (token.type === 'added') {
                  return (
                    <mark
                      key={idx}
                      className="bg-emerald-500/20 text-emerald-300 px-1 py-0.5 rounded border border-emerald-500/40 font-semibold mr-1 inline-block"
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
        <div className="p-6 max-h-[600px] overflow-y-auto leading-relaxed text-xs sm:text-sm font-mono whitespace-pre-wrap select-text text-slate-300 bg-slate-950/40">
          {filteredTokens.map((token, idx) => {
            if (token.type === 'added') {
              return (
                <mark
                  key={idx}
                  className="bg-emerald-500/20 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-500/40 font-semibold mr-1 inline-block"
                >
                  +{token.value}
                </mark>
              );
            }
            if (token.type === 'removed') {
              return (
                <mark
                  key={idx}
                  className="bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded border border-rose-500/40 font-semibold line-through decoration-rose-500/60 mr-1 inline-block"
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
