import React, { useState } from 'react';
import { 
  X, 
  Columns, 
  AlignLeft, 
  Copy, 
  Check, 
  FileText, 
  PlusCircle, 
  MinusCircle, 
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ArrowRightLeft
} from 'lucide-react';

export default function SectionInspectModal({ section, onClose, meta }) {
  const [viewMode, setViewMode] = useState('sideBySide'); // 'sideBySide' | 'unified'
  const [copied, setCopied] = useState(false);

  if (!section) return null;

  const diffTokens = section.diffTokens || [];
  const tokensDocA = diffTokens.filter(t => t.type === 'unchanged' || t.type === 'removed');
  const tokensDocB = diffTokens.filter(t => t.type === 'unchanged' || t.type === 'added');

  const stats = section.stats || {
    addedWords: 0,
    deletedWords: 0,
    unchangedWords: 0,
    totalWordsA: 0,
    totalWordsB: 0
  };

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

  const getStatusBadge = () => {
    switch (section.status) {
      case 'UNCHANGED':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            100% IDENTICAL
          </span>
        );
      case 'MOVED':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center space-x-1.5">
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>MOVED ({section.movedFrom} ➔ {section.movedTo} • {section.similarityPercent}% MATCH)</span>
          </span>
        );
      case 'MODIFIED':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
            {section.similarityPercent}% MATCH (MODIFIED)
          </span>
        );
      case 'ADDED':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
            ADDED IN DOC B
          </span>
        );
      case 'DELETED':
        return (
          <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
            REMOVED IN DOC B
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white dark:bg-[#111726] border border-slate-200/80 dark:border-white/[0.1] rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-2xl bg-[#FFF4EF] dark:bg-[#FF5E1E]/15 text-[#FF5E1E] flex items-center justify-center shadow-sm">
              <FileText className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  {section.title}
                </h3>
                {getStatusBadge()}
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Detailed isolated comparison for this specific page / slide
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2.5 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-400 hover:text-slate-900 dark:hover:text-white transition hover:scale-105"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Stats Toolbar */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-3 text-xs font-semibold">
            <span className="flex items-center space-x-1 text-[#FF5E1E]">
              <PlusCircle className="w-3.5 h-3.5" />
              <span>+{stats.addedWords} added</span>
            </span>
            <span className="flex items-center space-x-1 text-rose-500">
              <MinusCircle className="w-3.5 h-3.5" />
              <span>-{stats.deletedWords} removed</span>
            </span>
            <span className="flex items-center space-x-1 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{stats.unchangedWords} matching words</span>
            </span>
          </div>

          {/* View Mode & Copy Controls */}
          <div className="flex items-center space-x-2">
            <div className="flex bg-white dark:bg-slate-950 p-1 rounded-full border border-slate-200 dark:border-white/[0.08] text-xs font-semibold shadow-sm">
              <button
                type="button"
                onClick={() => setViewMode('sideBySide')}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-full transition ${
                  viewMode === 'sideBySide'
                    ? 'bg-[#FF5E1E] text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Columns className="w-3 h-3" />
                <span>Side-by-Side</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('unified')}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-full transition ${
                  viewMode === 'unified'
                    ? 'bg-[#FF5E1E] text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <AlignLeft className="w-3 h-3" />
                <span>Unified</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/[0.08] text-xs font-bold text-slate-700 dark:text-slate-200 hover:scale-105 shadow-sm transition"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 text-slate-400" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Relocation info banner if section was moved */}
        {section.status === 'MOVED' && (
          <div className="px-6 py-3 bg-purple-50/90 dark:bg-purple-950/40 border-b border-purple-100 dark:border-purple-900/40 flex items-center space-x-3 text-xs text-purple-900 dark:text-purple-200">
            <div className="w-6 h-6 rounded-full bg-purple-200 dark:bg-purple-800 flex items-center justify-center shrink-0">
              <ArrowRightLeft className="w-3.5 h-3.5 text-purple-700 dark:text-purple-200" />
            </div>
            <div>
              <span className="font-extrabold uppercase tracking-wide">Relocated Content:</span> This content originally appeared in Document A at{' '}
              <span className="font-bold underline decoration-purple-400">{section.movedFrom}</span> and was moved to{' '}
              <span className="font-bold underline decoration-purple-400">{section.movedTo}</span> in Document B.
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto">
          {viewMode === 'sideBySide' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-white/[0.06] min-h-[300px]">
              {/* Document A (Original) */}
              <div className="p-6 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 pb-2 border-b border-slate-100 dark:border-white/[0.04]">
                  <span>📄 Document A: {section.titleA || 'Not Present'}</span>
                  <span className="text-rose-500">-{stats.deletedWords} words</span>
                </div>
                <div className="text-sm font-mono leading-relaxed whitespace-pre-wrap text-slate-800 dark:text-slate-200 select-text">
                  {tokensDocA.length > 0 ? (
                    tokensDocA.map((token, idx) => {
                      if (token.type === 'removed') {
                        return (
                          <mark
                            key={idx}
                            className="diff-token bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 px-1 py-0.5 rounded border-b-2 border-rose-500 font-bold line-through decoration-rose-500/60 mr-1"
                          >
                            {token.value}
                          </mark>
                        );
                      }
                      return <span key={idx}>{token.value}</span>;
                    })
                  ) : (
                    <span className="text-xs text-slate-400 italic">No content in Document A for this section.</span>
                  )}
                </div>
              </div>

              {/* Document B (Revised) */}
              <div className="p-6 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 pb-2 border-b border-slate-100 dark:border-white/[0.04]">
                  <span>📄 Document B: {section.titleB || 'Not Present'}</span>
                  <span className="text-[#FF5E1E]">+{stats.addedWords} words</span>
                </div>
                <div className="text-sm font-mono leading-relaxed whitespace-pre-wrap text-slate-800 dark:text-slate-200 select-text">
                  {tokensDocB.length > 0 ? (
                    tokensDocB.map((token, idx) => {
                      if (token.type === 'added') {
                        return (
                          <mark
                            key={idx}
                            className="diff-token bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-1 py-0.5 rounded border-b-2 border-emerald-500 font-bold mr-1"
                          >
                            {token.value}
                          </mark>
                        );
                      }
                      return <span key={idx}>{token.value}</span>;
                    })
                  ) : (
                    <span className="text-xs text-slate-400 italic">No content in Document B for this section.</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* Unified Redline View */
            <div className="p-6 min-h-[300px] text-sm font-mono leading-relaxed whitespace-pre-wrap select-text text-slate-800 dark:text-slate-200">
              {diffTokens.map((token, idx) => {
                if (token.type === 'added') {
                  return (
                    <mark
                      key={idx}
                      className="diff-token bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded border-b-2 border-emerald-500 font-bold mr-1"
                    >
                      +{token.value}
                    </mark>
                  );
                }
                if (token.type === 'removed') {
                  return (
                    <mark
                      key={idx}
                      className="diff-token bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 px-1.5 py-0.5 rounded border-b-2 border-rose-500 font-bold line-through decoration-rose-500/60 mr-1"
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

        {/* Footer */}
        <div className="p-4 px-6 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
          <span>{section.description}</span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-[#FF5E1E] hover:bg-[#E04A0E] text-white font-bold transition shadow-sm"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
}
