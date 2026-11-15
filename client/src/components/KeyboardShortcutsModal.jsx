import React from 'react';
import { X, Keyboard, Zap, Sparkles } from 'lucide-react';

export default function KeyboardShortcutsModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  const shortcuts = [
    { key: 'J / ↓', desc: 'Jump to Next Difference' },
    { key: 'K / ↑', desc: 'Jump to Previous Difference' },
    { key: 'A', desc: 'Accept Active Revision' },
    { key: 'R', desc: 'Reject Active Revision' },
    { key: 'Z', desc: 'Reset Active Revision to Pending' },
    { key: '1', desc: 'Switch to Side-by-Side View' },
    { key: '2', desc: 'Switch to Unified Redline View' },
    { key: '3', desc: 'Switch to Curtain Swipe Slider' },
    { key: '4', desc: 'Switch to Merge & Resolve Tab' },
    { key: 'M', desc: 'Toggle Audio Feedback Chimes' },
    { key: '?', desc: 'Toggle this Shortcuts Guide' },
    { key: 'Esc', desc: 'Close Modal or Drawer' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-white dark:bg-[#111726] border border-slate-200 dark:border-white/[0.1] rounded-3xl p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FF5E1E]/10 text-[#FF5E1E] flex items-center justify-center">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                Keyboard Shortcuts
              </h3>
              <p className="text-[11px] text-slate-400">
                Speed-run your document diff review hands-free
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-700 dark:hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shortcuts Grid */}
        <div className="grid grid-cols-1 gap-2.5 py-1">
          {shortcuts.map((s, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-white/[0.04] text-xs"
            >
              <span className="text-slate-600 dark:text-slate-300 font-medium">
                {s.desc}
              </span>
              <kbd className="px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/[0.1] text-slate-900 dark:text-white font-mono font-bold text-[11px] shadow-xs">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>

        <div className="pt-2 text-center text-[10px] text-slate-400 border-t border-slate-100 dark:border-white/[0.06]">
          Tip: You can press <kbd className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] font-mono">?</kbd> at any time to open this cheat sheet.
        </div>
      </div>
    </div>
  );
}
