import React from 'react';
import { 
  Sparkles, 
  AlertTriangle, 
  CheckCircle, 
  ArrowRight, 
  Scale, 
  Volume2 
} from 'lucide-react';

export default function ExecutiveSummary({ contextAnalysis, summary }) {
  if (!contextAnalysis) return null;

  const isAi = contextAnalysis.mode === 'ai';

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
      {/* Title */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center space-x-2.5">
          <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-white">Difference Description & Context Analysis</h3>
            <p className="text-xs text-slate-400">
              {isAi 
                ? 'AI semantic reasoning powered by Gemini 2.5 Flash' 
                : 'Algorithmic structural summary (Add Gemini API key in settings for deeper reasoning)'}
            </p>
          </div>
        </div>

        {contextAnalysis.toneShift && (
          <div className="hidden sm:flex items-center space-x-1.5 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700 text-xs text-slate-300">
            <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-medium">Tone:</span>
            <span className="text-slate-400">{contextAnalysis.toneShift}</span>
          </div>
        )}
      </div>

      {/* Executive Summary Paragraph */}
      <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-750">
        <h4 className="text-xs font-semibold text-sky-400 uppercase tracking-wider mb-1.5">
          Executive Overview
        </h4>
        <p className="text-sm text-slate-200 leading-relaxed">
          {contextAnalysis.executiveSummary}
        </p>
      </div>

      {/* Critical Alerts (if any) */}
      {contextAnalysis.criticalAlerts && contextAnalysis.criticalAlerts.length > 0 && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 space-y-2">
          <div className="flex items-center space-x-2 text-rose-400 font-semibold text-xs uppercase tracking-wider">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Critical Discrepancies & Risk Alerts</span>
          </div>
          <ul className="space-y-1.5 pl-6 list-disc text-xs text-rose-200/90 leading-relaxed">
            {contextAnalysis.criticalAlerts.map((alert, idx) => (
              <li key={idx}>{alert}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Key Semantic Changes List */}
      {contextAnalysis.keySemanticChanges && contextAnalysis.keySemanticChanges.length > 0 && (
        <div className="space-y-2.5">
          <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-1.5">
            <Scale className="w-3.5 h-3.5 text-sky-400" />
            <span>Notable Meaning & Content Changes</span>
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {contextAnalysis.keySemanticChanges.map((change, idx) => (
              <div 
                key={idx} 
                className="p-3 rounded-xl bg-slate-800/40 border border-slate-800 flex items-start space-x-2 text-xs text-slate-300"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-1.5 shrink-0" />
                <span className="leading-relaxed">{change}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
