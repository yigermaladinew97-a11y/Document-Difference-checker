import React from 'react';
import { 
  Percent, 
  Sparkles, 
  PlusCircle, 
  MinusCircle, 
  CheckCircle2, 
  FileText,
  TrendingUp,
  Hash
} from 'lucide-react';

function GradientCircularGauge({ value, label, sublabel, gradientId, fromColor, toColor, size = 140 }) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="w-full h-full -rotate-90 drop-shadow-md" viewBox={`0 0 ${size} ${size}`}>
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={fromColor} />
              <stop offset="100%" stopColor={toColor} />
            </linearGradient>
            <filter id={`glow-${gradientId}`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-white/[0.06]"
          />

          {/* Glowing Animated Arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            filter={`url(#glow-${gradientId})`}
            className="transition-all duration-1000 ease-out"
          />
        </svg>

        {/* Center Readout */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-3xl font-extrabold tracking-tighter text-white font-mono">
            {value}%
          </span>
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">
            MATCH
          </span>
        </div>
      </div>

      <div className="text-center mt-3">
        <h4 className="text-xs font-bold text-white tracking-tight">{label}</h4>
        <p className="text-[11px] text-slate-400 mt-0.5">{sublabel}</p>
      </div>
    </div>
  );
}

export default function Scoreboard({ metrics, stats, summary, meta }) {
  if (!metrics || !stats) return null;

  const getCategoryTheme = (category) => {
    switch (category) {
      case 'IDENTICAL':
        return {
          pill: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          dot: 'bg-emerald-400',
          label: 'Identical Documents'
        };
      case 'MINOR_EDITS':
        return {
          pill: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
          dot: 'bg-sky-400',
          label: 'Minor Revisions'
        };
      case 'MODERATE_CHANGES':
        return {
          pill: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          dot: 'bg-amber-400',
          label: 'Moderate Modifications'
        };
      case 'MAJOR_REVISION':
        return {
          pill: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
          dot: 'bg-orange-400',
          label: 'Substantial Rewrite'
        };
      default:
        return {
          pill: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
          dot: 'bg-rose-400',
          label: 'Completely Different'
        };
    }
  };

  const theme = getCategoryTheme(summary?.category);

  return (
    <div className="relative rounded-3xl bg-dark-900/90 border border-white/[0.08] p-7 shadow-2xl backdrop-blur-xl space-y-7 overflow-hidden">
      {/* Top Ambient Glow */}
      <div className="absolute top-0 right-1/4 w-72 h-32 bg-indigo-500/[0.05] rounded-full blur-3xl pointer-events-none" />

      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-5 border-b border-white/[0.06] gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <span className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-xs font-semibold border uppercase tracking-wider ${theme.pill}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${theme.dot} animate-pulse`} />
              <span>{theme.label}</span>
            </span>
            <span className="text-xs text-slate-400 font-medium">
              {metrics.analysisMode === 'ai' ? '🤖 Gemini 2.5 Flash Verified' : '⚡ Local Algorithmic Diff'}
            </span>
          </div>
          <p className="text-sm text-slate-200 mt-2 font-medium leading-relaxed">{summary?.headline}</p>
        </div>

        <div className="text-xs text-slate-400 sm:text-right shrink-0 bg-dark-950/70 px-4 py-2 rounded-xl border border-white/[0.05]">
          <p className="font-mono text-slate-300">
            {meta?.docA?.filename} <span className="text-slate-500">&harr;</span> {meta?.docB?.filename}
          </p>
          <p className="text-[11px] text-slate-500 mt-0.5">
            {meta?.docA?.format?.toUpperCase()} ({meta?.docA?.wordCount} words) vs {meta?.docB?.format?.toUpperCase()} ({meta?.docB?.wordCount} words)
          </p>
        </div>
      </div>

      {/* Gauges & Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Dual Luxury Gauges */}
        <div className="md:col-span-5 flex items-center justify-around p-6 rounded-2xl bg-dark-950/60 border border-white/[0.06] shadow-inner">
          <GradientCircularGauge
            value={metrics.lexicalSimilarityPercent}
            label="Lexical Similarity"
            sublabel="Verbatim word accuracy"
            gradientId="lexicalGrad"
            fromColor="#38bdf8"
            toColor="#6366f1"
          />
          <div className="w-px h-28 bg-white/[0.08]" />
          <GradientCircularGauge
            value={metrics.contextSimilarityPercent}
            label="Contextual Match"
            sublabel="Semantic intent & obligations"
            gradientId="contextGrad"
            fromColor="#34d399"
            toColor="#059669"
          />
        </div>

        {/* 4 Sleek Stat Cards */}
        <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          {/* Card 1: Total Words */}
          <div className="relative p-4 rounded-2xl bg-dark-950/60 border border-white/[0.06] hover:border-white/[0.1] transition group">
            <div className="flex items-center space-x-1.5 text-xs text-slate-400 mb-1.5">
              <Hash className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-medium">Total Words</span>
            </div>
            <p className="text-xl font-bold text-white font-mono tracking-tight">
              {stats.totalWordsA} <span className="text-xs text-slate-500">/</span> {stats.totalWordsB}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              {stats.totalWordsB >= stats.totalWordsA ? `+${stats.totalWordsB - stats.totalWordsA} net change` : `${stats.totalWordsB - stats.totalWordsA} net change`}
            </p>
          </div>

          {/* Card 2: Matching Words */}
          <div className="relative p-4 rounded-2xl bg-dark-950/60 border border-white/[0.06] hover:border-emerald-500/20 transition group">
            <div className="flex items-center space-x-1.5 text-xs text-emerald-400 mb-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-medium">Identical</span>
            </div>
            <p className="text-xl font-bold text-emerald-400 font-mono tracking-tight">
              {stats.unchangedWords}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">shared words</p>
          </div>

          {/* Card 3: Additions */}
          <div className="relative p-4 rounded-2xl bg-dark-950/60 border border-white/[0.06] hover:border-sky-500/20 transition group">
            <div className="flex items-center space-x-1.5 text-xs text-sky-400 mb-1.5">
              <PlusCircle className="w-3.5 h-3.5 text-sky-400" />
              <span className="font-medium">Additions</span>
            </div>
            <p className="text-xl font-bold text-sky-400 font-mono tracking-tight">
              +{stats.addedWords}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">inserted words</p>
          </div>

          {/* Card 4: Deletions */}
          <div className="relative p-4 rounded-2xl bg-dark-950/60 border border-white/[0.06] hover:border-rose-500/20 transition group">
            <div className="flex items-center space-x-1.5 text-xs text-rose-400 mb-1.5">
              <MinusCircle className="w-3.5 h-3.5 text-rose-400" />
              <span className="font-medium">Deletions</span>
            </div>
            <p className="text-xl font-bold text-rose-400 font-mono tracking-tight">
              -{stats.deletedWords}
            </p>
            <p className="text-[11px] text-slate-400 mt-1">removed words</p>
          </div>
        </div>
      </div>
    </div>
  );
}
