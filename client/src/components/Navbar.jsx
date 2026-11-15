import React from 'react';
import { 
  FileDiff, 
  Sparkles, 
  Key, 
  Moon, 
  Sun, 
  Github,
  CheckCircle2,
  Cpu
} from 'lucide-react';

export default function Navbar({ apiKey, onOpenApiKeyModal, isDark, onToggleTheme, isComparing }) {
  return (
    <header className="sticky top-0 z-40 backdrop-blur-xl bg-dark-950/75 border-b border-white/[0.08] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3.5">
          <div className="relative group">
            <div className="absolute -inset-1 rounded-xl bg-gradient-to-r from-indigo-500 to-sky-500 opacity-60 blur-md group-hover:opacity-100 transition duration-300" />
            <div className="relative w-9 h-9 rounded-xl bg-dark-900 border border-white/20 flex items-center justify-center text-white shadow-xl">
              <FileDiff className="w-5 h-5 text-indigo-400 group-hover:scale-105 transition-transform" />
            </div>
          </div>

          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
                DocDiff <span className="bg-gradient-to-r from-indigo-400 to-sky-400 bg-clip-text text-transparent text-xs font-semibold uppercase tracking-wider">Pro</span>
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-mono font-medium rounded-md bg-white/[0.06] text-slate-300 border border-white/[0.08]">
                v1.2
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block font-normal">
              Enterprise Document & Contract Diff Intelligence
            </p>
          </div>
        </div>

        {/* Formats Pills */}
        <div className="hidden lg:flex items-center space-x-1.5 px-3 py-1 rounded-full bg-dark-900/90 border border-white/[0.06] text-[11px] text-slate-400 shadow-inner">
          <span className="text-slate-400 font-medium mr-1">Supported:</span>
          <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 font-mono font-medium">PDF</span>
          <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-mono font-medium">DOCX</span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-mono font-medium">XLSX</span>
          <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono font-medium">PPTX</span>
          <span className="px-2 py-0.5 rounded-full bg-slate-500/10 text-slate-300 border border-slate-500/20 font-mono font-medium">TXT</span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2.5">
          {/* AI Status Badge / Button */}
          <button
            onClick={onOpenApiKeyModal}
            className={`group relative flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-medium border transition-all duration-200 ${
              apiKey
                ? 'bg-gradient-to-r from-emerald-500/10 to-teal-500/10 border-emerald-500/30 text-emerald-300 hover:border-emerald-400 hover:shadow-glow-emerald'
                : 'bg-dark-900/90 border-white/[0.08] text-slate-300 hover:text-white hover:border-white/20'
            }`}
          >
            {apiKey ? (
              <>
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                </span>
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline font-medium">Gemini 2.5 Active</span>
                <span className="sm:hidden font-medium">AI Active</span>
              </>
            ) : (
              <>
                <Cpu className="w-3.5 h-3.5 text-slate-400 group-hover:text-sky-400 transition" />
                <span className="hidden sm:inline">Engine: Local (Offline)</span>
                <span className="sm:hidden">Local</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/[0.06] text-slate-400 font-mono">
                  + Key
                </span>
              </>
            )}
          </button>

          {/* GitHub Link */}
          <a
            href="https://github.com/yigermaladinew97-a11y/Document-Difference-checker"
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-xl bg-dark-900/90 border border-white/[0.08] text-slate-400 hover:text-white hover:border-white/20 transition"
            title="GitHub Repository"
          >
            <Github className="w-4 h-4" />
          </a>

          {/* Theme Toggle */}
          <button
            onClick={onToggleTheme}
            className="p-2 rounded-xl bg-dark-900/90 border border-white/[0.08] text-slate-400 hover:text-white hover:border-white/20 transition"
            aria-label="Toggle Theme"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-sky-400" />}
          </button>
        </div>
      </div>
    </header>
  );
}
