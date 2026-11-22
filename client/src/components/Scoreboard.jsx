import React from 'react';
import { 
  Percent, 
  PlusCircle, 
  MinusCircle, 
  CheckCircle2, 
  Download,
  Hash
} from 'lucide-react';
import CountUp from './CountUp';
import TiltCard from './TiltCard';

function CircularGauge({ value, label, sublabel, strokeColor, size = 125 }) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center group shrink-0">
      <div className="relative w-24 h-24 sm:w-28 sm:h-28 md:w-[125px] md:h-[125px]">
        <svg className="w-full h-full -rotate-90 drop-shadow-md" viewBox={`0 0 ${size} ${size}`}>
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
          {/* Active progress with spring animation */}
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
            className="transition-all duration-1000 ease-out group-hover:stroke-width-[12px]"
          />
        </svg>

        {/* Center animated score */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-slate-900 dark:text-white font-mono">
            <CountUp end={value} suffix="%" />
          </span>
          <span className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
            MATCH
          </span>
        </div>
      </div>

      <div className="text-center mt-2 sm:mt-3">
        <h4 className="text-[11px] sm:text-xs font-bold text-slate-900 dark:text-white tracking-tight">{label}</h4>
        <p className="text-[10px] sm:text-[11px] text-slate-400 font-medium mt-0.5 line-clamp-1">{sublabel}</p>
      </div>
    </div>
  );
}

export default function Scoreboard({ metrics, stats, summary, meta, filters, onExportPdf }) {
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
    <div className="rounded-[32px] bg-white dark:bg-[#111726] border border-slate-200/80 dark:border-white/[0.08] p-4 sm:p-7 md:p-9 shadow-card space-y-6 sm:space-y-7 transition-all">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-5 sm:pb-6 border-b border-slate-100 dark:border-white/[0.06] gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider animate-in fade-in duration-500 ${getCategoryBadge(summary?.category)}`}>
              {summary?.category?.replace('_', ' ') || 'COMPARISON COMPLETE'}
            </span>
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
              {metrics.analysisMode === 'ai' ? '🤖 Gemini 2.5 Flash Verified' : '⚡ Local Algorithmic Analysis'}
            </span>
          </div>
          <p className="text-sm sm:text-base text-slate-800 dark:text-slate-200 mt-2 font-bold leading-relaxed">{summary?.headline}</p>

          {/* Active Noise Filter Badges */}
          {filters && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
              {filters.ignoreCase && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FF5E1E]/10 text-[#FF5E1E] border border-[#FF5E1E]/20">
                  Aa Case Insensitive
                </span>
              )}
              {filters.ignorePunctuation && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
                  .,; Punctuation Filtered
                </span>
              )}
              {filters.ignoreWhitespace ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                  ␣ Whitespace Normalized
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800" title="Spaces matter: Whitespace and indentation are actively detected">
                  ␣ Spaces Sensitive (Strict)
                </span>
              )}
              {filters.ignoreNumbers && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                  # Numbers Filtered
                </span>
              )}
              {filters.trimLines && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  ✂️ Lines Trimmed
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0 w-full sm:w-auto justify-between sm:justify-end">
          {onExportPdf && (
            <button
              type="button"
              onClick={onExportPdf}
              className="flex items-center space-x-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-full bg-[#FF5E1E] hover:bg-[#E04A0E] text-white text-xs font-bold transition shadow-sm hover:scale-105 active:scale-95 shrink-0"
              title="1-Click Download Branded PDF Redline & Audit Report"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF Report</span>
            </button>
          )}

          <div className="text-xs font-medium text-slate-500 sm:text-right shrink-0 bg-slate-50 dark:bg-slate-900 px-3.5 py-2 rounded-2xl border border-slate-200/60 dark:border-white/[0.06] shadow-sm max-w-full truncate">
            <p className="font-bold text-slate-800 dark:text-slate-200 truncate">
              {meta?.docA?.filename} <span className="text-[#FF5E1E]">&harr;</span> {meta?.docB?.filename}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5 truncate">
              {meta?.docA?.format?.toUpperCase()} ({meta?.docA?.wordCount} words) vs {meta?.docB?.format?.toUpperCase()} ({meta?.docB?.wordCount} words)
            </p>
          </div>
        </div>
      </div>

      {/* Gauges & Stat Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-center">
        {/* Dual Gauges Box */}
        <div className="lg:col-span-5 flex items-center justify-around p-3.5 sm:p-6 rounded-3xl bg-slate-50/70 dark:bg-slate-900/50 border border-slate-200/60 dark:border-white/[0.06] shadow-inner gap-1 sm:gap-2">
          <CircularGauge
            value={metrics.lexicalSimilarityPercent}
            label="Word Match Score"
            sublabel="Exact words in common"
            strokeColor="#FF5E1E"
          />
          <div className="w-px h-20 sm:h-24 bg-slate-200 dark:bg-white/[0.08] shrink-0" />
          <CircularGauge
            value={metrics.contextSimilarityPercent}
            label="Overall Meaning"
            sublabel="Core message & intent"
            strokeColor="#10B981"
          />
        </div>

        {/* 4 Animated Tilt Stat Boxes */}
        <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3.5">
          {/* Stat 1: Total Words */}
          <TiltCard
            maxTilt={6}
            glowColor="rgba(255, 94, 30, 0.15)"
            className="p-3.5 sm:p-5 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/[0.06] hover:shadow-lg transition-all"
          >
            <div className="flex items-center space-x-1 text-xs text-slate-500 mb-1.5 font-semibold">
              <Hash className="w-3.5 h-3.5 text-[#FF5E1E]" />
              <span>Words</span>
            </div>
            <p className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-mono">
              <CountUp end={stats.totalWordsA} />
            </p>
            <p className="text-[10px] sm:text-[11px] font-medium text-slate-400 mt-1 truncate">vs {stats.totalWordsB} in B</p>
          </TiltCard>

          {/* Stat 2: Identical */}
          <TiltCard
            maxTilt={6}
            glowColor="rgba(16, 185, 129, 0.15)"
            className="p-3.5 sm:p-5 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/[0.06] hover:shadow-lg transition-all"
          >
            <div className="flex items-center space-x-1 text-xs text-emerald-600 dark:text-emerald-400 mb-1.5 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Identical</span>
            </div>
            <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
              <CountUp end={stats.unchangedWords} />
            </p>
            <p className="text-[10px] sm:text-[11px] font-medium text-slate-400 mt-1">shared words</p>
          </TiltCard>

          {/* Stat 3: Additions */}
          <TiltCard
            maxTilt={6}
            glowColor="rgba(255, 94, 30, 0.2)"
            className="p-3.5 sm:p-5 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/[0.06] hover:shadow-lg transition-all"
          >
            <div className="flex items-center space-x-1 text-xs text-[#FF5E1E] mb-1.5 font-semibold">
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Added</span>
            </div>
            <p className="text-xl sm:text-2xl font-black text-[#FF5E1E] font-mono">
              +<CountUp end={stats.addedWords} />
            </p>
            <p className="text-[10px] sm:text-[11px] font-medium text-slate-400 mt-1">new words</p>
          </TiltCard>

          {/* Stat 4: Deletions */}
          <TiltCard
            maxTilt={6}
            glowColor="rgba(244, 63, 94, 0.15)"
            className="p-3.5 sm:p-5 rounded-3xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/[0.06] hover:shadow-lg transition-all"
          >
            <div className="flex items-center space-x-1 text-xs text-rose-500 mb-1.5 font-semibold">
              <MinusCircle className="w-3.5 h-3.5" />
              <span>Removed</span>
            </div>
            <p className="text-xl sm:text-2xl font-black text-rose-500 font-mono">
              -<CountUp end={stats.deletedWords} />
            </p>
            <p className="text-[10px] sm:text-[11px] font-medium text-slate-400 mt-1">deleted words</p>
          </TiltCard>
        </div>
      </div>
    </div>
  );
}
