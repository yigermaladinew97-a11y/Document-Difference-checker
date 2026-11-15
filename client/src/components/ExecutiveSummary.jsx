import React from 'react';
import { 
  Sparkles, 
  AlertTriangle, 
  Scale, 
  Volume2, 
  ShieldAlert, 
  FileCheck2,
  ArrowRight
} from 'lucide-react';

export default function ExecutiveSummary({ contextAnalysis, summary }) {
  if (!contextAnalysis) return null;

  const isAi = contextAnalysis.mode === 'ai';

  return (
    <div className="relative rounded-3xl bg-dark-900/90 border border-white/[0.08] p-7 shadow-2xl backdrop-blur-xl space-y-6 overflow-hidden">
      {/* Background Accent Glow */}
      <div className="absolute top-0 right-0 w-80 h-32 bg-sky-500/[0.04] rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-white/[0.06] gap-3">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-indigo-500/10 to-sky-500/10 text-indigo-400 border border-indigo-500/20 shadow-sm">
            <Sparkles className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h3 className="font-bold text-base text-white tracking-tight flex items-center gap-2">
              Semantic Intelligence & Difference Summary
              {isAi && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  AI Grounded
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400">
              {isAi 
                ? 'Deep semantic and contractual analysis powered by Gemini 2.5 Flash' 
                : 'Structural change detection & algorithmic heuristics (Set Gemini API key for deep reasoning)'}
            </p>
          </div>
        </div>

        {contextAnalysis.toneShift && (
          <div className="flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-dark-950/80 border border-white/[0.08] text-xs text-slate-300 shadow-sm">
            <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-slate-400 font-medium">Tone:</span>
            <span className="text-slate-200 font-semibold">{contextAnalysis.toneShift}</span>
          </div>
        )}
      </div>

      {/* Executive Overview Box */}
      <div className="relative p-5 rounded-2xl bg-dark-950/70 border border-white/[0.06] shadow-inner">
        <h4 className="text-[11px] font-bold text-indigo-400 uppercase tracking-widest mb-2 flex items-center space-x-1.5">
          <FileCheck2 className="w-3.5 h-3.5" />
          <span>Executive Synthesis</span>
        </h4>
        <p className="text-sm text-slate-200 leading-relaxed font-normal">
          {contextAnalysis.executiveSummary}
        </p>
      </div>

      {/* Critical Discrepancies & Risk Alerts (if present) */}
      {contextAnalysis.criticalAlerts && contextAnalysis.criticalAlerts.length > 0 && (
        <div className="p-5 rounded-2xl bg-rose-500/[0.08] border border-rose-500/20 space-y-2.5">
          <div className="flex items-center space-x-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>High-Risk Discrepancies & Clause Modifications</span>
          </div>
          <ul className="space-y-1.5 pl-6 list-disc text-xs text-rose-200/90 leading-relaxed font-normal">
            {contextAnalysis.criticalAlerts.map((alert, idx) => (
              <li key={idx}>{alert}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Key Meaning Changes */}
      {contextAnalysis.keySemanticChanges && contextAnalysis.keySemanticChanges.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
            <Scale className="w-3.5 h-3.5 text-sky-400" />
            <span>Key Content & Contractual Adjustments</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {contextAnalysis.keySemanticChanges.map((change, idx) => (
              <div 
                key={idx} 
                className="p-3.5 rounded-2xl bg-dark-950/50 border border-white/[0.05] hover:border-white/[0.1] transition flex items-start space-x-3 text-xs text-slate-300"
              >
                <div className="w-2 h-2 rounded-full bg-gradient-to-r from-sky-400 to-indigo-500 mt-1 shrink-0 shadow-sm" />
                <span className="leading-relaxed font-normal">{change}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
