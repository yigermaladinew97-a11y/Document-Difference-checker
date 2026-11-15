import React from 'react';
import { 
  FileDiff, 
  Sparkles, 
  Key, 
  Moon, 
  Sun, 
  Github,
  ArrowRight,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';

export default function Navbar({ apiKey, onOpenApiKeyModal, isDark, onToggleTheme, isComparing }) {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-white/85 dark:bg-[#0B0F19]/85 border-b border-slate-200/80 dark:border-white/[0.08] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#FF5E1E] to-[#FF8A50] flex items-center justify-center text-white shadow-lg shadow-[#FF5E1E]/25">
            <FileDiff className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-extrabold text-lg tracking-tight text-slate-900 dark:text-white">
                Doc<span className="text-[#FF5E1E]">Diff</span>
              </span>
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-[#FF5E1E]/10 text-[#FF5E1E] border border-[#FF5E1E]/20">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block font-medium">
              Document Difference & Context Studio
            </p>
          </div>
        </div>

        {/* Supported Formats Chips (Cambased Minimalist Style) */}
        <div className="hidden md:flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full bg-slate-100 dark:bg-slate-900 border border-slate-200/60 dark:border-white/[0.06] text-xs">
          <span className="text-slate-500 dark:text-slate-400 font-semibold text-[11px] mr-1">Formats:</span>
          <span className="px-2.5 py-0.5 rounded-full bg-white dark:bg-slate-800 text-rose-500 font-bold text-[11px] shadow-sm">PDF</span>
          <span className="px-2.5 py-0.5 rounded-full bg-white dark:bg-slate-800 text-blue-500 font-bold text-[11px] shadow-sm">DOCX</span>
          <span className="px-2.5 py-0.5 rounded-full bg-white dark:bg-slate-800 text-emerald-500 font-bold text-[11px] shadow-sm">XLSX</span>
          <span className="px-2.5 py-0.5 rounded-full bg-white dark:bg-slate-800 text-amber-500 font-bold text-[11px] shadow-sm">PPTX</span>
          <span className="px-2.5 py-0.5 rounded-full bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-[11px] shadow-sm">TXT</span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3">
          {/* AI Settings Pill Button (Matching Cambased pill button) */}
          <button
            onClick={onOpenApiKeyModal}
            className={`group flex items-center space-x-2 pl-3.5 pr-2 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 shadow-sm ${
              apiKey
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-white/[0.1] text-slate-700 dark:text-slate-200 hover:border-[#FF5E1E]/50 hover:text-[#FF5E1E]'
            }`}
          >
            {apiKey ? (
              <>
                <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                <span>Gemini 2.5 Active</span>
                <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center ml-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </span>
              </>
            ) : (
              <>
                <Key className="w-3.5 h-3.5 text-[#FF5E1E]" />
                <span>AI Key Settings</span>
                <span className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-[#FF5E1E] group-hover:text-white flex items-center justify-center transition-colors ml-1">
                  <ArrowRight className="w-3 h-3" />
                </span>
              </>
            )}
          </button>

          {/* GitHub Repo */}
          <a
            href="https://github.com/yigermaladinew97-a11y/Document-Difference-checker"
            target="_blank"
            rel="noreferrer"
            className="p-2.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/[0.1] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 transition shadow-sm"
            title="GitHub Repository"
          >
            <Github className="w-4 h-4" />
          </a>

          {/* Theme Toggle */}
          <button
            onClick={onToggleTheme}
            className="p-2.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/[0.1] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:border-slate-300 transition shadow-sm"
            aria-label="Toggle Theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>
        </div>
      </div>
    </header>
  );
}
