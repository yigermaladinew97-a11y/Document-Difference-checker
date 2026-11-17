import React, { useState, useRef } from 'react';
import { 
  FolderUp, 
  Files, 
  ArrowRightLeft, 
  Trash2, 
  Plus, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  FileText, 
  UploadCloud, 
  Link2,
  Unlink,
  Layers,
  ArrowRight
} from 'lucide-react';
import { autoPairFiles } from '../utils/pairingEngine';

export default function BatchDropzone({
  pairs = [],
  setPairs,
  unpaired = [],
  setUnpaired,
  onRunBatch,
  isComparing = false,
  progress = null
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedUnpairedIdx, setSelectedUnpairedIdx] = useState(null);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);

  const handleFilesIngest = (newFiles) => {
    if (!newFiles || newFiles.length === 0) return;
    const fileList = Array.from(newFiles);

    // Existing pool of files + new files
    const allExistingFiles = [
      ...pairs.flatMap(p => [p.docA, p.docB]),
      ...unpaired
    ];

    // Filter duplicates by name & size
    const uniqueNew = fileList.filter(nf => 
      !allExistingFiles.some(ef => ef.name === nf.name && ef.size === nf.size)
    );

    if (uniqueNew.length === 0) return;

    const combinedPool = [...allExistingFiles, ...uniqueNew];
    const { pairs: detectedPairs, unpaired: detectedUnpaired } = autoPairFiles(combinedPool);

    setPairs(detectedPairs);
    setUnpaired(detectedUnpaired);
    setSelectedUnpairedIdx(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);

    if (e.dataTransfer && e.dataTransfer.files) {
      handleFilesIngest(e.dataTransfer.files);
    }
  };

  const handleSwap = (pairId) => {
    setPairs(prev => prev.map(p => {
      if (p.id === pairId) {
        return {
          ...p,
          docA: p.docB,
          docB: p.docA,
          matchReason: 'Manually inverted (Original ↔ Revised)'
        };
      }
      return p;
    }));
  };

  const handleUnpair = (pairId) => {
    const target = pairs.find(p => p.id === pairId);
    if (!target) return;
    setPairs(prev => prev.filter(p => p.id !== pairId));
    setUnpaired(prev => [...prev, target.docA, target.docB]);
  };

  const handleRemovePair = (pairId) => {
    setPairs(prev => prev.filter(p => p.id !== pairId));
  };

  const handleRemoveUnpaired = (index) => {
    setUnpaired(prev => prev.filter((_, idx) => idx !== index));
    if (selectedUnpairedIdx === index) setSelectedUnpairedIdx(null);
  };

  const handleSelectUnpairedToPair = (index) => {
    if (selectedUnpairedIdx === null) {
      setSelectedUnpairedIdx(index);
    } else if (selectedUnpairedIdx === index) {
      setSelectedUnpairedIdx(null);
    } else {
      // Pair the two selected files
      const file1 = unpaired[selectedUnpairedIdx];
      const file2 = unpaired[index];
      const newPair = {
        id: `pair_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        docA: file1,
        docB: file2,
        matchReason: 'Manually paired by user',
        confidence: 'manual'
      };

      setPairs(prev => [...prev, newPair]);
      setUnpaired(prev => prev.filter((_, idx) => idx !== selectedUnpairedIdx && idx !== index));
      setSelectedUnpairedIdx(null);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes && bytes !== 0) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const hasFiles = pairs.length > 0 || unpaired.length > 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Hidden Inputs for Folder and Multiple Files */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFilesIngest(e.target.files);
          e.target.value = null;
        }}
      />
      <input
        ref={folderInputRef}
        type="file"
        // @ts-ignore webkitdirectory attribute for folder picker
        webkitdirectory="true"
        directory="true"
        multiple
        className="hidden"
        onChange={(e) => {
          handleFilesIngest(e.target.files);
          e.target.value = null;
        }}
      />

      {/* Main Drag & Drop Zone */}
      {!hasFiles ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={`relative rounded-3xl border-2 border-dashed transition-all duration-300 p-8 sm:p-14 text-center cursor-pointer ${
            isDragOver
              ? 'border-[#FF5E1E] bg-[#FFF4EF]/70 dark:bg-[#FF5E1E]/10 scale-[1.01]'
              : 'border-slate-300/80 dark:border-white/[0.12] bg-white/60 dark:bg-[#111726]/60 hover:border-[#FF5E1E]/50'
          }`}
          onClick={() => folderInputRef.current?.click()}
        >
          <div className="max-w-xl mx-auto space-y-5">
            <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto rounded-3xl bg-gradient-to-tr from-[#FFF4EF] to-white dark:from-[#FF5E1E]/20 dark:to-slate-800 border border-[#FF5E1E]/20 flex items-center justify-center text-[#FF5E1E] shadow-xl shadow-[#FF5E1E]/10">
              <FolderUp className="w-8 h-8 sm:w-10 sm:h-10" />
            </div>

            <div className="space-y-2">
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                Drop your document folder here
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                Our smart engine scans filenames and automatically pairs matching versions (<code className="text-[#FF5E1E] font-semibold">_v1 vs _v2</code>, <code className="text-[#FF5E1E] font-semibold">draft vs final</code>, dates, etc.)
              </p>
            </div>

            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  folderInputRef.current?.click();
                }}
                className="px-5 py-2.5 rounded-full bg-[#FF5E1E] hover:bg-[#FF733B] text-white text-xs font-bold shadow-md shadow-[#FF5E1E]/25 transition hover:scale-105 active:scale-95 flex items-center space-x-2"
              >
                <FolderUp className="w-4 h-4" />
                <span>Select Folder</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
                className="px-5 py-2.5 rounded-full bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-white/[0.1] text-slate-700 dark:text-slate-200 text-xs font-bold shadow-sm transition hover:scale-105 active:scale-95 flex items-center space-x-2"
              >
                <Files className="w-4 h-4 text-[#FF5E1E]" />
                <span>Select Multiple Files</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-400 font-medium">
              Accepts PDF, DOCX, XLSX, PPTX, and TXT files • 100% In-Memory Processing
            </p>
          </div>
        </div>
      ) : (
        /* Ready Pairs Review & Management */
        <div className="space-y-6">
          {/* Header Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 dark:border-white/[0.08] gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-[#FFF4EF] dark:bg-[#FF5E1E]/15 text-[#FF5E1E] flex items-center justify-center font-black">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">
                    Batch Pair Configuration
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[11px] font-black">
                    {pairs.length} {pairs.length === 1 ? 'Pair' : 'Pairs'} Ready
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Review auto-detected pairs, swap original vs revised, or manually link files below.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => folderInputRef.current?.click()}
                className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 border border-slate-200 dark:border-white/[0.08] text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm transition hover:scale-105 active:scale-95 flex items-center space-x-1.5"
              >
                <Plus className="w-3.5 h-3.5 text-[#FF5E1E]" />
                <span>Add Folder</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 border border-slate-200 dark:border-white/[0.08] text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm transition hover:scale-105 active:scale-95 flex items-center space-x-1.5"
              >
                <Files className="w-3.5 h-3.5 text-[#FF5E1E]" />
                <span>Add Files</span>
              </button>
              <button
                type="button"
                onClick={() => { setPairs([]); setUnpaired([]); }}
                className="p-2 rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition"
                title="Clear all"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Pairs Grid */}
          <div className="grid grid-cols-1 gap-4">
            {pairs.map((pair, index) => (
              <div
                key={pair.id}
                className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#111726] border border-slate-200/80 dark:border-white/[0.08] shadow-card hover:border-[#FF5E1E]/40 transition-all flex flex-col md:flex-row items-center justify-between gap-4 group"
              >
                {/* Index & match reason badge */}
                <div className="flex items-center space-x-3 w-full md:w-auto shrink-0">
                  <span className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs font-black">
                    {index + 1}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center space-x-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Paired</span>
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium truncate max-w-[150px]">
                      {pair.matchReason}
                    </span>
                  </div>
                </div>

                {/* Document A vs Document B comparison pill */}
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
                  {/* Doc A */}
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/[0.04] flex items-center space-x-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
                      Doc A (Original)
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate" title={pair.docA.name}>
                        {pair.docA.name}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {formatFileSize(pair.docA.size)}
                      </p>
                    </div>
                  </div>

                  {/* Doc B */}
                  <div className="p-3 rounded-xl bg-[#FFF4EF]/60 dark:bg-[#FF5E1E]/5 border border-[#FFD6C4]/60 dark:border-[#FF5E1E]/15 flex items-center space-x-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-[#FF5E1E]/15 text-[#FF5E1E] shrink-0">
                      Doc B (Revised)
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate" title={pair.docB.name}>
                        {pair.docB.name}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {formatFileSize(pair.docB.size)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions: Swap & Remove */}
                <div className="flex items-center space-x-2 shrink-0 self-end md:self-center">
                  <button
                    type="button"
                    onClick={() => handleSwap(pair.id)}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-[#FF5E1E]/10 hover:text-[#FF5E1E] text-slate-500 transition"
                    title="Swap Document A and Document B"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleUnpair(pair.id)}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-amber-500/10 hover:text-amber-500 text-slate-500 transition"
                    title="Unpair into separate files"
                  >
                    <Unlink className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemovePair(pair.id)}
                    className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-rose-500/10 hover:text-rose-500 text-slate-500 transition"
                    title="Delete this pair from batch"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Unpaired Files Tray */}
          {unpaired.length > 0 && (
            <div className="p-4 sm:p-5 rounded-3xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/70 dark:border-amber-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs font-bold text-amber-800 dark:text-amber-300">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{unpaired.length} Unpaired {unpaired.length === 1 ? 'File' : 'Files'} (Click any two to manually pair)</span>
                </div>
                {selectedUnpairedIdx !== null && (
                  <span className="text-[11px] font-bold text-[#FF5E1E] animate-pulse">
                    Click another file below to link with "{unpaired[selectedUnpairedIdx]?.name}"
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {unpaired.map((file, idx) => {
                  const isSelected = selectedUnpairedIdx === idx;
                  return (
                    <div
                      key={idx}
                      onClick={() => handleSelectUnpairedToPair(idx)}
                      className={`cursor-pointer px-3 py-2 rounded-xl text-xs font-semibold flex items-center space-x-2 transition-all shadow-xs ${
                        isSelected
                          ? 'bg-[#FF5E1E] text-white ring-2 ring-[#FF5E1E] ring-offset-2 scale-105'
                          : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/[0.08] hover:border-[#FF5E1E]'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate max-w-[200px]" title={file.name}>{file.name}</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveUnpaired(idx);
                        }}
                        className="text-slate-400 hover:text-rose-500 ml-1"
                      >
                        &times;
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bottom Action: Run Batch Compare Button */}
          {pairs.length > 0 && (
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Ready to execute high-throughput diffing across <strong className="text-slate-900 dark:text-white font-bold">{pairs.length} {pairs.length === 1 ? 'document pair' : 'document pairs'}</strong>.
              </div>

              <div className="relative group/btn w-full sm:w-auto">
                <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-[#FF5E1E] via-[#FF8A50] to-[#FF5E1E] opacity-75 blur-xl group-hover/btn:opacity-100 transition duration-500 animate-pulse pointer-events-none" />

                <button
                  type="button"
                  disabled={isComparing}
                  onClick={onRunBatch}
                  className="relative w-full sm:w-auto inline-flex items-center justify-center space-x-3 px-8 sm:px-12 py-3.5 sm:py-4 rounded-full bg-[#FF5E1E] hover:bg-[#FF733B] text-white shadow-xl shadow-[#FF5E1E]/30 transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Sparkles className={`w-5 h-5 ${isComparing ? 'animate-spin' : ''}`} />
                  <span className="font-black text-base sm:text-lg tracking-wider">
                    {isComparing ? 'Comparing Batch...' : `Compare All (${pairs.length} Pairs)`}
                  </span>
                  <div className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-xs flex items-center justify-center text-white">
                    <ArrowRight className="w-4 h-4 stroke-[3]" />
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Comparing Progress Indicator */}
      {isComparing && (
        <div className="p-6 rounded-3xl bg-white dark:bg-[#111726] border border-slate-200 dark:border-white/[0.08] shadow-card text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-[#FFF4EF] dark:bg-[#FF5E1E]/15 text-[#FF5E1E] flex items-center justify-center shadow-inner">
            <Sparkles className="w-6 h-6 animate-spin text-[#FF5E1E]" />
          </div>
          <div className="space-y-1">
            <h4 className="text-base font-black text-slate-900 dark:text-white">
              {progress ? progress.label : 'Executing High-Throughput Batch Diff...'}
            </h4>
            <p className="text-xs text-slate-400">
              Parsing buffers, aligning tokens, and computing Sørensen-Dice similarity
            </p>
          </div>
          {progress && progress.percent && (
            <div className="max-w-md mx-auto w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
              <div 
                className="bg-[#FF5E1E] h-full transition-all duration-300 rounded-full"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
