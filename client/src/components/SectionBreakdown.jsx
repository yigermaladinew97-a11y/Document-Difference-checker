import React, { useState } from 'react';
import { Layers, ChevronDown, ChevronUp, Check, AlertCircle, Plus, Minus } from 'lucide-react';

export default function SectionBreakdown({ sectionReports }) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!sectionReports || sectionReports.length === 0) return null;

  const getStatusBadge = (status, pct) => {
    switch (status) {
      case 'UNCHANGED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Check className="w-3 h-3" />
            <span>100% Match</span>
          </span>
        );
      case 'MODIFIED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertCircle className="w-3 h-3" />
            <span>{pct}% Match</span>
          </span>
        );
      case 'ADDED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Plus className="w-3 h-3" />
            <span>Added</span>
          </span>
        );
      case 'DELETED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Minus className="w-3 h-3" />
            <span>Removed</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-5 flex items-center justify-between text-left hover:bg-slate-800/30 transition"
      >
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-sm text-white">
              Section & Page-Level Breakdown ({sectionReports.length} {sectionReports.length === 1 ? 'part' : 'parts'})
            </h3>
            <p className="text-xs text-slate-400">Granular breakdown by Page, Slide, Sheet, or Paragraph</p>
          </div>
        </div>
        <div className="p-1 rounded-lg text-slate-400 hover:text-white">
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </button>

      {isExpanded && (
        <div className="p-5 pt-0 border-t border-slate-800/80">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
            {sectionReports.map((sec, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 flex flex-col justify-between space-y-2 hover:border-slate-700 transition"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200 truncate">{sec.title}</span>
                  {getStatusBadge(sec.status, sec.similarityPercent)}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">{sec.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
