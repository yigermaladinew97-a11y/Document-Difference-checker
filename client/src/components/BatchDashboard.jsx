import React, { useState, useMemo } from 'react';
import { 
  FileDiff, 
  ArrowRight, 
  Search, 
  Download, 
  Filter, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  ShieldCheck, 
  TrendingDown, 
  Layers, 
  BarChart3,
  SlidersHorizontal,
  ChevronRight
} from 'lucide-react';

export default function BatchDashboard({
  batchResults = [],
  batchMetrics = {},
  onInspectPair,
  onResetBatch
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all, major, moderate, high, identical
  const [sortBy, setSortBy] = useState('most_changed'); // most_changed, least_changed, most_diffs, name_asc

  // Categorize pair by similarity
  const getStatusCategory = (sim) => {
    if (sim === 100) return 'identical';
    if (sim >= 90) return 'high';
    if (sim >= 60) return 'moderate';
    return 'major';
  };

  const getStatusBadge = (sim) => {
    if (sim === 100) {
      return {
        label: 'Identical (100%)',
        color: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800',
        dot: 'bg-indigo-500'
      };
    }
    if (sim >= 90) {
      return {
        label: 'High Match',
        color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800',
        dot: 'bg-emerald-500'
      };
    }
    if (sim >= 60) {
      return {
        label: 'Moderate Edits',
        color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800',
        dot: 'bg-amber-500'
      };
    }
    return {
      label: 'Major Revisions',
      color: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800',
      dot: 'bg-rose-500'
    };
  };

  // Filter & Sort pairs
  const filteredPairs = useMemo(() => {
    return batchResults.filter(pair => {
      const nameA = pair.meta.docA.filename.toLowerCase();
      const nameB = pair.meta.docB.filename.toLowerCase();
      const q = searchQuery.toLowerCase().trim();

      const matchesQuery = !q || nameA.includes(q) || nameB.includes(q);
      const category = getStatusCategory(pair.metrics.lexicalSimilarityPercent);
      const matchesFilter = statusFilter === 'all' || category === statusFilter;

      return matchesQuery && matchesFilter;
    }).sort((a, b) => {
      const simA = a.metrics.lexicalSimilarityPercent;
      const simB = b.metrics.lexicalSimilarityPercent;
      const diffA = a.stats?.totalDifferences || 0;
      const diffB = b.stats?.totalDifferences || 0;

      if (sortBy === 'most_changed') return simA - simB; // lowest sim first
      if (sortBy === 'least_changed') return simB - simA; // highest sim first
      if (sortBy === 'most_diffs') return diffB - diffA;
      if (sortBy === 'name_asc') return a.meta.docA.filename.localeCompare(b.meta.docA.filename);
      return 0;
    });
  }, [batchResults, searchQuery, statusFilter, sortBy]);

  // Export batch summary to CSV
  const handleExportCsv = () => {
    if (!batchResults.length) return;

    const headers = [
      'Pair #',
      'Document A',
      'Document B',
      'Format A',
      'Format B',
      'Similarity %',
      'Added Words',
      'Deleted Words',
      'Unchanged Words',
      'Total Differences',
      'Verdict'
    ];

    const rows = batchResults.map((r, i) => [
      i + 1,
      `"${r.meta.docA.filename}"`,
      `"${r.meta.docB.filename}"`,
      r.meta.docA.format || '',
      r.meta.docB.format || '',
      r.metrics.lexicalSimilarityPercent,
      r.stats.wordsAdded,
      r.stats.wordsDeleted,
      r.stats.wordsUnchanged,
      r.stats.totalDifferences,
      `"${r.contextAnalysis?.verdictHeadline || ''}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Batch_Diff_Summary_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const totalPairs = batchResults.length;
  const avgSim = batchMetrics.averageSimilarityPercent ?? 0;
  const identicalCount = batchMetrics.identicalCount ?? 0;
  const mostChanged = batchMetrics.mostChangedPair;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Title & Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 dark:border-white/[0.08] gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-2xl bg-[#FFF4EF] dark:bg-[#FF5E1E]/15 text-[#FF5E1E] flex items-center justify-center shadow-sm">
            <Layers className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              Batch Document Intelligence
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Multi-document portfolio summary • Click any pair below to inspect full side-by-side diff
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center space-x-2 px-4 py-2 rounded-full bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-white/[0.08] text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm transition hover:scale-105 active:scale-95"
            title="Download CSV report of all comparisons"
          >
            <Download className="w-3.5 h-3.5 text-[#FF5E1E]" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={onResetBatch}
            className="flex items-center space-x-2 px-4 py-2 rounded-full bg-[#FF5E1E] hover:bg-[#FF733B] text-white text-xs font-bold shadow-md shadow-[#FF5E1E]/20 transition hover:scale-105 active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>New Batch</span>
          </button>
        </div>
      </div>

      {/* Aggregate Metrics Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#111726] border border-slate-200/80 dark:border-white/[0.08] shadow-card space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Total Analyzed
          </span>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
              {totalPairs}
            </span>
            <span className="text-xs font-bold text-slate-500">Pairs</span>
          </div>
          <p className="text-[11px] text-slate-400">Word-level aligned</p>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#111726] border border-slate-200/80 dark:border-white/[0.08] shadow-card space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Avg Similarity
          </span>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-black text-[#FF5E1E]">
              {avgSim}%
            </span>
            <span className="text-xs font-bold text-slate-500">Overall</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 mt-2 overflow-hidden">
            <div 
              className="bg-[#FF5E1E] h-full rounded-full transition-all duration-500"
              style={{ width: `${avgSim}%` }}
            />
          </div>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#111726] border border-slate-200/80 dark:border-white/[0.08] shadow-card space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Identical Pairs
          </span>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {identicalCount}
            </span>
            <span className="text-xs font-bold text-slate-500">100% Match</span>
          </div>
          <p className="text-[11px] text-slate-400">Zero delta detected</p>
        </div>

        <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#111726] border border-slate-200/80 dark:border-white/[0.08] shadow-card space-y-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center space-x-1">
            <TrendingDown className="w-3.5 h-3.5 text-rose-500" />
            <span>Most Changed</span>
          </span>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl sm:text-3xl font-black text-rose-500">
              {mostChanged ? `${mostChanged.similarityPercent}%` : 'N/A'}
            </span>
            <span className="text-xs font-bold text-slate-500">Match</span>
          </div>
          <p className="text-[11px] text-slate-400 truncate" title={mostChanged?.nameB || ''}>
            {mostChanged ? mostChanged.nameB : 'No deviations'}
          </p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#111726] border border-slate-200/80 dark:border-white/[0.08] shadow-card flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search pair filenames..."
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/[0.08] text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#FF5E1E]/50"
          />
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          {[
            { id: 'all', label: `All (${totalPairs})` },
            { id: 'major', label: '🔴 Major (<60%)' },
            { id: 'moderate', label: '🟡 Moderate' },
            { id: 'high', label: '🟢 High Match' },
            { id: 'identical', label: '🛡️ Identical' }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                statusFilter === tab.id
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Sort Select */}
        <div className="flex items-center space-x-2 shrink-0 self-end md:self-center">
          <span className="text-xs font-bold text-slate-400">Sort:</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/[0.08] text-xs font-bold text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#FF5E1E]/50"
          >
            <option value="most_changed">Most Changed First</option>
            <option value="least_changed">Least Changed First</option>
            <option value="most_diffs">Most Differences</option>
            <option value="name_asc">Document Name (A-Z)</option>
          </select>
        </div>
      </div>

      {/* Results Table & Cards */}
      <div className="space-y-3">
        {filteredPairs.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-white dark:bg-[#111726] border border-slate-200/80 dark:border-white/[0.08] text-slate-400 text-xs font-semibold space-y-2">
            <Filter className="w-8 h-8 mx-auto text-slate-300" />
            <p>No document pairs match your search or filter.</p>
          </div>
        ) : (
          filteredPairs.map((pair, idx) => {
            const sim = pair.metrics.lexicalSimilarityPercent;
            const badge = getStatusBadge(sim);

            return (
              <div
                key={pair.pairId || idx}
                onClick={() => onInspectPair(pair)}
                className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#111726] border border-slate-200/80 dark:border-white/[0.08] shadow-card hover:border-[#FF5E1E]/50 hover:shadow-lg transition-all duration-300 cursor-pointer flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 group"
              >
                {/* Left: Index, Status Badge, Pair Names */}
                <div className="flex items-start sm:items-center space-x-3.5 flex-1 min-w-0">
                  <span className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs font-black shrink-0">
                    {idx + 1}
                  </span>

                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black border flex items-center space-x-1 ${badge.color}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                        <span>{badge.label}</span>
                      </span>

                      <span className="text-[11px] text-slate-400 font-medium">
                        {pair.stats.totalDifferences} differences detected
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm font-black text-slate-900 dark:text-white">
                      <span className="truncate max-w-[220px] sm:max-w-[300px]" title={pair.meta.docA.filename}>
                        {pair.meta.docA.filename}
                      </span>
                      <span className="text-slate-400 px-1 font-normal">&rarr;</span>
                      <span className="truncate max-w-[220px] sm:max-w-[300px] text-[#FF5E1E]" title={pair.meta.docB.filename}>
                        {pair.meta.docB.filename}
                      </span>
                    </div>

                    {pair.contextAnalysis?.verdictHeadline && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-xl">
                        {pair.contextAnalysis.verdictHeadline}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Similarity Metric, Stats Chips, Inspect Button */}
                <div className="flex items-center space-x-6 shrink-0 self-end lg:self-center w-full lg:w-auto justify-between lg:justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100 dark:border-white/[0.04]">
                  {/* Delta stats chips */}
                  <div className="hidden sm:flex items-center space-x-2 text-xs font-bold">
                    <span className="px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 text-[11px]">
                      +{pair.stats.wordsAdded}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-rose-50 dark:bg-rose-950/30 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-[11px]">
                      -{pair.stats.wordsDeleted}
                    </span>
                  </div>

                  {/* Similarity Gauge */}
                  <div className="text-right">
                    <span className="text-xs font-bold text-slate-400 block">Match</span>
                    <span className={`text-xl sm:text-2xl font-black ${
                      sim >= 90 ? 'text-emerald-500' : sim >= 60 ? 'text-amber-500' : 'text-rose-500'
                    }`}>
                      {sim}%
                    </span>
                  </div>

                  {/* Inspect Button */}
                  <div className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:bg-[#FF5E1E] text-slate-700 dark:text-slate-200 group-hover:text-white transition-all text-xs font-bold shadow-xs">
                    <span>Inspect</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
