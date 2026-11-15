import React, { useState } from 'react';
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
  ArrowRightLeft
} from 'lucide-react';
import SectionInspectModal from './SectionInspectModal';

export default function SectionBreakdown({ sectionReports, meta }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [inspectedSection, setInspectedSection] = useState(null);

  if (!sectionReports || sectionReports.length === 0) return null;

  const getStatusBadge = (status, pct) => {
    switch (status) {
      case 'UNCHANGED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <Check className="w-3 h-3" />
            <span>100% MATCH</span>
          </span>
        );
      case 'MOVED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
            <ArrowRightLeft className="w-3 h-3" />
            <span>MOVED ({pct}%)</span>
          </span>
        );
      case 'MODIFIED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
            <AlertCircle className="w-3 h-3" />
            <span>{pct}% MATCH</span>
          </span>
        );
      case 'ADDED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
            <Plus className="w-3 h-3" />
            <span>ADDED</span>
          </span>
        );
      case 'DELETED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
            <Minus className="w-3 h-3" />
            <span>REMOVED</span>
          </span>
        );
      default:
        return null;
    }
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
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full p-7 sm:p-8 flex items-center justify-between text-left hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition cursor-pointer"
        >
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-sm">
              <Layers className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white tracking-tight">
                  Section & Page-Level Breakdown ({sectionReports.length} {sectionReports.length === 1 ? 'part' : 'parts'})
                </h3>
                <span className="hidden sm:inline px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FF5E1E]/10 text-[#FF5E1E] uppercase">
                  Click card to inspect
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Click any page or slide card below to inspect its exact isolated word differences
              </p>
            </div>
          </div>
          <div className="p-2.5 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>

        {isExpanded && (
          <div className="p-7 sm:p-8 pt-0 border-t border-slate-100 dark:border-white/[0.06]">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
              {sectionReports.map((sec, idx) => (
                <div
                  key={idx}
                  onClick={() => setInspectedSection(sec)}
                  className={`group relative p-5 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-3 ${
                    sec.status === 'MOVED'
                      ? 'bg-purple-50/30 dark:bg-purple-950/20 border-purple-200/80 dark:border-purple-800/40 hover:border-purple-500 hover:bg-white dark:hover:bg-slate-900 hover:shadow-lg hover:-translate-y-1'
                      : sec.status !== 'UNCHANGED'
                      ? 'bg-slate-50 dark:bg-slate-900/60 border-slate-200/80 dark:border-white/[0.08] hover:border-[#FF5E1E] hover:bg-white dark:hover:bg-slate-900 hover:shadow-lg hover:-translate-y-1'
                      : 'bg-slate-50/50 dark:bg-slate-900/40 border-slate-200/50 dark:border-white/[0.04] hover:border-slate-300 hover:bg-white hover:shadow-sm'
                  }`}
                  title="Click to view detailed differences for this slide"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-[#FF5E1E] transition-colors">
                      {sec.title}
                    </span>
                    {getStatusBadge(sec.status, sec.similarityPercent)}
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full transition-all duration-700 ${
                        sec.status === 'MOVED'
                          ? 'bg-purple-500'
                          : sec.similarityPercent === 100
                          ? 'bg-emerald-500'
                          : sec.similarityPercent > 60
                          ? 'bg-[#FF5E1E]'
                          : sec.similarityPercent > 0
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${sec.similarityPercent}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between pt-0.5">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium truncate">
                      {sec.description}
                    </p>
                    <span className="opacity-0 group-hover:opacity-100 flex items-center space-x-1 text-[11px] font-bold text-[#FF5E1E] transition-opacity shrink-0 ml-2">
                      <span>Inspect</span>
                      <ArrowUpRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
