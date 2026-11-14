import React from 'react';
import { 
  FileDiff, 
  Sparkles, 
  Key, 
  Moon, 
  Sun, 
  FileText, 
  Table, 
  Presentation, 
  CheckCircle2 
} from 'lucide-react';

export default function Navbar({ apiKey, onOpenApiKeyModal, isDark, onToggleTheme, isComparing }) {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-slate-900/80 border-b border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20 text-white">
            <FileDiff className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg tracking-tight text-white">DocDiff</span>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                v1.0
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">Intelligent Multi-Format Document Comparison</p>
          </div>
        </div>

        {/* Supported Formats Pills */}
        <div className="hidden md:flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-800/60 border border-slate-700/50 text-xs text-slate-400">
          <span className="font-medium text-slate-300">Formats:</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded bg-red-500/10 text-red-400 font-mono text-[11px]">PDF</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 font-mono text-[11px]">DOCX</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[11px]">XLSX</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-mono text-[11px]">PPTX</span>
          <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-500/10 text-slate-300 font-mono text-[11px]">TXT</span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3">
          {/* AI Status Button */}
          <button
            onClick={onOpenApiKeyModal}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
              apiKey
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
            title="Configure Gemini AI Key"
          >
            {apiKey ? (
              <>
                <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                <span className="hidden sm:inline">AI Active (Gemini)</span>
                <span className="sm:hidden">AI On</span>
              </>
            ) : (
              <>
                <Key className="w-3.5 h-3.5 text-slate-400" />
                <span className="hidden sm:inline">Set Gemini API Key</span>
                <span className="sm:hidden">API Key</span>
              </>
            )}
          </button>

          {/* Theme Toggle */}
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-400 hover:text-white hover:bg-slate-700 transition"
            aria-label="Toggle Theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-sky-400" />}
          </button>
        </div>
      </div>
    </header>
  );
}
