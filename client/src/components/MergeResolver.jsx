import React, { useState, useMemo } from 'react';
import { 
  Check, 
  X, 
  CheckCheck, 
  XCircle, 
  RotateCcw, 
  Download, 
  FileText, 
  Copy, 
  Sparkles,
  ArrowRight,
  FileCheck2,
  FileEdit,
  Eye,
  SlidersHorizontal,
  Info
} from 'lucide-react';
import { extractChangeBlocks, computeMergedDocumentText, exportMergedDocx, exportMergedTxt } from '../utils/mergeExporter';

export default function MergeResolver({ diffTokens = [], meta = {} }) {
  // Extract grouped change units from diffTokens
  const blocks = useMemo(() => extractChangeBlocks(diffTokens), [diffTokens]);
  const changeBlocks = useMemo(() => blocks.filter(b => b.isChange), [blocks]);

  // Decision state: { [changeId]: 'accepted' | 'rejected' | 'pending' }
  const [decisions, setDecisions] = useState({});
  const [activeSubTab, setActiveSubTab] = useState('interactive'); // 'interactive' | 'preview'
  const [copied, setCopied] = useState(false);
  const [isExportingDocx, setIsExportingDocx] = useState(false);

  // Metrics
  const totalChanges = changeBlocks.length;
  const acceptedCount = changeBlocks.filter(b => decisions[b.id] === 'accepted').length;
  const rejectedCount = changeBlocks.filter(b => decisions[b.id] === 'rejected').length;
  const resolvedCount = acceptedCount + rejectedCount;
  const pendingCount = totalChanges - resolvedCount;
  const percentResolved = totalChanges > 0 ? Math.round((resolvedCount / totalChanges) * 100) : 100;

  // Single change decision handler
  const handleDecision = (id, choice) => {
    setDecisions(prev => ({
      ...prev,
      [id]: choice
    }));
  };

  // Bulk actions
  const handleAcceptAll = () => {
    const next = {};
    changeBlocks.forEach(b => { next[b.id] = 'accepted'; });
    setDecisions(next);
  };

  const handleRejectAll = () => {
    const next = {};
    changeBlocks.forEach(b => { next[b.id] = 'rejected'; });
    setDecisions(next);
  };

  const handleResetAll = () => {
    setDecisions({});
  };

  // Copy merged text
  const handleCopyMerged = () => {
    const text = computeMergedDocumentText(blocks, decisions);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Export handlers
  const handleDownloadDocx = async () => {
    try {
      setIsExportingDocx(true);
      await exportMergedDocx(blocks, decisions, meta);
    } catch (err) {
      console.error('Docx export failed:', err);
    } finally {
      setIsExportingDocx(false);
    }
  };

  const handleDownloadTxt = () => {
    exportMergedTxt(blocks, decisions, meta);
  };

  if (totalChanges === 0) {
    return (
      <div className="p-8 text-center space-y-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-3xl">
        <CheckCheck className="w-10 h-10 text-emerald-500 mx-auto" />
        <h4 className="font-extrabold text-slate-900 dark:text-white text-base">Documents are 100% in Parity</h4>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          No differences found between Document A and Document B. There are no changes to accept or reject.
        </p>
      </div>
    );
  }

  const mergedDocumentText = computeMergedDocumentText(blocks, decisions);

  return (
    <div className="space-y-6">
      {/* Top Interactive Resolution Dashboard */}
      <div className="p-5 sm:p-6 bg-slate-50 dark:bg-slate-900/70 border border-slate-200/80 dark:border-white/[0.08] rounded-3xl space-y-5 shadow-sm">
        
        {/* Header Strip & Progress */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-2xl bg-[#FFF4EF] dark:bg-[#FF5E1E]/15 text-[#FF5E1E] flex items-center justify-center shadow-xs">
              <FileEdit className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <h4 className="font-black text-sm text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                <span>Interactive Merge &amp; Resolve Mode</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FF5E1E]/15 text-[#FF5E1E] border border-[#FF5E1E]/30">
                  {totalChanges} Total {totalChanges === 1 ? 'Change' : 'Changes'}
                </span>
              </h4>
              <p className="text-xs text-slate-400 font-medium">
                Review each change individually: accept revisions from Document B or retain baseline text from Document A.
              </p>
            </div>
          </div>

          {/* Sub-view switcher: Interactive vs Clean Preview */}
          <div className="flex bg-white dark:bg-slate-950 p-1 rounded-full border border-slate-200/80 dark:border-white/[0.08] text-xs shadow-xs self-start md:self-auto">
            <button
              type="button"
              onClick={() => setActiveSubTab('interactive')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full font-bold transition-all ${
                activeSubTab === 'interactive'
                  ? 'bg-[#FF5E1E] text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileEdit className="w-3.5 h-3.5" />
              <span>Interactive Decision List</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('preview')}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full font-bold transition-all ${
                activeSubTab === 'preview'
                  ? 'bg-[#FF5E1E] text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Clean Document Preview</span>
            </button>
          </div>
        </div>

        {/* Progress Bar & Quick Stats */}
        <div className="space-y-2 pt-1 border-t border-slate-200/60 dark:border-white/[0.06]">
          <div className="flex flex-wrap items-center justify-between text-xs font-semibold gap-2">
            <div className="flex items-center space-x-3 text-[11px]">
              <span className="text-slate-700 dark:text-slate-300">
                Resolution Progress: <strong className="font-mono text-[#FF5E1E]">{resolvedCount} / {totalChanges}</strong> ({percentResolved}%)
              </span>
              <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
              <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Check className="w-3 h-3" /> {acceptedCount} Accepted
              </span>
              <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
              <span className="text-rose-500 flex items-center gap-1">
                <X className="w-3 h-3" /> {rejectedCount} Rejected
              </span>
              {pendingCount > 0 && (
                <>
                  <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700" />
                  <span className="text-amber-500">{pendingCount} Pending</span>
                </>
              )}
            </div>

            {/* Bulk Action Buttons */}
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={handleAcceptAll}
                className="flex items-center space-x-1 px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-[11px] font-bold transition hover:scale-105 active:scale-95"
                title="Accept all revisions from Document B"
              >
                <CheckCheck className="w-3 h-3" />
                <span>Accept All (Doc B)</span>
              </button>

              <button
                type="button"
                onClick={handleRejectAll}
                className="flex items-center space-x-1 px-3 py-1 rounded-full bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-[11px] font-bold transition hover:scale-105 active:scale-95"
                title="Keep all original text from Document A"
              >
                <XCircle className="w-3 h-3" />
                <span>Reject All (Doc A)</span>
              </button>

              <button
                type="button"
                onClick={handleResetAll}
                className="p-1.5 rounded-full bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-500 border border-slate-200 dark:border-white/[0.08] transition hover:scale-105"
                title="Reset all decisions to pending"
              >
                <RotateCcw className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Animated Progress Bar */}
          <div className="w-full h-2 rounded-full bg-slate-200/80 dark:bg-slate-800 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#FF5E1E] to-emerald-500 transition-all duration-300 rounded-full"
              style={{ width: `${percentResolved}%` }}
            />
          </div>
        </div>

        {/* Export & Download Bar */}
        <div className="flex flex-wrap items-center justify-between pt-2 border-t border-slate-200/60 dark:border-white/[0.06] gap-3">
          <div className="text-[11px] text-slate-400 font-medium">
            Ready to finalize? Export your clean, merged document with all decisions applied:
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleCopyMerged}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/[0.08] text-xs font-bold transition hover:scale-105 active:scale-95"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copied ? 'Copied' : 'Copy Text'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadTxt}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 hover:bg-slate-100 text-slate-700 dark:text-slate-200 border border-slate-200/80 dark:border-white/[0.08] text-xs font-bold transition hover:scale-105 active:scale-95"
            >
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Export .TXT</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadDocx}
              disabled={isExportingDocx}
              className="flex items-center space-x-1.5 px-4 py-1.5 rounded-full bg-[#FF5E1E] hover:bg-[#E04A0E] text-white text-xs font-bold transition shadow-sm hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExportingDocx ? 'Generating DOCX...' : 'Export Final .DOCX'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {activeSubTab === 'interactive' ? (
        /* Interactive Decision Stream */
        <div className="space-y-4">
          <div className="px-2 flex items-center justify-between text-xs text-slate-500">
            <span>Review each change below. Choose <strong>Accept</strong> to adopt Document B or <strong>Reject</strong> to keep Document A:</span>
            <span className="font-mono text-[11px]">{changeBlocks.length} decisions to make</span>
          </div>

          <div className="space-y-3.5">
            {changeBlocks.map((change) => {
              const currentChoice = decisions[change.id] || 'pending';
              const isAccepted = currentChoice === 'accepted';
              const isRejected = currentChoice === 'rejected';

              return (
                <div
                  key={change.id}
                  className={`p-4 sm:p-5 rounded-2xl border transition-all duration-200 ${
                    isAccepted
                      ? 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800 shadow-xs'
                      : isRejected
                        ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-300 dark:border-rose-800 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-white/[0.08] hover:border-slate-300 dark:hover:border-white/[0.15] shadow-sm'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100 dark:border-white/[0.06]">
                    <div className="flex items-center space-x-2">
                      <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center font-mono text-[11px] font-black">
                        #{change.changeNum}
                      </span>
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        {change.changeType}
                      </span>
                    </div>

                    {/* Status Pill */}
                    <div>
                      {isAccepted && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-300 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Accepted (Doc B adopted)
                        </span>
                      )}
                      {isRejected && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-300 flex items-center gap-1">
                          <X className="w-3 h-3" /> Rejected (Doc A preserved)
                        </span>
                      )}
                      {currentChoice === 'pending' && (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-amber-50 dark:bg-amber-950/40 text-amber-600 border border-amber-200">
                          Pending Decision
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Diff Comparison Side-by-Side or Stacked */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono mb-4">
                    {/* Doc A: Original */}
                    <div className="p-3 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200/80 dark:border-rose-900/50 space-y-1">
                      <div className="text-[10px] font-sans font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center justify-between">
                        <span>Document A (Original)</span>
                        {change.originalText && <span className="opacity-70">to be replaced</span>}
                      </div>
                      <div className="text-rose-800 dark:text-rose-200 line-through decoration-rose-500 whitespace-pre-wrap select-text leading-relaxed">
                        {change.originalText ? change.originalText : <span className="italic opacity-50 font-sans">[None &bull; text was added in B]</span>}
                      </div>
                    </div>

                    {/* Doc B: Revised */}
                    <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/80 dark:border-emerald-900/50 space-y-1">
                      <div className="text-[10px] font-sans font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center justify-between">
                        <span>Document B (Revised)</span>
                        {change.newText && <span className="opacity-70">proposed change</span>}
                      </div>
                      <div className="text-emerald-800 dark:text-emerald-200 font-bold whitespace-pre-wrap select-text leading-relaxed">
                        {change.newText ? change.newText : <span className="italic opacity-50 font-sans">[None &bull; text was deleted in B]</span>}
                      </div>
                    </div>
                  </div>

                  {/* Decision Buttons */}
                  <div className="flex items-center justify-end space-x-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handleDecision(change.id, 'rejected')}
                      className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        isRejected
                          ? 'bg-rose-600 text-white shadow-xs scale-105'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 hover:border-rose-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                      }`}
                    >
                      <X className="w-3.5 h-3.5" />
                      <span>Keep Original (Doc A)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDecision(change.id, 'accepted')}
                      className={`flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                        isAccepted
                          ? 'bg-emerald-600 text-white shadow-xs scale-105'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 hover:border-emerald-300 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Accept Revision (Doc B)</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Clean Document Preview */
        <div className="rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/[0.08] p-6 sm:p-8 space-y-4 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-white/[0.06]">
            <div>
              <h5 className="font-extrabold text-slate-900 dark:text-white text-sm">Resolved Document (Live Final Preview)</h5>
              <p className="text-xs text-slate-400">
                This is the exact final document that will be exported, with all your accept/reject choices applied.
              </p>
            </div>
            <span className="text-xs font-mono text-slate-400 font-semibold">
              {mergedDocumentText.split(/\s+/).filter(Boolean).length} words
            </span>
          </div>

          <div className="p-6 bg-slate-50/60 dark:bg-slate-950/60 rounded-2xl border border-slate-100 dark:border-white/[0.04] text-xs sm:text-sm font-mono whitespace-pre-wrap leading-relaxed select-text text-slate-800 dark:text-slate-200 max-h-[600px] overflow-y-auto">
            {mergedDocumentText}
          </div>
        </div>
      )}
    </div>
  );
}
