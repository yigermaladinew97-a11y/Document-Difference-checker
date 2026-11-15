import React, { useState, useMemo, useRef } from 'react';
import {
  Clock,
  X,
  Search,
  Trash2,
  Download,
  Upload,
  ArrowRight,
  FileText,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Layers,
  Sparkles,
  ExternalLink
} from 'lucide-react';
import { deleteSession, clearAllSessions, exportHistoryToJson, importHistoryFromJson } from '../utils/historyStorage';

export default function HistoryDrawer({
  isOpen,
  onClose,
  sessions = [],
  onRestoreSession,
  onSessionsChange
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState(null);
  const fileInputRef = useRef(null);

  // Format relative timestamp
  const formatTimeAgo = (isoString) => {
    if (!isoString) return 'Earlier';
    const date = new Date(isoString);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);

    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;

    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    });
  };

  // Filter sessions by search query
  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return sessions;
    const q = searchQuery.toLowerCase();
    return sessions.filter((s) => {
      const titleMatch = s.title?.toLowerCase().includes(q);
      const docAMatch = s.meta?.docA?.filename?.toLowerCase().includes(q);
      const docBMatch = s.meta?.docB?.filename?.toLowerCase().includes(q);
      return titleMatch || docAMatch || docBMatch;
    });
  }, [sessions, searchQuery]);

  // Handle single deletion
  const handleDelete = async (id, e) => {
    e.stopPropagation();
    await deleteSession(id);
    if (onSessionsChange) onSessionsChange();
  };

  // Handle clear all
  const handleClearAll = async () => {
    await clearAllSessions();
    setIsConfirmingClear(false);
    if (onSessionsChange) onSessionsChange();
  };

  // Handle Export Backup
  const handleExport = async () => {
    await exportHistoryToJson();
    showFeedback('History backup downloaded.');
  };

  // Handle Import Backup
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const count = await importHistoryFromJson(text);
      showFeedback(`Successfully restored ${count} comparisons!`);
      if (onSessionsChange) onSessionsChange();
    } catch (err) {
      showFeedback('Invalid backup file format.', true);
    } finally {
      if (e.target) e.target.value = '';
    }
  };

  const showFeedback = (msg, isError = false) => {
    setFeedbackMsg({ text: msg, isError });
    setTimeout(() => setFeedbackMsg(null), 3000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none animate-in fade-in duration-200">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md sm:max-w-lg bg-white dark:bg-[#111726] border-l border-slate-200 dark:border-white/[0.08] shadow-2xl flex flex-col">
          
          {/* Header Strip */}
          <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/60 dark:bg-slate-900/60 flex items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-2xl bg-[#FFF4EF] dark:bg-[#FF5E1E]/15 text-[#FF5E1E] flex items-center justify-center shadow-xs">
                <Clock className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white tracking-tight">
                    Comparison History
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FF5E1E]/10 text-[#FF5E1E] border border-[#FF5E1E]/20">
                    {sessions.length} Saved
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium">
                  Private on-device storage • Reopen past diffs &amp; decisions
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Close drawer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Action Sub-Toolbar: Search + Backup actions */}
          <div className="px-5 py-3 border-b border-slate-100 dark:border-white/[0.06] bg-white dark:bg-slate-950 flex items-center justify-between gap-2.5">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search past comparisons..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/[0.08] rounded-full text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF5E1E]/30 font-medium"
              />
            </div>

            {/* Backup / Export / Import Buttons */}
            <div className="flex items-center space-x-1 shrink-0">
              <button
                type="button"
                onClick={handleExport}
                className="p-1.5 rounded-full bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/[0.08] transition"
                title="Export JSON Backup of History"
              >
                <Download className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleImportClick}
                className="p-1.5 rounded-full bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/[0.08] transition"
                title="Import JSON Backup file"
              >
                <Upload className="w-3.5 h-3.5" />
              </button>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".json"
                className="hidden"
              />

              {sessions.length > 0 && (
                <>
                  {isConfirmingClear ? (
                    <div className="flex items-center space-x-1 ml-1 animate-in fade-in">
                      <button
                        type="button"
                        onClick={handleClearAll}
                        className="px-2 py-1 rounded-full text-[10px] font-bold bg-rose-600 text-white shadow-xs"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsConfirmingClear(false)}
                        className="px-2 py-1 rounded-full text-[10px] font-bold bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsConfirmingClear(true)}
                      className="p-1.5 rounded-full hover:bg-rose-50 dark:hover:bg-rose-950/40 text-slate-400 hover:text-rose-500 transition"
                      title="Clear all comparison history"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Feedback Toast Banner */}
          {feedbackMsg && (
            <div
              className={`px-5 py-2 text-xs font-bold flex items-center space-x-2 transition-all ${
                feedbackMsg.isError
                  ? 'bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400'
                  : 'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{feedbackMsg.text}</span>
            </div>
          )}

          {/* Sessions List Stream */}
          <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
            {filteredSessions.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-900 text-slate-400 mx-auto flex items-center justify-center">
                  <Clock className="w-6 h-6 stroke-[1.5]" />
                </div>
                <h4 className="font-extrabold text-sm text-slate-800 dark:text-slate-200">
                  {searchQuery ? 'No matching comparisons found' : 'No saved comparisons yet'}
                </h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                  {searchQuery
                    ? 'Try searching with another file name or keyword.'
                    : 'Whenever you compare documents, they will be automatically preserved here so you never lose your work.'}
                </p>
              </div>
            ) : (
              filteredSessions.map((session) => {
                const docA = session.meta?.docA || {};
                const docB = session.meta?.docB || {};
                const stats = session.stats || {};
                const sim = session.similarityPercent || stats.similarityPercent || 0;
                const decisionsCount = Object.keys(session.decisions || {}).length;

                return (
                  <div
                    key={session.id}
                    onClick={() => {
                      onRestoreSession(session);
                      onClose();
                    }}
                    className="group relative p-4 rounded-2xl border border-slate-200/80 dark:border-white/[0.08] bg-white dark:bg-slate-900/70 hover:border-[#FF5E1E] dark:hover:border-[#FF5E1E] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer space-y-3"
                  >
                    {/* Top Row: File titles & Similarity Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-900 dark:text-white truncate">
                          <span className="truncate">{docA.filename || 'Doc A'}</span>
                          <span className="text-slate-400 text-[10px] font-normal">&bull;</span>
                          <span className="truncate text-[#FF5E1E]">{docB.filename || 'Doc B'}</span>
                        </div>
                        <p className="text-[11px] text-slate-400 font-medium">
                          {formatTimeAgo(session.timestamp || session.savedAt)}
                        </p>
                      </div>

                      {/* Similarity Badge */}
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase shrink-0 ${
                          sim === 100
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800'
                            : sim >= 60
                            ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                            : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                        }`}
                      >
                        {sim}% MATCH
                      </span>
                    </div>

                    {/* Middle Row: Formats and stats tags */}
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-mono font-semibold">
                      {docA.format && (
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase">
                          {docA.format}
                        </span>
                      )}
                      {docB.format && docB.format !== docA.format && (
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 uppercase">
                          {docB.format}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                        +{stats.addedWords || 0}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400">
                        -{stats.deletedWords || 0}
                      </span>
                      {decisionsCount > 0 && (
                        <span className="px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-300 font-sans font-bold">
                          {decisionsCount} decisions
                        </span>
                      )}
                    </div>

                    {/* Bottom Action Footer */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-white/[0.04]">
                      <span className="text-[11px] font-bold text-[#FF5E1E] flex items-center space-x-1 group-hover:translate-x-1 transition-transform">
                        <span>Restore Session</span>
                        <ArrowRight className="w-3 h-3" />
                      </span>

                      <button
                        type="button"
                        onClick={(e) => handleDelete(session.id, e)}
                        className="p-1 rounded-full text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition opacity-0 group-hover:opacity-100"
                        title="Delete this session"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Info Strip */}
          <div className="p-4 border-t border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-slate-900/40 text-center text-[11px] text-slate-400 font-medium">
            Stored privately in your browser's IndexedDB. Export a backup to transfer across devices.
          </div>
        </div>
      </div>
    </div>
  );
}
