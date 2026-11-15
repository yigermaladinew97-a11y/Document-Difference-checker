import React from 'react';
import { 
  SlidersHorizontal, 
  Check, 
  RotateCcw, 
  Hash, 
  AlignJustify, 
  Type, 
  Scissors,
  Sparkles,
  Info
} from 'lucide-react';

export const FILTER_PRESETS = [
  {
    id: 'default',
    label: 'Standard',
    description: 'Normalizes whitespace; flags letter case, numbers, and punctuation edits',
    filters: {
      ignoreCase: false,
      ignorePunctuation: false,
      ignoreWhitespace: true,
      ignoreNumbers: false,
      trimLines: false
    }
  },
  {
    id: 'substantive',
    label: 'Substantive Only',
    description: 'Ignores letter case, punctuation, and extra spaces; highlights core legal & text changes',
    filters: {
      ignoreCase: true,
      ignorePunctuation: true,
      ignoreWhitespace: true,
      ignoreNumbers: false,
      trimLines: true
    }
  },
  {
    id: 'ignore-numbers',
    label: 'Boilerplate / Ignore Numbers',
    description: 'Ignores pricing figures, years, and dates; highlights contractual phrasing',
    filters: {
      ignoreCase: true,
      ignorePunctuation: false,
      ignoreWhitespace: true,
      ignoreNumbers: true,
      trimLines: false
    }
  },
  {
    id: 'strict',
    label: 'Strict Exact',
    description: 'Zero filters; verbatim byte-for-byte character comparison',
    filters: {
      ignoreCase: false,
      ignorePunctuation: false,
      ignoreWhitespace: false,
      ignoreNumbers: false,
      trimLines: false
    }
  }
];

export default function NoiseFiltersBar({
  filters,
  onFilterChange,
  onApply,
  isComparing = false,
  showApplyButton = false,
  compact = false
}) {
  const activeCount = Object.values(filters).filter(Boolean).length;

  const toggleFilter = (key) => {
    const next = { ...filters, [key]: !filters[key] };
    onFilterChange(next);
    if (onApply) {
      onApply(next);
    }
  };

  const applyPreset = (preset) => {
    onFilterChange(preset.filters);
    if (onApply) {
      onApply(preset.filters);
    }
  };

  // Find active preset if matches exactly
  const activePreset = FILTER_PRESETS.find(p => 
    Object.keys(p.filters).every(k => p.filters[k] === filters[k])
  );

  return (
    <div className={`w-full rounded-2xl sm:rounded-3xl border transition-all ${
      compact
        ? 'p-3 bg-white/80 dark:bg-slate-900/80 border-slate-200/60 dark:border-white/[0.06] backdrop-blur-sm shadow-sm'
        : 'p-4 sm:p-5 bg-slate-50/80 dark:bg-slate-900/50 border-slate-200/80 dark:border-white/[0.08] shadow-card'
    }`}>
      {/* Header Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3.5">
        <div className="flex items-center space-x-2.5">
          <div className="w-7 h-7 rounded-xl bg-[#FFF4EF] dark:bg-[#FF5E1E]/15 text-[#FF5E1E] flex items-center justify-center shadow-xs">
            <SlidersHorizontal className="w-3.5 h-3.5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-black text-slate-900 dark:text-white tracking-tight">
                Smart Noise Filters
              </span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors ${
                activeCount > 0 
                  ? 'bg-[#FF5E1E]/15 text-[#FF5E1E] border border-[#FF5E1E]/30' 
                  : 'bg-slate-200/70 dark:bg-slate-800 text-slate-500'
              }`}>
                {activeCount} {activeCount === 1 ? 'Filter Active' : 'Filters Active'}
              </span>
            </div>
            {!compact && (
              <p className="text-[11px] text-slate-400 font-medium">
                Eliminate formatting noise to focus on meaningful document revisions
              </p>
            )}
          </div>
        </div>

        {/* Quick Presets Row */}
        <div className="flex items-center space-x-1.5 flex-wrap">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1 hidden sm:inline">
            Presets:
          </span>
          {FILTER_PRESETS.map((p) => {
            const isSelected = activePreset?.id === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p)}
                title={p.description}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-all ${
                  isSelected
                    ? 'bg-[#FF5E1E] text-white shadow-xs scale-100'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200/60 dark:border-white/[0.06] hover:border-slate-300'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 5 Toggle Pills */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-1">
        
        {/* Filter 1: Ignore Case */}
        <button
          type="button"
          onClick={() => toggleFilter('ignoreCase')}
          className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-left text-xs font-bold transition-all border ${
            filters.ignoreCase
              ? 'bg-[#FFF4EF] dark:bg-[#FF5E1E]/15 border-[#FF5E1E]/40 text-[#FF5E1E] shadow-xs scale-[1.01]'
              : 'bg-white dark:bg-slate-800/80 border-slate-200/70 dark:border-white/[0.06] text-slate-600 dark:text-slate-300 hover:border-slate-300 hover:text-slate-900'
          }`}
          title="Ignore letter case variations ('Agreement' vs 'agreement')"
        >
          <div className={`p-1 rounded-lg ${filters.ignoreCase ? 'bg-[#FF5E1E] text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
            <Type className="w-3 h-3 stroke-[2.5]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px]">Ignore Case</p>
            <p className="text-[9px] font-semibold opacity-70 truncate">Aa &harr; aa</p>
          </div>
          {filters.ignoreCase && <Check className="w-3 h-3 text-[#FF5E1E] shrink-0" />}
        </button>

        {/* Filter 2: Ignore Punctuation */}
        <button
          type="button"
          onClick={() => toggleFilter('ignorePunctuation')}
          className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-left text-xs font-bold transition-all border ${
            filters.ignorePunctuation
              ? 'bg-[#FFF4EF] dark:bg-[#FF5E1E]/15 border-[#FF5E1E]/40 text-[#FF5E1E] shadow-xs scale-[1.01]'
              : 'bg-white dark:bg-slate-800/80 border-slate-200/70 dark:border-white/[0.06] text-slate-600 dark:text-slate-300 hover:border-slate-300 hover:text-slate-900'
          }`}
          title="Ignore commas, periods, quotes, colons, and hyphens"
        >
          <div className={`p-1 rounded-lg ${filters.ignorePunctuation ? 'bg-[#FF5E1E] text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
            <Sparkles className="w-3 h-3 stroke-[2.5]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px]">Ignore Punctuation</p>
            <p className="text-[9px] font-semibold opacity-70 truncate">.,;:!?'""</p>
          </div>
          {filters.ignorePunctuation && <Check className="w-3 h-3 text-[#FF5E1E] shrink-0" />}
        </button>

        {/* Filter 3: Normalize Whitespace */}
        <button
          type="button"
          onClick={() => toggleFilter('ignoreWhitespace')}
          className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-left text-xs font-bold transition-all border ${
            filters.ignoreWhitespace
              ? 'bg-[#FFF4EF] dark:bg-[#FF5E1E]/15 border-[#FF5E1E]/40 text-[#FF5E1E] shadow-xs scale-[1.01]'
              : 'bg-white dark:bg-slate-800/80 border-slate-200/70 dark:border-white/[0.06] text-slate-600 dark:text-slate-300 hover:border-slate-300 hover:text-slate-900'
          }`}
          title={filters.ignoreWhitespace ? 'Normalize Whitespace is ON: Spaces and blank lines are collapsed' : 'Normalize Whitespace is OFF: Exact spacing, tabs, and indentation matter'}
        >
          <div className={`p-1 rounded-lg ${filters.ignoreWhitespace ? 'bg-[#FF5E1E] text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
            <AlignJustify className="w-3 h-3 stroke-[2.5]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px]">Normalize Spaces</p>
            <p className="text-[9px] font-semibold opacity-70 truncate">
              {filters.ignoreWhitespace ? 'Spaces ignored' : 'Spaces matter (OFF)'}
            </p>
          </div>
          {filters.ignoreWhitespace && <Check className="w-3 h-3 text-[#FF5E1E] shrink-0" />}
        </button>

        {/* Filter 4: Ignore Numbers & Dates */}
        <button
          type="button"
          onClick={() => toggleFilter('ignoreNumbers')}
          className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-left text-xs font-bold transition-all border ${
            filters.ignoreNumbers
              ? 'bg-[#FFF4EF] dark:bg-[#FF5E1E]/15 border-[#FF5E1E]/40 text-[#FF5E1E] shadow-xs scale-[1.01]'
              : 'bg-white dark:bg-slate-800/80 border-slate-200/70 dark:border-white/[0.06] text-slate-600 dark:text-slate-300 hover:border-slate-300 hover:text-slate-900'
          }`}
          title="Ignore pricing amounts, percentages, years, and numeric dates"
        >
          <div className={`p-1 rounded-lg ${filters.ignoreNumbers ? 'bg-[#FF5E1E] text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
            <Hash className="w-3 h-3 stroke-[2.5]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px]">Ignore Numbers</p>
            <p className="text-[9px] font-semibold opacity-70 truncate">$10 vs $20</p>
          </div>
          {filters.ignoreNumbers && <Check className="w-3 h-3 text-[#FF5E1E] shrink-0" />}
        </button>

        {/* Filter 5: Trim Line Edits */}
        <button
          type="button"
          onClick={() => toggleFilter('trimLines')}
          className={`col-span-2 sm:col-span-1 flex items-center space-x-2 px-3 py-2 rounded-xl text-left text-xs font-bold transition-all border ${
            filters.trimLines
              ? 'bg-[#FFF4EF] dark:bg-[#FF5E1E]/15 border-[#FF5E1E]/40 text-[#FF5E1E] shadow-xs scale-[1.01]'
              : 'bg-white dark:bg-slate-800/80 border-slate-200/70 dark:border-white/[0.06] text-slate-600 dark:text-slate-300 hover:border-slate-300 hover:text-slate-900'
          }`}
          title="Trim whitespace padding from start and end of every line"
        >
          <div className={`p-1 rounded-lg ${filters.trimLines ? 'bg-[#FF5E1E] text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'}`}>
            <Scissors className="w-3 h-3 stroke-[2.5]" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px]">Trim Lines</p>
            <p className="text-[9px] font-semibold opacity-70 truncate">Line padding</p>
          </div>
          {filters.trimLines && <Check className="w-3 h-3 text-[#FF5E1E] shrink-0" />}
        </button>
      </div>

      {/* Optional Quick Re-apply Button when displayed in Results view */}
      {showApplyButton && onApply && (
        <div className="mt-3.5 pt-3 border-t border-slate-100 dark:border-white/[0.04] flex items-center justify-between">
          <div className="flex items-center space-x-1.5 text-[11px] text-slate-400 font-medium">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Toggling a filter updates the diff analysis with revised settings</span>
          </div>

          <button
            type="button"
            onClick={() => onApply && onApply(filters)}
            disabled={isComparing}
            className="flex items-center space-x-1.5 px-4 py-1.5 rounded-full bg-[#FF5E1E] hover:bg-[#E04A0E] text-white text-xs font-bold transition shadow-xs hover:scale-105 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <RotateCcw className={`w-3 h-3 ${isComparing ? 'animate-spin' : ''}`} />
            <span>{isComparing ? 'Updating...' : 'Re-apply Filters'}</span>
          </button>
        </div>
      )}
    </div>
  );
}
