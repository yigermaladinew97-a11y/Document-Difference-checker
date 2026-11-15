import React, { useState } from 'react';
import { Layers, ChevronDown, ChevronUp, Check, AlertCircle, Plus, Minus } from 'lucide-react';

export default function SectionBreakdown({ sectionReports }) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!sectionReports || sectionReports.length === 0) return null;

  const getStatusBadge = (status, pct) => {
    switch (status) {
      case 'UNCHANGED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Check className="w-3 h-3" />
            <span>100% MATCH</span>
          </span>
        );
      case 'MODIFIED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <AlertCircle className="w-3 h-3" />
            <span>{pct}% MATCH</span>
          </span>
        );
      case 'ADDED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Plus className="w-3 h-3" />
            <span>ADDED</span>
          </span>
        );
      case 'DELETED':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <Minus className="w-3 h-3" />
            <span>REMOVED</span>
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="rounded-3xl bg-dark-900/90 border border-white/[0.08] shadow-2xl backdrop-blur-xl overflow-hidden transition-all">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-6 flex items-center justify-between text-left hover:bg-white/[0.02] transition"
      >
        <div className="flex items-center space-x-3.5">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white tracking-tight">
              Section, Slide & Page Breakdown ({sectionReports.length} {sectionReports.length === 1 ? 'segment' : 'segments'})
            </h3>
            <p className="text-xs text-slate-400">Detailed line-item comparison by Page, Slide, Sheet, or Paragraph</p>
          </div>
        </div>
        <div className="p-2 rounded-xl bg-dark-950/80 border border-white/[0.06] text-slate-400 hover:text-white transition">
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {isExpanded && (
        <div className="p-6 pt-0 border-t border-white/[0.06]">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-5">
            {sectionReports.map((sec, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-dark-950/60 border border-white/[0.06] hover:border-white/[0.12] flex flex-col justify-between space-y-3 transition group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 truncate font-mono">{sec.title}</span>
                  {getStatusBadge(sec.status, sec.similarityPercent)}
                </div>

                {/* Match Progress Bar */}
                <div className="w-full bg-dark-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-700 ${
                      sec.similarityPercent === 100
                        ? 'bg-emerald-500'
                        : sec.similarityPercent > 60
                        ? 'bg-sky-500'
                        : sec.similarityPercent > 0
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${sec.similarityPercent}%` }}
                  />
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
