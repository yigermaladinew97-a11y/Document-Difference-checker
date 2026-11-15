import React from 'react';
import { 
  Sparkles, 
  Scale, 
  Volume2, 
  ShieldAlert, 
  FileCheck2,
  CheckCircle2
} from 'lucide-react';

export default function ExecutiveSummary({ contextAnalysis, summary }) {
  if (!contextAnalysis) return null;

  const isAi = contextAnalysis.mode === 'ai';

  return (
    <div className="rounded-[32px] bg-white dark:bg-[#111726] border border-slate-200/80 dark:border-white/[0.08] p-7 sm:p-9 shadow-card space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-5 border-b border-slate-100 dark:border-white/[0.06] gap-3">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-2xl bg-[#FFF4EF] dark:bg-[#FF5E1E]/15 text-[#FF5E1E] flex items-center justify-center shadow-sm">
            <Sparkles className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="font-extrabold text-base text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              Semantic Intelligence & Difference Overview
              {isAi && (
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                  AI Grounded
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400 font-medium">
              {isAi 
                ? 'Deep semantic and contractual analysis powered by Gemini 2.5 Flash' 
                : 'Algorithmic structural summary (Enter a Gemini API key for deep reasoning)'}
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

      {/* Executive Overview Box (Warm Tinted Callout) */}
      <div className="p-6 rounded-2xl bg-[#FFF9F6] dark:bg-[#FF5E1E]/5 border border-[#FFE7DD] dark:border-[#FF5E1E]/20">
        <h4 className="text-[11px] font-black text-[#FF5E1E] uppercase tracking-widest mb-2 flex items-center space-x-1.5">
          <FileCheck2 className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Executive Summary</span>
        </h4>
        <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
          {contextAnalysis.executiveSummary}
        </p>
      </div>

      {/* Critical Discrepancies (if any) */}
      {contextAnalysis.criticalAlerts && contextAnalysis.criticalAlerts.length > 0 && (
        <div className="p-6 rounded-2xl bg-rose-50/70 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 space-y-2">
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

      {/* Key Meaning Adjustments Grid */}
      {contextAnalysis.keySemanticChanges && contextAnalysis.keySemanticChanges.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center space-x-2">
            <Scale className="w-3.5 h-3.5 text-[#FF5E1E]" />
            <span>Key Content & Contractual Adjustments</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {contextAnalysis.keySemanticChanges.map((change, idx) => (
              <div 
                key={idx} 
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/[0.06] hover:border-[#FF5E1E]/40 transition flex items-start space-x-3 text-xs text-slate-700 dark:text-slate-300 font-medium"
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
