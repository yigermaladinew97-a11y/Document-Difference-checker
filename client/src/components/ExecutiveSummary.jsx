import React from 'react';
import { 
  Sparkles, 
  Scale, 
  Volume2, 
  ShieldAlert, 
  FileCheck2,
  CheckCircle2,
  AlertTriangle,
  Info,
  Layers,
  ArrowRight,
  TrendingUp,
  PlusCircle,
  MinusCircle,
  RefreshCw,
  FileText
} from 'lucide-react';

export default function ExecutiveSummary({ contextAnalysis, summary }) {
  if (!contextAnalysis) return null;

  const isAi = contextAnalysis.mode === 'ai';
  const breakdown = contextAnalysis.structuralBreakdown || {};
  const explanations = contextAnalysis.explanations || [];
  const verdictHeadline = contextAnalysis.verdictHeadline || summary?.headline || 'Executive Difference Summary';

  return (
    <div className="rounded-[32px] bg-white dark:bg-[#111726] border border-slate-200/80 dark:border-white/[0.08] p-4 sm:p-7 md:p-9 shadow-card space-y-6 sm:space-y-7 transition-all">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-5 border-b border-slate-100 dark:border-white/[0.06] gap-3">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-2xl bg-[#FFF4EF] dark:bg-[#FF5E1E]/15 text-[#FF5E1E] flex items-center justify-center shadow-sm">
            <Sparkles className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              What Changed? (Summary in Plain English)
              {isAi ? (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  AI Summary
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-white/[0.08]">
                  Automated Summary
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400 font-medium">
              {isAi 
                ? 'AI-powered summary of the main differences between your documents' 
                : 'A quick, simple summary of the key changes so you do not have to read every line'}
            </p>
          </div>
        </div>

        {contextAnalysis.toneShift && (
          <div className="flex items-center space-x-2 px-4 py-1.5 rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-white/[0.08] text-xs shadow-sm">
            <Volume2 className="w-3.5 h-3.5 text-[#FF5E1E]" />
            <span className="text-slate-400 font-medium">Tone:</span>
            <span className="text-slate-800 dark:text-white font-bold">{contextAnalysis.toneShift}</span>
          </div>
        )}
      </div>

      {/* Hero Executive Takeaway Card (Replaces the plain wall of text!) */}
      <div className="rounded-3xl bg-gradient-to-br from-[#FFF9F6] via-[#FFF4EF] to-white dark:from-[#FF5E1E]/10 dark:via-slate-900/60 dark:to-slate-900/40 border border-[#FFD6C4] dark:border-[#FF5E1E]/25 p-6 sm:p-7 shadow-sm space-y-5">
        
        {/* Top Tag & Verdict Badge */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF5E1E] animate-pulse" />
            <span className="text-xs font-black text-[#FF5E1E] uppercase tracking-widest flex items-center space-x-1.5">
              <FileCheck2 className="w-4 h-4 stroke-[2.5]" />
              <span>30-Second Summary</span>
            </span>
          </div>

          <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-white/[0.1] shadow-xs">
            {summary?.category?.replace('_', ' ') || 'COMPARISON COMPLETE'}
          </span>
        </div>

        {/* Big Bold Verdict Headline */}
        <div>
          <h4 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
            {verdictHeadline}
          </h4>
          <p className="text-sm text-slate-700 dark:text-slate-300 font-medium mt-2 leading-relaxed">
            {contextAnalysis.executiveSummary}
          </p>
        </div>

        {/* Structural Changes Mini Stats Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
          {/* Modified */}
          <div className="p-3 rounded-2xl bg-white/90 dark:bg-slate-900/80 border border-slate-200/70 dark:border-white/[0.08] shadow-xs">
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
              Edited Paragraphs
            </span>
            <span className="text-lg font-black text-slate-900 dark:text-white font-mono mt-0.5 block">
              {breakdown.modifiedCount ?? 0}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">text revisions</span>
          </div>

          {/* Added */}
          <div className="p-3 rounded-2xl bg-white/90 dark:bg-slate-900/80 border border-slate-200/70 dark:border-white/[0.08] shadow-xs">
            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider block">
              New Additions
            </span>
            <span className="text-lg font-black text-blue-600 dark:text-blue-400 font-mono mt-0.5 block">
              +{breakdown.addedCount ?? 0}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">added in new version</span>
          </div>

          {/* Removed */}
          <div className="p-3 rounded-2xl bg-white/90 dark:bg-slate-900/80 border border-slate-200/70 dark:border-white/[0.08] shadow-xs">
            <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider block">
              Deleted Content
            </span>
            <span className="text-lg font-black text-rose-600 dark:text-rose-400 font-mono mt-0.5 block">
              -{breakdown.deletedCount ?? 0}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">removed from old version</span>
          </div>

          {/* Relocated / Unchanged */}
          <div className="p-3 rounded-2xl bg-white/90 dark:bg-slate-900/80 border border-slate-200/70 dark:border-white/[0.08] shadow-xs">
            <span className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider block">
              Moved Content
            </span>
            <span className="text-lg font-black text-purple-600 dark:text-purple-400 font-mono mt-0.5 block">
              {breakdown.movedCount ?? 0}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">reordered positions</span>
          </div>
        </div>
      </div>

      {/* Key Explanations & Takeaways List */}
      {explanations.length > 0 && (
        <div className="space-y-3.5">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-lg bg-[#FFF4EF] dark:bg-[#FF5E1E]/15 text-[#FF5E1E] flex items-center justify-center">
              <Layers className="w-3.5 h-3.5" />
            </div>
            <h4 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              Specific Differences Explained in Simple English
            </h4>
          </div>

          <div className="space-y-2.5">
            {explanations.map((exp, idx) => {
              const isWarning = exp.type === 'warning';
              const isSuccess = exp.type === 'success';

              return (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border transition-all duration-200 flex items-start space-x-3.5 ${
                    isWarning
                      ? 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/40'
                      : isSuccess
                        ? 'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-200/80 dark:border-emerald-900/40'
                        : 'bg-slate-50/80 dark:bg-slate-900/50 border-slate-200/70 dark:border-white/[0.06] hover:bg-white dark:hover:bg-slate-900'
                  }`}
                >
                  <div className={`p-1.5 rounded-xl shrink-0 mt-0.5 ${
                    isWarning 
                      ? 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300' 
                      : isSuccess
                        ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                        : 'bg-[#FFF4EF] dark:bg-[#FF5E1E]/15 text-[#FF5E1E]'
                  }`}>
                    {isWarning ? (
                      <AlertTriangle className="w-4 h-4" />
                    ) : isSuccess ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Info className="w-4 h-4" />
                    )}
                  </div>

                  <div className="flex-1 space-y-0.5">
                    <h5 className="text-xs font-black text-slate-900 dark:text-white">
                      {exp.title}
                    </h5>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                      {exp.detail}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Critical Discrepancies Alerts */}
      {contextAnalysis.criticalAlerts && contextAnalysis.criticalAlerts.length > 0 && (
        <div className="p-6 rounded-2xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 space-y-2.5">
          <div className="flex items-center space-x-2 text-rose-600 dark:text-rose-400 font-bold text-xs uppercase tracking-wider">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>High-Risk Discrepancies & Modified Obligations</span>
          </div>
          <ul className="space-y-1.5 pl-6 list-disc text-xs text-rose-800 dark:text-rose-200/90 leading-relaxed font-medium">
            {contextAnalysis.criticalAlerts.map((alert, idx) => (
              <li key={idx}>{alert}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Key Content & Meaning Adjustments Grid */}
      {contextAnalysis.keySemanticChanges && contextAnalysis.keySemanticChanges.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center space-x-2">
            <Scale className="w-3.5 h-3.5 text-[#FF5E1E]" />
            <span>Key Content & Contractual Adjustments</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {contextAnalysis.keySemanticChanges.map((change, idx) => (
              <div 
                key={idx} 
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/[0.06] hover:border-[#FF5E1E]/40 hover:shadow-sm transition flex items-start space-x-3 text-xs text-slate-700 dark:text-slate-300 font-medium"
              >
                <div className="w-2 h-2 rounded-full bg-[#FF5E1E] mt-1 shrink-0" />
                <span className="leading-relaxed">{change}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
