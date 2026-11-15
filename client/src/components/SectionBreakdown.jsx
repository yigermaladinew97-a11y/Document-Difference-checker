import React, { useState, useMemo } from 'react';
import { 
  Layers, 
  ChevronDown, 
  ChevronUp, 
  Check, 
  AlertCircle, 
  Plus, 
  Minus,
  Search,
  ArrowUpRight,
  ArrowRightLeft,
  LayoutGrid,
  List,
  Sparkles,
  Filter,
  Eye,
  Info
} from 'lucide-react';
import SectionInspectModal from './SectionInspectModal';

export default function SectionBreakdown({ sectionReports, meta }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeFilter, setActiveFilter] = useState('ALL'); // ALL, MODIFIED, MOVED, ADDED, DELETED, UNCHANGED, CHANGES_ONLY
  const [viewMode, setViewMode] = useState(() => sectionReports && sectionReports.length > 12 ? 'table' : 'cards');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroupIds, setExpandedGroupIds] = useState(new Set());
  const [inspectedSection, setInspectedSection] = useState(null);
  const [hoveredTile, setHoveredTile] = useState(null);

  if (!sectionReports || sectionReports.length === 0) return null;

  // Counts by status
  const counts = useMemo(() => {
    let modified = 0, moved = 0, added = 0, deleted = 0, unchanged = 0;
    for (const s of sectionReports) {
      if (s.status === 'MODIFIED') modified++;
      else if (s.status === 'MOVED') moved++;
      else if (s.status === 'ADDED') added++;
      else if (s.status === 'DELETED') deleted++;
      else if (s.status === 'UNCHANGED') unchanged++;
    }
    const changesCount = modified + moved + added + deleted;
    return { modified, moved, added, deleted, unchanged, changesCount, total: sectionReports.length };
  }, [sectionReports]);

  // Status Badge Component
  const getStatusBadge = (status, pct) => {
    switch (status) {
      case 'UNCHANGED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shrink-0">
            <Check className="w-3 h-3" />
            <span>100% MATCH</span>
          </span>
        );
      case 'MOVED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shrink-0">
            <ArrowRightLeft className="w-3 h-3" />
            <span>MOVED ({pct}%)</span>
          </span>
        );
      case 'MODIFIED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 shrink-0">
            <AlertCircle className="w-3 h-3" />
            <span>{pct}% MATCH</span>
          </span>
        );
      case 'ADDED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 shrink-0">
            <Plus className="w-3 h-3" />
            <span>ADDED</span>
          </span>
        );
      case 'DELETED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 shrink-0">
            <Minus className="w-3 h-3" />
            <span>REMOVED</span>
          </span>
        );
      default:
        return null;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'MODIFIED': return 'bg-amber-500 hover:bg-amber-400 text-white';
      case 'MOVED': return 'bg-purple-500 hover:bg-purple-400 text-white';
      case 'ADDED': return 'bg-blue-500 hover:bg-blue-400 text-white';
      case 'DELETED': return 'bg-rose-500 hover:bg-rose-400 text-white';
      case 'UNCHANGED': return 'bg-emerald-500 hover:bg-emerald-400 text-white';
      default: return 'bg-slate-300 dark:bg-slate-700 text-slate-700';
    }
  };

  // Filter sections by status and search query
  const filteredSections = useMemo(() => {
    return sectionReports.filter((sec) => {
      // Status filter
      if (activeFilter === 'CHANGES_ONLY') {
        if (sec.status === 'UNCHANGED') return false;
      } else if (activeFilter !== 'ALL') {
        if (sec.status !== activeFilter) return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const titleMatch = sec.title?.toLowerCase().includes(query);
        const descMatch = sec.description?.toLowerCase().includes(query);
        return titleMatch || descMatch;
      }

      return true;
    });
  }, [sectionReports, activeFilter, searchQuery]);

  // Group consecutive identical status sections (e.g. Pages 6-13 all removed)
  const groupedDisplayItems = useMemo(() => {
    // If user is searching or viewing modified only, do not group
    if (searchQuery.trim() || activeFilter === 'MODIFIED' || activeFilter === 'MOVED') {
      return filteredSections.map(sec => ({ isGroup: false, ...sec }));
    }

    const rawGroups = [];
    let currentGroup = null;

    for (let i = 0; i < filteredSections.length; i++) {
      const sec = filteredSections[i];
      const canGroup = (sec.status === 'DELETED' || sec.status === 'ADDED' || sec.status === 'UNCHANGED');

      if (canGroup) {
        if (currentGroup && currentGroup.status === sec.status) {
          currentGroup.items.push(sec);
          continue;
        } else {
          if (currentGroup) rawGroups.push(currentGroup);
          currentGroup = {
            isGroup: true,
            id: `grp-${sec.status}-${i}`,
            status: sec.status,
            items: [sec]
          };
          continue;
        }
      } else {
        if (currentGroup) {
          rawGroups.push(currentGroup);
          currentGroup = null;
        }
        rawGroups.push({ isGroup: false, ...sec });
      }
    }

    if (currentGroup) {
      rawGroups.push(currentGroup);
    }

    // Unpack groups with fewer than 3 items
    const finalItems = [];
    for (const item of rawGroups) {
      if (item.isGroup) {
        if (item.items.length < 3) {
          item.items.forEach(s => finalItems.push({ isGroup: false, ...s }));
        } else {
          const first = item.items[0];
          const last = item.items[item.items.length - 1];
          const firstTitle = first.title || `Item 1`;
          const lastTitle = last.title || `Item ${item.items.length}`;
          finalItems.push({
            ...item,
            rangeTitle: `${firstTitle} – ${lastTitle}`,
            count: item.items.length
          });
        }
      } else {
        finalItems.push(item);
      }
    }

    return finalItems;
  }, [filteredSections, searchQuery, activeFilter]);

  const toggleGroupExpand = (groupId) => {
    setExpandedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  return (
    <>
      {/* Detail Inspector Modal */}
      {inspectedSection && (
        <SectionInspectModal
          section={inspectedSection}
          onClose={() => setInspectedSection(null)}
          meta={meta}
        />
      )}

      <div className="rounded-[32px] bg-white dark:bg-[#111726] border border-slate-200/80 dark:border-white/[0.08] shadow-card overflow-hidden transition-all">
        
        {/* Header Bar */}
        <div className="p-6 sm:p-7 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-slate-900/30">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-xs">
              <Layers className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white tracking-tight">
                  Section & Page-Level Breakdown
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#FF5E1E]/10 text-[#FF5E1E] border border-[#FF5E1E]/20 uppercase">
                  {sectionReports.length} {sectionReports.length === 1 ? 'Section' : 'Sections'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Interactive page map, consecutive grouping, and isolated redline inspection
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {/* View Switcher: Table vs Cards */}
            <div className="flex bg-white dark:bg-slate-950 p-1 rounded-full border border-slate-200/80 dark:border-white/[0.08] text-xs shadow-xs">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-full font-bold transition-all ${
                  viewMode === 'table'
                    ? 'bg-[#FF5E1E] text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Table List View"
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Table</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`flex items-center space-x-1.5 px-3 py-1 rounded-full font-bold transition-all ${
                  viewMode === 'cards'
                    ? 'bg-[#FF5E1E] text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
                title="Cards Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cards</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-2 rounded-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/[0.08] text-slate-500 hover:text-slate-900 dark:hover:text-white transition hover:scale-105"
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {isExpanded && (
          <div className="p-6 sm:p-8 space-y-6">

            {/* 1. DOCUMENT HEATMAP STRIP (Bird's-Eye View) */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-white/[0.06] space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center space-x-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#FF5E1E]" />
                    <span>Document Heatmap Strip</span>
                  </span>
                  <span className="text-[11px] text-slate-400 font-medium">
                    (Hover to preview &bull; Click to inspect isolated page)
                  </span>
                </div>

                {/* Heatmap Legend */}
                <div className="flex items-center space-x-3 text-[11px] font-bold text-slate-500 dark:text-slate-400 flex-wrap">
                  <span className="flex items-center space-x-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-amber-500 inline-block" />
                    <span>Modified ({counts.modified})</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-purple-500 inline-block" />
                    <span>Moved ({counts.moved})</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-blue-500 inline-block" />
                    <span>Added ({counts.added})</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" />
                    <span>Removed ({counts.deleted})</span>
                  </span>
                  <span className="flex items-center space-x-1">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
                    <span>Identical ({counts.unchanged})</span>
                  </span>
                </div>
              </div>

              {/* Heatmap Micro-Tiles Grid Strip */}
              <div className="relative">
                <div className="flex flex-wrap gap-1.5 p-2 rounded-xl bg-white dark:bg-slate-950 border border-slate-200/60 dark:border-white/[0.04] max-h-36 overflow-y-auto">
                  {sectionReports.map((sec, idx) => {
                    const isHovered = hoveredTile === idx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setInspectedSection(sec)}
                        onMouseEnter={() => setHoveredTile(idx)}
                        onMouseLeave={() => setHoveredTile(null)}
                        className={`relative h-7 min-w-7 px-1.5 rounded-md font-mono text-[10px] font-bold flex items-center justify-center transition-all duration-150 cursor-pointer shadow-2xs hover:scale-125 hover:z-20 ${getStatusColor(sec.status)}`}
                        title={`${sec.title} (${sec.status}) - Click to inspect`}
                      >
                        <span>{idx + 1}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Floating Tooltip details if hovering a tile */}
                {hoveredTile !== null && sectionReports[hoveredTile] && (
                  <div className="mt-2 p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200/80 dark:border-white/[0.1] shadow-lg flex items-center justify-between text-xs animate-in fade-in duration-100">
                    <div className="flex items-center space-x-2 truncate">
                      <span className="font-black text-slate-900 dark:text-white">
                        {sectionReports[hoveredTile].title}
                      </span>
                      {getStatusBadge(sectionReports[hoveredTile].status, sectionReports[hoveredTile].similarityPercent)}
                      <span className="text-slate-500 truncate">
                        &bull; {sectionReports[hoveredTile].description}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-[#FF5E1E] shrink-0 ml-2">
                      Click to Inspect ↗
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 2. FILTER TABS & SEARCH CONTROLS */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {/* Changes Only Quick Toggle */}
                {counts.changesCount > 0 && counts.unchanged > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveFilter(activeFilter === 'CHANGES_ONLY' ? 'ALL' : 'CHANGES_ONLY')}
                    className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all ${
                      activeFilter === 'CHANGES_ONLY'
                        ? 'bg-[#FF5E1E] text-white border-transparent shadow-xs scale-105'
                        : 'bg-[#FF5E1E]/10 hover:bg-[#FF5E1E]/20 text-[#FF5E1E] border-[#FF5E1E]/30'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Changes Only ({counts.changesCount})</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setActiveFilter('ALL')}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                    activeFilter === 'ALL'
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-transparent shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200/80 dark:border-white/[0.08] hover:border-slate-300'
                  }`}
                >
                  All ({counts.total})
                </button>

                {counts.modified > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveFilter('MODIFIED')}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                      activeFilter === 'MODIFIED'
                        ? 'bg-amber-500 text-white border-transparent shadow-xs'
                        : 'bg-white dark:bg-slate-900 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800 hover:bg-amber-50'
                    }`}
                  >
                    ✏️ Modified ({counts.modified})
                  </button>
                )}

                {counts.moved > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveFilter('MOVED')}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                      activeFilter === 'MOVED'
                        ? 'bg-purple-600 text-white border-transparent shadow-xs'
                        : 'bg-white dark:bg-slate-900 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800 hover:bg-purple-50'
                    }`}
                  >
                    🔄 Moved ({counts.moved})
                  </button>
                )}

                {counts.added > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveFilter('ADDED')}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                      activeFilter === 'ADDED'
                        ? 'bg-blue-600 text-white border-transparent shadow-xs'
                        : 'bg-white dark:bg-slate-900 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-50'
                    }`}
                  >
                    ➕ Added ({counts.added})
                  </button>
                )}

                {counts.deleted > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveFilter('DELETED')}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                      activeFilter === 'DELETED'
                        ? 'bg-rose-600 text-white border-transparent shadow-xs'
                        : 'bg-white dark:bg-slate-900 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800 hover:bg-rose-50'
                    }`}
                  >
                    ➖ Removed ({counts.deleted})
                  </button>
                )}

                {counts.unchanged > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveFilter('UNCHANGED')}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-all ${
                      activeFilter === 'UNCHANGED'
                        ? 'bg-emerald-600 text-white border-transparent shadow-xs'
                        : 'bg-white dark:bg-slate-900 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50'
                    }`}
                  >
                    Identical ({counts.unchanged})
                  </button>
                )}
              </div>

              {/* Search Box */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter page or slide..."
                  className="pl-9 pr-3.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/[0.08] rounded-full text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF5E1E]/30 w-44 sm:w-56 shadow-xs font-medium"
                />
              </div>
            </div>

            {/* 3. SECTION PRESENTATION: TABLE / LIST VIEW (Default for large docs) */}
            {viewMode === 'table' ? (
              <div className="rounded-2xl border border-slate-200/80 dark:border-white/[0.08] overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-100 dark:border-white/[0.06] text-slate-400 uppercase font-black text-[10px] tracking-wider">
                        <th className="py-3 px-4">Section / Page</th>
                        <th className="py-3 px-4">Status & Similarity</th>
                        <th className="py-3 px-4">Difference Summary</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-white/[0.04]">
                      {groupedDisplayItems.map((item, idx) => {
                        // Check if item is a collapsed Range Group
                        if (item.isGroup) {
                          const isGroupExpanded = expandedGroupIds.has(item.id);
                          const isDeleted = item.status === 'DELETED';
                          const isAdded = item.status === 'ADDED';

                          return (
                            <React.Fragment key={item.id}>
                              {/* Range Group Summary Header Row */}
                              <tr 
                                onClick={() => toggleGroupExpand(item.id)}
                                className={`cursor-pointer transition-colors ${
                                  isDeleted 
                                    ? 'bg-rose-50/40 dark:bg-rose-950/20 hover:bg-rose-50/80' 
                                    : isAdded 
                                    ? 'bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-50/80' 
                                    : 'bg-slate-50/60 dark:bg-slate-900/40 hover:bg-slate-100/60'
                                }`}
                              >
                                <td className="py-3 px-4 font-black text-slate-800 dark:text-slate-200">
                                  <div className="flex items-center space-x-2">
                                    <span className="w-2 h-2 rounded-full bg-[#FF5E1E]" />
                                    <span>{item.rangeTitle}</span>
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/[0.1] text-slate-600 dark:text-slate-300">
                                      {item.count} consecutive pages
                                    </span>
                                  </div>
                                </td>
                                <td className="py-3 px-4">
                                  {getStatusBadge(item.status, 0)}
                                </td>
                                <td className="py-3 px-4 text-slate-500 dark:text-slate-400 font-medium">
                                  {isDeleted
                                    ? `${item.count} consecutive pages omitted from Document B`
                                    : isAdded
                                    ? `${item.count} consecutive new pages introduced in Document B`
                                    : `${item.count} identical pages matching 100%`}
                                </td>
                                <td className="py-3 px-4 text-right">
                                  <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); toggleGroupExpand(item.id); }}
                                    className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/[0.1] text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-[#FF5E1E] transition"
                                  >
                                    <span>{isGroupExpanded ? 'Collapse' : `Expand (${item.count})`}</span>
                                    {isGroupExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                  </button>
                                </td>
                              </tr>

                              {/* Nested individual items when expanded */}
                              {isGroupExpanded && item.items.map((subSec, sIdx) => (
                                <tr 
                                  key={`${item.id}-${sIdx}`}
                                  onClick={() => setInspectedSection(subSec)}
                                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer bg-white dark:bg-slate-900"
                                >
                                  <td className="py-2.5 px-4 pl-8 text-slate-700 dark:text-slate-300 font-bold truncate">
                                    <span className="text-slate-400 mr-2 font-mono text-[11px]">&bull;</span>
                                    <span>{subSec.title}</span>
                                  </td>
                                  <td className="py-2.5 px-4">
                                    {getStatusBadge(subSec.status, subSec.similarityPercent)}
                                  </td>
                                  <td className="py-2.5 px-4 text-slate-500 dark:text-slate-400 font-medium truncate max-w-md">
                                    {subSec.description}
                                  </td>
                                  <td className="py-2.5 px-4 text-right">
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); setInspectedSection(subSec); }}
                                      className="inline-flex items-center space-x-1 text-xs font-bold text-[#FF5E1E] hover:underline"
                                    >
                                      <span>Inspect</span>
                                      <ArrowUpRight className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </React.Fragment>
                          );
                        }

                        // Regular individual row
                        return (
                          <tr 
                            key={idx}
                            onClick={() => setInspectedSection(item)}
                            className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer"
                          >
                            <td className="py-3 px-4 font-bold text-slate-900 dark:text-white truncate max-w-xs">
                              {item.title}
                            </td>
                            <td className="py-3 px-4">
                              {getStatusBadge(item.status, item.similarityPercent)}
                            </td>
                            <td className="py-3 px-4 text-slate-600 dark:text-slate-300 font-medium truncate max-w-md">
                              {item.description}
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setInspectedSection(item); }}
                                className="inline-flex items-center space-x-1 px-3 py-1 rounded-full bg-[#FF5E1E]/10 hover:bg-[#FF5E1E]/20 text-[#FF5E1E] text-xs font-bold transition hover:scale-105"
                              >
                                <span>Inspect</span>
                                <ArrowUpRight className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {filteredSections.length === 0 && (
                  <div className="p-8 text-center text-slate-400 text-xs font-medium">
                    No sections matched the selected filter or search query.
                  </div>
                )}
              </div>
            ) : (
              /* 4. SECTION PRESENTATION: CARD GRID VIEW */
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {groupedDisplayItems.map((item, idx) => {
                  if (item.isGroup) {
                    const isGroupExpanded = expandedGroupIds.has(item.id);
                    return (
                      <div
                        key={item.id}
                        className="col-span-full p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-white/[0.08] flex items-center justify-between"
                      >
                        <div className="flex items-center space-x-3">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#FF5E1E]" />
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-black text-slate-900 dark:text-white">{item.rangeTitle}</span>
                              {getStatusBadge(item.status, 0)}
                            </div>
                            <p className="text-xs text-slate-400 font-medium mt-0.5">
                              {item.count} consecutive pages grouped to reduce clutter
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => toggleGroupExpand(item.id)}
                          className="px-4 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/[0.1] text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-[#FF5E1E] flex items-center space-x-1.5 transition"
                        >
                          <span>{isGroupExpanded ? 'Collapse' : `Expand (${item.count} Cards)`}</span>
                          {isGroupExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={idx}
                      onClick={() => setInspectedSection(item)}
                      className={`group relative p-5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-3 ${
                        item.status === 'MOVED'
                          ? 'bg-purple-50/30 dark:bg-purple-950/20 border-purple-200/80 dark:border-purple-800/40 hover:border-purple-500 hover:bg-white dark:hover:bg-slate-900 hover:shadow-lg hover:-translate-y-1'
                          : item.status !== 'UNCHANGED'
                          ? 'bg-slate-50 dark:bg-slate-900/60 border-slate-200/80 dark:border-white/[0.08] hover:border-[#FF5E1E] hover:bg-white dark:hover:bg-slate-900 hover:shadow-lg hover:-translate-y-1'
                          : 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-200/50 dark:border-white/[0.04] hover:border-slate-300 hover:bg-white hover:shadow-xs'
                      }`}
                      title="Click to view detailed differences for this slide"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-[#FF5E1E] transition-colors">
                          {item.title}
                        </span>
                        {getStatusBadge(item.status, item.similarityPercent)}
                      </div>

                      {/* Progress bar */}
                      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full transition-all duration-700 ${
                            item.status === 'MOVED'
                              ? 'bg-purple-500'
                              : item.similarityPercent === 100
                              ? 'bg-emerald-500'
                              : item.similarityPercent > 60
                              ? 'bg-[#FF5E1E]'
                              : item.similarityPercent > 0
                              ? 'bg-amber-500'
                              : 'bg-rose-500'
                          }`}
                          style={{ width: `${item.similarityPercent}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between pt-0.5">
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                          {item.description}
                        </p>
                        <span className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 text-[11px] font-bold text-[#FF5E1E] transition-opacity shrink-0 ml-2">
                          <span>Inspect</span>
                          <ArrowUpRight className="w-3.5 h-3.5" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
