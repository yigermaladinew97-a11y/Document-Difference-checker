import React from 'react';
import { 
  Percent, 
  Sparkles, 
  PlusCircle, 
  MinusCircle, 
  CheckCircle2, 
  FileText,
  Hash,
  ArrowUpRight
} from 'lucide-react';

function CircularGauge({ value, label, sublabel, strokeColor, size = 140 }) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="w-full h-full -rotate-90 drop-shadow-sm" viewBox={`0 0 ${size} ${size}`}>
          {/* Background track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-slate-100 dark:text-slate-800"
          />
          {/* Active progress */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Center score */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-3xl font-black tracking-tight text-slate-900 dark:text-white font-mono">
            {value}%
          </span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
            MATCH
          </span>
        </div>
      </div>

      <div className="text-center mt-3">
        <h4 className="text-xs font-bold text-slate-900 dark:text-white tracking-tight">{label}</h4>
        <p className="text-[11px] text-slate-400 font-medium mt-0.5">{sublabel}</p>
      </div>
    </div>
  );
}

export default function Scoreboard({ metrics, stats, summary, meta }) {
  if (!metrics || !stats) return null;

  const getCategoryBadge = (category) => {
    switch (category) {
      case 'IDENTICAL':
        return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200';
      case 'MINOR_EDITS':
        return 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200';
      case 'MODERATE_CHANGES':
        return 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200';
      case 'MAJOR_REVISION':
        return 'bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-400 border-orange-200';
      default:
        return 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200';
    }
  };

  return (
    <div className="rounded-[32px] bg-white dark:bg-[#111726] border border-slate-200/80 dark:border-white/[0.08] p-7 sm:p-9 shadow-card space-y-7">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-slate-100 dark:border-white/[0.06] gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${getCategoryBadge(summary?.category)}`}>
              {summary?.category?.replace('_', ' ') || 'COMPARISON COMPLETE'}
            </span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {metrics.analysisMode === 'ai' ? '🤖 Gemini 2.5 Flash Verified' : '⚡ Local Algorithmic Analysis'}
            </span>
          </div>
          <p className="text-base text-slate-800 dark:text-slate-200 mt-2 font-bold leading-relaxed">{summary?.headline}</p>
        </div>

        <div className="text-xs font-medium text-slate-500 sm:text-right shrink-0 bg-slate-50 dark:bg-slate-900 px-4 py-2.5 rounded-2xl border border-slate-200/60 dark:border-white/[0.06]">
          <p className="font-bold text-slate-800 dark:text-slate-200">
            {meta?.docA?.filename} <span className="text-[#FF5E1E]">&harr;</span> {meta?.docB?.filename}
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {meta?.docA?.format?.toUpperCase()} ({meta?.docA?.wordCount} words) vs {meta?.docB?.format?.toUpperCase()} ({meta?.docB?.wordCount} words)
          </p>
        </div>
      </div>

      {/* Gauges & Stat Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Dual Gauges Box */}
        <div className="md:col-span-5 flex items-center justify-around p-6 rounded-3xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/60 dark:border-white/[0.06]">
          <CircularGauge
            value={metrics.lexicalSimilarityPercent}
            label="Lexical Similarity"
            sublabel="Verbatim word accuracy"
            strokeColor="#FF5E1E"
          />
          <div className="w-px h-28 bg-slate-200 dark:bg-white/[0.08]" />
          <CircularGauge
            value={metrics.contextSimilarityPercent}
            label="Contextual Match"
            sublabel="Semantic meaning & obligations"
            strokeColor="#10B981"
          />
        </div>

        {/* 4 Cambased-Style Stat Boxes */}
        <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          {/* Stat 1: Total Words */}
          <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/[0.06] hover:shadow-sm transition">
            <div className="flex items-center space-x-1.5 text-xs text-slate-500 mb-2 font-semibold">
              <Hash className="w-3.5 h-3.5 text-[#FF5E1E]" />
              <span>Words</span>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white font-mono">
              {stats.totalWordsA}
            </p>
            <p className="text-[11px] font-medium text-slate-400 mt-1">vs {stats.totalWordsB} in B</p>
          </div>

          {/* Stat 2: Identical */}
          <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/[0.06] hover:shadow-sm transition">
            <div className="flex items-center space-x-1.5 text-xs text-emerald-600 dark:text-emerald-400 mb-2 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Identical</span>
            </div>
            <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              {stats.unchangedWords}
            </p>
            <p className="text-[11px] font-medium text-slate-400 mt-1">shared words</p>
          </div>

          {/* Stat 3: Additions */}
          <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/[0.06] hover:shadow-sm transition">
            <div className="flex items-center space-x-1.5 text-xs text-[#FF5E1E] mb-2 font-semibold">
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Added</span>
            </div>
            <p className="text-2xl font-black text-[#FF5E1E] font-mono">
              +{stats.addedWords}
            </p>
            <p className="text-[11px] font-medium text-slate-400 mt-1">new words</p>
          </div>

          {/* Stat 4: Deletions */}
          <div className="p-5 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/[0.06] hover:shadow-sm transition">
            <div className="flex items-center space-x-1.5 text-xs text-rose-500 mb-2 font-semibold">
              <MinusCircle className="w-3.5 h-3.5" />
              <span>Removed</span>
            </div>
            <p className="text-2xl font-black text-rose-500 font-mono">
              -{stats.deletedWords}
            </p>
            <p className="text-[11px] font-medium text-slate-400 mt-1">deleted words</p>
          </div>
        </div>
      </div>
    </div>
  );
}
