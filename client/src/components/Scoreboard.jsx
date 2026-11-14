import React from 'react';
import { 
  Percent, 
  Sparkles, 
  PlusCircle, 
  MinusCircle, 
  CheckCircle2, 
  FileText,
  AlertTriangle 
} from 'lucide-react';

function CircularGauge({ value, label, sublabel, color = 'sky', size = 130 }) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  const colorStyles = {
    sky: {
      stroke: '#0284c7',
      text: 'text-sky-400',
      glow: 'shadow-sky-500/20'
    },
    emerald: {
      stroke: '#059669',
      text: 'text-emerald-400',
      glow: 'shadow-emerald-500/20'
    },
    amber: {
      stroke: '#d97706',
      text: 'text-amber-400',
      glow: 'shadow-amber-500/20'
    },
    rose: {
      stroke: '#e11d48',
      text: 'text-rose-400',
      glow: 'shadow-rose-500/20'
    }
  };

  const current = colorStyles[color] || colorStyles.sky;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="w-full h-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-slate-800"
          />
          {/* Dynamic Progress Arc */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={current.stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        {/* Centered Value */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className={`text-2xl font-bold tracking-tight ${current.text}`}>
            {value}%
          </span>
          <span className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
            Match
          </span>
        </div>
      </div>
      <div className="text-center mt-2.5">
        <h4 className="text-xs font-semibold text-white">{label}</h4>
        <p className="text-[11px] text-slate-400">{sublabel}</p>
      </div>
    </div>
  );
}

export default function Scoreboard({ metrics, stats, summary, meta }) {
  if (!metrics || !stats) return null;

  const lexicalColor = metrics.lexicalSimilarityPercent >= 90 
    ? 'emerald' 
    : metrics.lexicalSimilarityPercent >= 60 
    ? 'sky' 
    : metrics.lexicalSimilarityPercent >= 30 
    ? 'amber' 
    : 'rose';

  const contextColor = metrics.contextSimilarityPercent >= 90 
    ? 'emerald' 
    : metrics.contextSimilarityPercent >= 60 
    ? 'sky' 
    : metrics.contextSimilarityPercent >= 30 
    ? 'amber' 
    : 'rose';

  const getBadgeClass = (category) => {
    switch (category) {
      case 'IDENTICAL':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'MINOR_EDITS':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'MODERATE_CHANGES':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'MAJOR_REVISION':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/30';
      default:
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold border uppercase tracking-wider ${getBadgeClass(summary?.category)}`}>
              {summary?.category?.replace('_', ' ') || 'COMPARISON COMPLETED'}
            </span>
            <span className="text-xs text-slate-400">
              {metrics.analysisMode === 'ai' ? '🤖 AI Evaluated' : '⚡ Local Analysis'}
            </span>
          </div>
          <p className="text-sm text-slate-300 mt-1 font-medium">{summary?.headline}</p>
        </div>

        <div className="text-xs text-slate-400 sm:text-right shrink-0">
          <p><span className="text-slate-200 font-semibold">{meta?.docA?.filename}</span> vs <span className="text-slate-200 font-semibold">{meta?.docB?.filename}</span></p>
          <p className="text-slate-500">{meta?.docA?.format?.toUpperCase()} ➔ {meta?.docB?.format?.toUpperCase()}</p>
        </div>
      </div>

      {/* Dual Gauges and Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        {/* Left: Dual Gauges */}
        <div className="md:col-span-5 flex items-center justify-around p-4 rounded-xl bg-slate-800/40 border border-slate-800">
          <CircularGauge
            value={metrics.lexicalSimilarityPercent}
            label="Lexical Similarity"
            sublabel="Exact word matching"
            color={lexicalColor}
          />
          <div className="w-px h-24 bg-slate-800" />
          <CircularGauge
            value={metrics.contextSimilarityPercent}
            label="Contextual Match"
            sublabel="Meaning & obligations"
            color={contextColor}
          />
        </div>

        {/* Right: Key Stats Counters */}
        <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Card 1: Total Words */}
          <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-750">
            <div className="flex items-center space-x-1.5 text-xs text-slate-400 mb-1">
              <FileText className="w-3.5 h-3.5" />
              <span>Word Count</span>
            </div>
            <p className="text-lg font-bold text-white">
              {stats.totalWordsA} <span className="text-xs font-normal text-slate-400">vs</span> {stats.totalWordsB}
            </p>
            <p className="text-[11px] text-slate-500">
              {stats.totalWordsB >= stats.totalWordsA ? `+${stats.totalWordsB - stats.totalWordsA}` : `${stats.totalWordsB - stats.totalWordsA}`} delta
            </p>
          </div>

          {/* Card 2: Unchanged Words */}
          <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-750">
            <div className="flex items-center space-x-1.5 text-xs text-emerald-400 mb-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Matching</span>
            </div>
            <p className="text-lg font-bold text-emerald-400">{stats.unchangedWords}</p>
            <p className="text-[11px] text-slate-500">identical words</p>
          </div>

          {/* Card 3: Added Words */}
          <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-750">
            <div className="flex items-center space-x-1.5 text-xs text-sky-400 mb-1">
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Additions</span>
            </div>
            <p className="text-lg font-bold text-sky-400">+{stats.addedWords}</p>
            <p className="text-[11px] text-slate-500">new words</p>
          </div>

          {/* Card 4: Deleted Words */}
          <div className="p-3.5 rounded-xl bg-slate-800/50 border border-slate-750">
            <div className="flex items-center space-x-1.5 text-xs text-rose-400 mb-1">
              <MinusCircle className="w-3.5 h-3.5" />
              <span>Deletions</span>
            </div>
            <p className="text-lg font-bold text-rose-400">-{stats.deletedWords}</p>
            <p className="text-[11px] text-slate-500">removed words</p>
          </div>
        </div>
      </div>
    </div>
  );
}
