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
  Shield,
  Zap,
  CheckCircle2
} from 'lucide-react';

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
  onLoadSample
}) {
  const [tabA, setTabA] = useState('file'); // 'file' or 'text'
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
    let color = 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    if (ext === 'PDF') color = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
    if (ext === 'DOCX' || ext === 'DOC') color = 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    if (ext === 'XLSX' || ext === 'XLS' || ext === 'CSV') color = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (ext === 'PPTX' || ext === 'PPT') color = 'bg-amber-500/10 text-amber-400 border-amber-500/20';

    return (
      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border uppercase tracking-wider ${color}`}>
        {ext}
      </span>
    );
  };

  const getFormatIcon = (filename) => {
    const ext = filename?.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return <FileText className="w-7 h-7 text-rose-400" />;
      case 'docx':
      case 'doc': return <FileText className="w-7 h-7 text-blue-400" />;
      case 'xlsx':
      case 'xls':
      case 'csv': return <FileSpreadsheet className="w-7 h-7 text-emerald-400" />;
      case 'pptx':
      case 'ppt': return <Presentation className="w-7 h-7 text-amber-400" />;
      default: return <FileCode className="w-7 h-7 text-slate-400" />;
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
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-1">
        <div className="flex items-center space-x-2 text-xs text-slate-400">
          <Shield className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Compare any two formats: <strong className="text-slate-300">PDF vs Word</strong>, <strong className="text-slate-300">Excel vs Excel</strong>, or <strong className="text-slate-300">PPTX vs PPTX</strong>.</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onLoadSample}
            className="group relative inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-dark-900 border border-white/[0.08] hover:border-indigo-500/40 text-xs text-slate-300 hover:text-white transition-all shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 group-hover:rotate-12 transition-transform" />
            <span>Load Demo Contract (SLA v1 vs v2)</span>
          </button>
        </div>
      </div>

      {/* Dual Upload Cards Container */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
        {/* Central Swap Pill Button */}
        <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
          <button
            type="button"
            onClick={handleSwap}
            title="Swap Document A and Document B"
            className="p-3.5 rounded-2xl bg-dark-900 border border-white/10 text-slate-300 hover:text-white hover:border-indigo-500/50 hover:shadow-glow-indigo transition-all shadow-2xl backdrop-blur-xl group"
          >
            <ArrowLeftRight className={`w-4 h-4 text-indigo-400 group-hover:scale-110 transition-transform ${swapRotating ? 'rotate-180 transition-transform duration-500' : ''}`} />
          </button>
        </div>

        {/* --- DOCUMENT A (BASE / ORIGINAL) --- */}
        <div className="relative group rounded-3xl bg-dark-900/80 border border-white/[0.08] p-6 shadow-2xl backdrop-blur-xl flex flex-col justify-between transition-all hover:border-white/[0.12]">
          {/* Subtle Corner Ambient Glow */}
          <div className="absolute top-0 left-0 w-32 h-32 bg-sky-500/[0.03] rounded-tl-3xl pointer-events-none blur-xl" />

          <div>
            {/* Card Header */}
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-white/[0.06]">
              <div className="flex items-center space-x-3">
                <span className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-400 font-bold text-xs flex items-center justify-center border border-sky-500/20 font-mono shadow-inner">
                  A
                </span>
                <div>
                  <h3 className="font-semibold text-sm text-white">Document A &bull; Original Base</h3>
                  <p className="text-[11px] text-slate-400">Baseline version for comparison</p>
                </div>
              </div>

              {/* Input Type Switcher */}
              <div className="flex bg-dark-950 p-1 rounded-xl border border-white/[0.06] text-xs">
                <button
                  type="button"
                  onClick={() => setTabA('file')}
                  className={`px-3 py-1 rounded-lg font-medium transition ${
                    tabA === 'file' 
                      ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  File
                </button>
                <button
                  type="button"
                  onClick={() => setTabA('text')}
                  className={`px-3 py-1 rounded-lg font-medium transition ${
                    tabA === 'text' 
                      ? 'bg-gradient-to-r from-sky-500 to-indigo-600 text-white shadow-md' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Text
                </button>
              </div>
            </div>

            {/* Card Body */}
            {tabA === 'file' ? (
              fileA ? (
                <div className="p-4 rounded-2xl bg-dark-850/80 border border-white/[0.08] flex items-center justify-between shadow-inner">
                  <div className="flex items-center space-x-3.5 truncate">
                    <div className="p-2.5 rounded-xl bg-dark-900 border border-white/[0.06] shadow-sm">
                      {getFormatIcon(fileA.name)}
                    </div>
                    <div className="truncate">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-semibold text-white truncate">{fileA.name}</p>
                        {getFormatBadge(fileA.name)}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{formatFileSize(fileA.size)} &bull; Ready to parse</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFileA(null);
                      if (fileInputRefA.current) fileInputRefA.current.value = '';
                    }}
                    className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition"
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
                  className={`border-2 border-dashed rounded-2xl p-9 text-center cursor-pointer transition-all duration-200 ${
                    dragOverA
                      ? 'border-sky-500 bg-sky-500/10 scale-[1.01]'
                      : 'border-white/[0.08] hover:border-sky-500/40 bg-dark-950/40 hover:bg-dark-950/70'
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
                  <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-slate-200">
                    Drop Document A here, or <span className="text-sky-400 underline underline-offset-4">browse</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">PDF, DOCX, XLSX, PPTX, or TXT</p>
                </div>
              )
            ) : (
              <textarea
                value={textA}
                onChange={(e) => setTextA(e.target.value)}
                placeholder="Paste the original contract, specifications, or text content here..."
                rows={6}
                className="w-full p-3.5 bg-dark-950/60 border border-white/[0.08] rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/40 font-mono resize-y leading-relaxed"
              />
            )}
          </div>
        </div>

        {/* --- DOCUMENT B (COMPARISON / MODIFIED) --- */}
        <div className="relative group rounded-3xl bg-dark-900/80 border border-white/[0.08] p-6 shadow-2xl backdrop-blur-xl flex flex-col justify-between transition-all hover:border-white/[0.12]">
          {/* Subtle Corner Ambient Glow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/[0.03] rounded-tr-3xl pointer-events-none blur-xl" />

          <div>
            {/* Card Header */}
            <div className="flex items-center justify-between pb-4 mb-5 border-b border-white/[0.06]">
              <div className="flex items-center space-x-3">
                <span className="w-7 h-7 rounded-lg bg-indigo-500/10 text-indigo-400 font-bold text-xs flex items-center justify-center border border-indigo-500/20 font-mono shadow-inner">
                  B
                </span>
                <div>
                  <h3 className="font-semibold text-sm text-white">Document B &bull; Comparison Target</h3>
                  <p className="text-[11px] text-slate-400">Revised or candidate document</p>
                </div>
              </div>

              {/* Input Type Switcher */}
              <div className="flex bg-dark-950 p-1 rounded-xl border border-white/[0.06] text-xs">
                <button
                  type="button"
                  onClick={() => setTabB('file')}
                  className={`px-3 py-1 rounded-lg font-medium transition ${
                    tabB === 'file' 
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  File
                </button>
                <button
                  type="button"
                  onClick={() => setTabB('text')}
                  className={`px-3 py-1 rounded-lg font-medium transition ${
                    tabB === 'text' 
                      ? 'bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-md' 
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Text
                </button>
              </div>
            </div>

            {/* Card Body */}
            {tabB === 'file' ? (
              fileB ? (
                <div className="p-4 rounded-2xl bg-dark-850/80 border border-white/[0.08] flex items-center justify-between shadow-inner">
                  <div className="flex items-center space-x-3.5 truncate">
                    <div className="p-2.5 rounded-xl bg-dark-900 border border-white/[0.06] shadow-sm">
                      {getFormatIcon(fileB.name)}
                    </div>
                    <div className="truncate">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-semibold text-white truncate">{fileB.name}</p>
                        {getFormatBadge(fileB.name)}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{formatFileSize(fileB.size)} &bull; Ready to parse</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFileB(null);
                      if (fileInputRefB.current) fileInputRefB.current.value = '';
                    }}
                    className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition"
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
                  className={`border-2 border-dashed rounded-2xl p-9 text-center cursor-pointer transition-all duration-200 ${
                    dragOverB
                      ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01]'
                      : 'border-white/[0.08] hover:border-indigo-500/40 bg-dark-950/40 hover:bg-dark-950/70'
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
                  <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Upload className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-semibold text-slate-200">
                    Drop Document B here, or <span className="text-indigo-400 underline underline-offset-4">browse</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">PDF, DOCX, XLSX, PPTX, or TXT</p>
                </div>
              )
            ) : (
              <textarea
                value={textB}
                onChange={(e) => setTextB(e.target.value)}
                placeholder="Paste the revised or comparison text content here..."
                rows={6}
                className="w-full p-3.5 bg-dark-950/60 border border-white/[0.08] rounded-2xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 font-mono resize-y leading-relaxed"
              />
            )}
          </div>
        </div>
      </div>

      {/* Main Compare Action */}
      <div className="flex flex-col items-center justify-center pt-2 space-y-3">
        <button
          type="button"
          onClick={onCompare}
          disabled={!isReady || isComparing}
          className={`relative group px-10 py-4 rounded-2xl font-bold text-sm shadow-2xl flex items-center space-x-3 transition-all duration-300 ${
            isReady && !isComparing
              ? 'bg-gradient-to-r from-indigo-500 via-sky-500 to-indigo-600 hover:from-indigo-400 hover:to-sky-500 text-white shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-[1.02] cursor-pointer'
              : 'bg-dark-900 text-slate-600 border border-white/[0.05] cursor-not-allowed shadow-none'
          }`}
        >
          {isComparing ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Analyzing Document Differences & Context...</span>
            </>
          ) : (
            <>
              <Zap className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
              <span>Execute Deep Comparison</span>
            </>
          )}
        </button>

        {!isReady && (
          <p className="text-[11px] text-slate-500">
            Please supply both Document A and Document B to begin comparison
          </p>
        )}
      </div>
    </div>
  );
}
