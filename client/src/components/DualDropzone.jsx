import React, { useRef, useState } from 'react';
import { 
  Upload, 
  FileText, 
  ArrowLeftRight, 
  Trash2, 
  FileCheck, 
  Sparkles,
  FileSpreadsheet,
  Presentation,
  FileCode,
  ArrowRight,
  Shield,
  Layers,
  Zap
} from 'lucide-react';
import TiltCard from './TiltCard';
import NoiseFiltersBar from './NoiseFiltersBar';

export default function DualDropzone({
  fileA,
  setFileA,
  textA,
  setTextA,
  fileB,
  setFileB,
  textB,
  setTextB,
  onCompare,
  isComparing,
  onLoadSample,
  filters,
  onFilterChange
}) {
  const [tabA, setTabA] = useState('file');
  const [tabB, setTabB] = useState('file');
  const [dragOverA, setDragOverA] = useState(false);
  const [dragOverB, setDragOverB] = useState(false);
  const [swapRotating, setSwapRotating] = useState(false);

  const fileInputRefA = useRef(null);
  const fileInputRefB = useRef(null);

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const getFormatBadge = (filename) => {
    const ext = filename?.split('.').pop()?.toUpperCase() || 'FILE';
    let color = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
    if (ext === 'PDF') color = 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800';
    if (ext === 'DOCX' || ext === 'DOC') color = 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-800';
    if (ext === 'XLSX' || ext === 'XLS' || ext === 'CSV') color = 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800';
    if (ext === 'PPTX' || ext === 'PPT') color = 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800';

    return (
      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${color}`}>
        {ext}
      </span>
    );
  };

  const getFormatIcon = (filename) => {
    const ext = filename?.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return <FileText className="w-8 h-8 text-rose-500" />;
      case 'docx':
      case 'doc': return <FileText className="w-8 h-8 text-blue-500" />;
      case 'xlsx':
      case 'xls':
      case 'csv': return <FileSpreadsheet className="w-8 h-8 text-emerald-500" />;
      case 'pptx':
      case 'ppt': return <Presentation className="w-8 h-8 text-amber-500" />;
      default: return <FileCode className="w-8 h-8 text-[#FF5E1E]" />;
    }
  };

  const handleSwap = () => {
    setSwapRotating(true);
    setTimeout(() => setSwapRotating(false), 500);

    const tempFile = fileA;
    const tempText = textA;
    const tempTab = tabA;

    setFileA(fileB);
    setTextA(textB);
    setTabA(tabB);

    setFileB(tempFile);
    setTextB(tempText);
    setTabB(tempTab);
  };

  const handleDrop = (e, target) => {
    e.preventDefault();
    if (target === 'A') {
      setDragOverA(false);
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        setFileA(e.dataTransfer.files[0]);
        setTabA('file');
      }
    } else {
      setDragOverB(false);
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        setFileB(e.dataTransfer.files[0]);
        setTabB('file');
      }
    }
  };

  const isReady = (fileA || (textA && textA.trim())) && (fileB || (textB && textB.trim()));

  return (
    <div className="space-y-6">
      {/* Sample Quick Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-2">
        <div className="flex items-center space-x-2 text-xs font-medium text-slate-500 dark:text-slate-400">
          <span className="w-2 h-2 rounded-full bg-[#FF5E1E] animate-ping" />
          <span>Upload any pair of files (<span className="text-slate-900 dark:text-white font-semibold">PDF, Word, Excel, PPTX, or TXT</span>) to compare.</span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider hidden md:inline">
            1-Click Demo:
          </span>
          <button
            type="button"
            onClick={() => onLoadSample && onLoadSample('contract')}
            className="group inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/[0.1] hover:border-[#FF5E1E]/50 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-[#FF5E1E] transition shadow-xs hover:-translate-y-0.5"
            title="Load Master Services Agreement with pricing & warranty revisions"
          >
            <span>📜 Contract (v1 vs v2)</span>
          </button>
          <button
            type="button"
            onClick={() => onLoadSample && onLoadSample('spreadsheet')}
            className="group inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/[0.1] hover:border-emerald-500/50 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-emerald-600 dark:hover:text-emerald-400 transition shadow-xs hover:-translate-y-0.5"
            title="Load Financial Ledger with numerical drifts & added rows"
          >
            <span>📊 Financials (.csv/Excel)</span>
          </button>
          <button
            type="button"
            onClick={() => onLoadSample && onLoadSample('tech')}
            className="group inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/[0.1] hover:border-blue-500/50 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-blue-600 dark:hover:text-blue-400 transition shadow-xs hover:-translate-y-0.5"
            title="Load API architecture specification changes"
          >
            <span>⚡ API Spec</span>
          </button>
        </div>
      </div>

      {/* Dual 3D Tilt Cards Container */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
        {/* Central Floating Swap Button with Hover Physics */}
        <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
          <button
            type="button"
            onClick={handleSwap}
            title="Swap Document A and Document B"
            className="p-4 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/[0.15] text-slate-700 dark:text-slate-200 hover:text-[#FF5E1E] hover:border-[#FF5E1E]/50 hover:shadow-xl hover:scale-110 active:scale-95 transition-all duration-200 shadow-lg group cursor-pointer"
          >
            <ArrowLeftRight className={`w-5 h-5 transition-transform duration-500 ${swapRotating ? 'rotate-180 text-[#FF5E1E]' : ''}`} />
          </button>
        </div>

        {/* --- DOCUMENT A (ORIGINAL) 3D TILT CARD --- */}
        <TiltCard
          maxTilt={4}
          glowColor="rgba(255, 94, 30, 0.08)"
          className="rounded-[32px] bg-white dark:bg-[#111726] border border-slate-200/80 dark:border-white/[0.08] p-7 shadow-card hover:shadow-clean-hover transition-shadow duration-300 flex flex-col justify-between"
        >
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100 dark:border-white/[0.06]">
              <div className="flex items-center space-x-3">
                <span className="w-8 h-8 rounded-xl bg-[#FFF4EF] dark:bg-[#FF5E1E]/15 text-[#FF5E1E] font-black text-xs flex items-center justify-center font-mono shadow-sm">
                  A
                </span>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Document A &bull; Original Base</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Original baseline document</p>
                </div>
              </div>

              {/* Segmented control */}
              <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-full text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setTabA('file')}
                  className={`px-3.5 py-1 rounded-full transition-all duration-200 ${
                    tabA === 'file' 
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm scale-100' 
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  File
                </button>
                <button
                  type="button"
                  onClick={() => setTabA('text')}
                  className={`px-3.5 py-1 rounded-full transition-all duration-200 ${
                    tabA === 'text' 
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm scale-100' 
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Text
                </button>
              </div>
            </div>

            {/* Content Area */}
            {tabA === 'file' ? (
              fileA ? (
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/[0.06] flex items-center justify-between shadow-sm animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center space-x-3.5 truncate">
                    <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 shadow-sm">
                      {getFormatIcon(fileA.name)}
                    </div>
                    <div className="truncate">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{fileA.name}</p>
                        {getFormatBadge(fileA.name)}
                      </div>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">{formatFileSize(fileA.size)} &bull; Ready to process</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFileA(null);
                      if (fileInputRefA.current) fileInputRefA.current.value = '';
                    }}
                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition hover:scale-110"
                    title="Remove file"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOverA(true); }}
                  onDragLeave={() => setDragOverA(false)}
                  onDrop={(e) => handleDrop(e, 'A')}
                  onClick={() => fileInputRefA.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 group ${
                    dragOverA
                      ? 'border-[#FF5E1E] bg-[#FFF4EF] dark:bg-[#FF5E1E]/10 scale-[1.02] shadow-orange-soft'
                      : 'border-slate-200 dark:border-white/[0.1] hover:border-[#FF5E1E] bg-slate-50/50 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-900/70 hover:shadow-md'
                  }`}
                >
                  <input
                    ref={fileInputRefA}
                    type="file"
                    accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.txt,.md,.json,.csv"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) setFileA(e.target.files[0]);
                    }}
                  />
                  <div className="w-14 h-14 mx-auto mb-3.5 rounded-2xl bg-[#FFF4EF] dark:bg-[#FF5E1E]/15 flex items-center justify-center text-[#FF5E1E] shadow-sm group-hover:scale-110 group-hover:-translate-y-1 transition-transform duration-300">
                    <Upload className="w-6 h-6 stroke-[2.2]" />
                  </div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-[#FF5E1E] transition-colors">
                    Drop original document here, or <span className="underline underline-offset-4">browse</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-1 font-medium">Supports PDF, Word, Excel, PPTX, or TXT</p>
                </div>
              )
            ) : (
              <textarea
                value={textA}
                onChange={(e) => setTextA(e.target.value)}
                placeholder="Paste original contract, specification, or text content here..."
                rows={6}
                className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/[0.08] rounded-2xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF5E1E]/30 font-mono resize-y leading-relaxed"
              />
            )}
          </div>
        </TiltCard>

        {/* --- DOCUMENT B (COMPARISON) 3D TILT CARD --- */}
        <TiltCard
          maxTilt={4}
          glowColor="rgba(255, 94, 30, 0.08)"
          className="rounded-[32px] bg-white dark:bg-[#111726] border border-slate-200/80 dark:border-white/[0.08] p-7 shadow-card hover:shadow-clean-hover transition-shadow duration-300 flex flex-col justify-between"
        >
          <div>
            {/* Header */}
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100 dark:border-white/[0.06]">
              <div className="flex items-center space-x-3">
                <span className="w-8 h-8 rounded-xl bg-orange-100 dark:bg-orange-500/15 text-orange-600 dark:text-orange-400 font-black text-xs flex items-center justify-center font-mono shadow-sm">
                  B
                </span>
                <div>
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Document B &bull; Comparison Target</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Revised candidate document</p>
                </div>
              </div>

              {/* Segmented control */}
              <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-full text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setTabB('file')}
                  className={`px-3.5 py-1 rounded-full transition-all duration-200 ${
                    tabB === 'file' 
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm scale-100' 
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  File
                </button>
                <button
                  type="button"
                  onClick={() => setTabB('text')}
                  className={`px-3.5 py-1 rounded-full transition-all duration-200 ${
                    tabB === 'text' 
                      ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm scale-100' 
                      : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                  }`}
                >
                  Text
                </button>
              </div>
            </div>

            {/* Content Area */}
            {tabB === 'file' ? (
              fileB ? (
                <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/[0.06] flex items-center justify-between shadow-sm animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex items-center space-x-3.5 truncate">
                    <div className="p-3 rounded-2xl bg-white dark:bg-slate-800 shadow-sm">
                      {getFormatIcon(fileB.name)}
                    </div>
                    <div className="truncate">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{fileB.name}</p>
                        {getFormatBadge(fileB.name)}
                      </div>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">{formatFileSize(fileB.size)} &bull; Ready to process</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFileB(null);
                      if (fileInputRefB.current) fileInputRefB.current.value = '';
                    }}
                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition hover:scale-110"
                    title="Remove file"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOverB(true); }}
                  onDragLeave={() => setDragOverB(false)}
                  onDrop={(e) => handleDrop(e, 'B')}
                  onClick={() => fileInputRefB.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 group ${
                    dragOverB
                      ? 'border-[#FF5E1E] bg-[#FFF4EF] dark:bg-[#FF5E1E]/10 scale-[1.02] shadow-orange-soft'
                      : 'border-slate-200 dark:border-white/[0.1] hover:border-[#FF5E1E] bg-slate-50/50 dark:bg-slate-900/40 hover:bg-white dark:hover:bg-slate-900/70 hover:shadow-md'
                  }`}
                >
                  <input
                    ref={fileInputRefB}
                    type="file"
                    accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt,.txt,.md,.json,.csv"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) setFileB(e.target.files[0]);
                    }}
                  />
                  <div className="w-14 h-14 mx-auto mb-3.5 rounded-2xl bg-[#FFF4EF] dark:bg-[#FF5E1E]/15 flex items-center justify-center text-[#FF5E1E] shadow-sm group-hover:scale-110 group-hover:-translate-y-1 transition-transform duration-300">
                    <Upload className="w-6 h-6 stroke-[2.2]" />
                  </div>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-100 group-hover:text-[#FF5E1E] transition-colors">
                    Drop revised document here, or <span className="underline underline-offset-4">browse</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-1 font-medium">Supports PDF, Word, Excel, PPTX, or TXT</p>
                </div>
              )
            ) : (
              <textarea
                value={textB}
                onChange={(e) => setTextB(e.target.value)}
                placeholder="Paste revised contract, specification, or text content here..."
                rows={6}
                className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/[0.08] rounded-2xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF5E1E]/30 font-mono resize-y leading-relaxed"
              />
            )}
          </div>
        </TiltCard>
      </div>

      {/* Smart Noise Filters Control Strip */}
      {filters && onFilterChange && (
        <div className="pt-1">
          <NoiseFiltersBar
            filters={filters}
            onFilterChange={onFilterChange}
            onApply={(newFilters) => onCompare && onCompare(newFilters)}
            isComparing={isComparing}
          />
        </div>
      )}

      {/* Main Compare Action with Animated Glow & Ripple */}
      <div className="flex flex-col items-center justify-center pt-3 space-y-3">
        <button
          type="button"
          onClick={() => onCompare && onCompare()}
          disabled={!isReady || isComparing}
          className={`group relative inline-flex items-center space-x-4 px-9 py-4 rounded-full font-bold text-sm transition-all duration-300 overflow-hidden ${
            isReady && !isComparing
              ? 'bg-[#FF5E1E] hover:bg-[#E04A0E] text-white hover:scale-105 active:scale-95 shadow-orange-soft hover:shadow-orange-glow cursor-pointer'
              : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none'
          }`}
        >
          {/* Subtle Light Shimmer Sweep */}
          {isReady && !isComparing && (
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
          )}

          {isComparing ? (
            <>
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Analyzing Document Differences & Context...</span>
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 text-white group-hover:rotate-12 transition-transform" />
              <span>Execute Deep Comparison</span>
              <span className="w-8 h-8 rounded-full bg-white text-[#FF5E1E] flex items-center justify-center shadow-md group-hover:translate-x-1.5 transition-transform duration-200">
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </span>
            </>
          )}
        </button>

        {!isReady && (
          <p className="text-xs text-slate-400 font-medium">
            Please provide both Document A and Document B to run comparison
          </p>
        )}
      </div>
    </div>
  );
}
