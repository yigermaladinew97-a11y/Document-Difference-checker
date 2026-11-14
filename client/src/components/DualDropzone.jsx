import React, { useRef, useState } from 'react';
import { 
  Upload, 
  FileText, 
  ArrowLeftRight, 
  Trash2, 
  FileCheck, 
  Type, 
  Sparkles,
  FileSpreadsheet,
  Presentation,
  FileCode
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

  const fileInputRefA = useRef(null);
  const fileInputRefB = useRef(null);

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const getFormatIcon = (filename) => {
    const ext = filename?.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf': return <FileText className="w-8 h-8 text-red-400" />;
      case 'docx':
      case 'doc': return <FileText className="w-8 h-8 text-blue-400" />;
      case 'xlsx':
      case 'xls':
      case 'csv': return <FileSpreadsheet className="w-8 h-8 text-emerald-400" />;
      case 'pptx':
      case 'ppt': return <Presentation className="w-8 h-8 text-amber-400" />;
      default: return <FileCode className="w-8 h-8 text-slate-400" />;
    }
  };

  const handleSwap = () => {
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
      {/* Sample Loader Bar */}
      <div className="flex items-center justify-between px-1">
        <div className="text-xs text-slate-400">
          Upload any pair of <span className="text-slate-200 font-medium">PDF, Word, Excel, PowerPoint</span> or plain text files.
        </div>
        <button
          type="button"
          onClick={onLoadSample}
          className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs text-sky-400 hover:text-sky-300 transition"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Load Sample Contract Demo</span>
        </button>
      </div>

      {/* Dual Cards Container */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative">
        {/* Swap Button In Center */}
        <div className="hidden lg:flex absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
          <button
            type="button"
            onClick={handleSwap}
            title="Swap Document A and Document B"
            className="p-3 rounded-full bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 hover:scale-110 shadow-xl transition-all"
          >
            <ArrowLeftRight className="w-5 h-5" />
          </button>
        </div>

        {/* --- DOCUMENT A (ORIGINAL) --- */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-400 font-bold text-xs flex items-center justify-center border border-sky-500/30">
                  A
                </span>
                <h3 className="font-semibold text-sm text-white">Original Document (Base)</h3>
              </div>
              <div className="flex bg-slate-800/80 p-0.5 rounded-lg border border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => setTabA('file')}
                  className={`px-2.5 py-1 rounded-md font-medium transition ${
                    tabA === 'file' ? 'bg-sky-500 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  File
                </button>
                <button
                  type="button"
                  onClick={() => setTabA('text')}
                  className={`px-2.5 py-1 rounded-md font-medium transition ${
                    tabA === 'text' ? 'bg-sky-500 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Paste
                </button>
              </div>
            </div>

            {tabA === 'file' ? (
              fileA ? (
                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 flex items-center justify-between">
                  <div className="flex items-center space-x-3 truncate">
                    {getFormatIcon(fileA.name)}
                    <div className="truncate">
                      <p className="text-sm font-semibold text-white truncate">{fileA.name}</p>
                      <p className="text-xs text-slate-400">{formatFileSize(fileA.size)}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFileA(null);
                      if (fileInputRefA.current) fileInputRefA.current.value = '';
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
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
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                    dragOverA
                      ? 'border-sky-500 bg-sky-500/10 scale-[1.01]'
                      : 'border-slate-700/80 hover:border-slate-600 bg-slate-800/30 hover:bg-slate-800/50'
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
                  <Upload className="w-9 h-9 mx-auto text-slate-400 mb-2" />
                  <p className="text-sm font-medium text-slate-200">
                    Drop Document A here, or <span className="text-sky-400">browse</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">PDF, Word, Excel, PPT, or TXT</p>
                </div>
              )
            ) : (
              <textarea
                value={textA}
                onChange={(e) => setTextA(e.target.value)}
                placeholder="Paste the original text content here..."
                rows={5}
                className="w-full p-3 bg-slate-800/60 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-sky-500/50 font-mono resize-y"
              />
            )}
          </div>
        </div>

        {/* --- DOCUMENT B (COMPARISON) --- */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center border border-indigo-500/30">
                  B
                </span>
                <h3 className="font-semibold text-sm text-white">Modified Document (Comparison)</h3>
              </div>
              <div className="flex bg-slate-800/80 p-0.5 rounded-lg border border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => setTabB('file')}
                  className={`px-2.5 py-1 rounded-md font-medium transition ${
                    tabB === 'file' ? 'bg-indigo-500 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  File
                </button>
                <button
                  type="button"
                  onClick={() => setTabB('text')}
                  className={`px-2.5 py-1 rounded-md font-medium transition ${
                    tabB === 'text' ? 'bg-indigo-500 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Paste
                </button>
              </div>
            </div>

            {tabB === 'file' ? (
              fileB ? (
                <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 flex items-center justify-between">
                  <div className="flex items-center space-x-3 truncate">
                    {getFormatIcon(fileB.name)}
                    <div className="truncate">
                      <p className="text-sm font-semibold text-white truncate">{fileB.name}</p>
                      <p className="text-xs text-slate-400">{formatFileSize(fileB.size)}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFileB(null);
                      if (fileInputRefB.current) fileInputRefB.current.value = '';
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
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
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                    dragOverB
                      ? 'border-indigo-500 bg-indigo-500/10 scale-[1.01]'
                      : 'border-slate-700/80 hover:border-slate-600 bg-slate-800/30 hover:bg-slate-800/50'
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
                  <Upload className="w-9 h-9 mx-auto text-slate-400 mb-2" />
                  <p className="text-sm font-medium text-slate-200">
                    Drop Document B here, or <span className="text-indigo-400">browse</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-1">PDF, Word, Excel, PPT, or TXT</p>
                </div>
              )
            ) : (
              <textarea
                value={textB}
                onChange={(e) => setTextB(e.target.value)}
                placeholder="Paste the comparison text content here..."
                rows={5}
                className="w-full p-3 bg-slate-800/60 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 font-mono resize-y"
              />
            )}
          </div>
        </div>
      </div>

      {/* Main Action Button */}
      <div className="flex justify-center pt-2">
        <button
          type="button"
          onClick={onCompare}
          disabled={!isReady || isComparing}
          className={`px-8 py-3.5 rounded-xl font-semibold text-sm shadow-xl flex items-center space-x-2.5 transition-all ${
            isReady && !isComparing
              ? 'bg-gradient-to-r from-sky-500 via-indigo-600 to-sky-500 bg-[length:200%_auto] hover:bg-right text-white shadow-sky-500/25 hover:shadow-sky-500/40 hover:scale-[1.02] cursor-pointer'
              : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
          }`}
        >
          {isComparing ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Analyzing Document Differences...</span>
            </>
          ) : (
            <>
              <FileCheck className="w-4 h-4" />
              <span>Compare Documents Now</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
