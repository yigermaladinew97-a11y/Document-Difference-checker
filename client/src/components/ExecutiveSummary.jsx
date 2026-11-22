import React from 'react';
import { 
  Sparkles, 
  Scale, 
  Volume2, 
  ShieldAlert, 
  ShieldCheck,
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
  FileText,
  UserX,
  Fingerprint,
  Image as ImageIcon,
  Camera
} from 'lucide-react';

export default function ExecutiveSummary({ contextAnalysis, summary, entitySwaps = [], imageDiff = null }) {
  if (!contextAnalysis) return null;

  const isAi = contextAnalysis.mode === 'ai';
  const breakdown = contextAnalysis.structuralBreakdown || {};
  const explanations = contextAnalysis.explanations || [];
  const verdictHeadline = contextAnalysis.verdictHeadline || summary?.headline || 'Executive Difference Summary';
  const swaps = (entitySwaps && entitySwaps.length > 0) ? entitySwaps : (contextAnalysis.entitySwaps || []);
  const visualDiff = imageDiff || contextAnalysis.imageDiff;

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

      {/* Identity & Entity Swap Sentinel Alert (Detects systematic name replacement in high-similarity docs) */}
      {swaps.length > 0 && (
        <div className="rounded-3xl bg-gradient-to-br from-rose-50 via-white to-rose-50/40 dark:from-rose-950/30 dark:via-slate-900/90 dark:to-rose-950/20 border-2 border-rose-300 dark:border-rose-800/60 p-5 sm:p-7 shadow-md space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-rose-200/70 dark:border-rose-900/50 gap-2">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 shadow-xs">
                <UserX className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm sm:text-base text-rose-950 dark:text-rose-100 flex items-center gap-2">
                  <span>Critical Alert: Identity &amp; Party Name Substitution</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white shadow-xs">
                    High Priority
                  </span>
                </h4>
                <p className="text-xs text-rose-700 dark:text-rose-300 font-medium">
                  Document text is highly similar, but key person or party identity has been systematically substituted.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 text-xs font-bold text-rose-700 dark:text-rose-300">
              <Fingerprint className="w-4 h-4" />
              <span>{swaps.length} Entity {swaps.length === 1 ? 'Substitution' : 'Substitutions'}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-1">
            {swaps.map((swap, idx) => (
              <div
                key={idx}
                className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 shadow-xs space-y-2.5"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 px-2 py-0.5 rounded-md border border-rose-200 dark:border-rose-900">
                    Entity Swap #{idx + 1}
                  </span>
                  <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    {swap.occurrences}x {swap.occurrences === 1 ? 'occurrence' : 'occurrences'}
                  </span>
                </div>

                <div className="flex items-center gap-2 font-mono text-sm py-1">
                  <div className="flex-1 p-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/40 text-rose-700 dark:text-rose-300 font-bold truncate">
                    <span className="text-[10px] uppercase tracking-wider text-rose-400 block font-sans">Original (Doc A)</span>
                    <span className="truncate block font-semibold">{swap.entityA}</span>
                  </div>

                  <ArrowRight className="w-4 h-4 text-rose-500 shrink-0" />

                  <div className="flex-1 p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-bold truncate">
                    <span className="text-[10px] uppercase tracking-wider text-emerald-400 block font-sans">Revised (Doc B)</span>
                    <span className="truncate block font-semibold">{swap.entityB}</span>
                  </div>
                </div>

                {swap.context && (
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 italic bg-slate-50 dark:bg-slate-950/50 p-2 rounded-xl border border-slate-100 dark:border-white/[0.04]">
                    Excerpt: &ldquo;{swap.context}&rdquo;
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Embedded Photos & Visual Media Inspection Card */}
      {visualDiff && visualDiff.hasImages && (
        <div className="rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/[0.08] p-5 sm:p-7 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06] gap-2">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                visualDiff.status === 'REPLACED'
                  ? 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                  : visualDiff.status === 'MODIFIED'
                  ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                  : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
              }`}>
                <Camera className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Embedded Photos &amp; Visual Media Inspection</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    visualDiff.status === 'REPLACED'
                      ? 'bg-rose-100 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                      : visualDiff.status === 'MODIFIED'
                      ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                      : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                  }`}>
                    {visualDiff.status === 'REPLACED' ? 'Photo / Image Replaced' : visualDiff.status === 'MODIFIED' ? 'Visuals Modified' : 'Identical Visuals'}
                  </span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Audits embedded profile pictures, portraits, and diagrams extracted from DOCX, PPTX, PDF, and direct image uploads.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-3 text-xs font-bold text-slate-600 dark:text-slate-300">
              <span>Doc A: {visualDiff.countA} {visualDiff.countA === 1 ? 'image' : 'images'}</span>
              <span className="text-slate-300 dark:text-slate-700">•</span>
              <span>Doc B: {visualDiff.countB} {visualDiff.countB === 1 ? 'image' : 'images'}</span>
            </div>
          </div>

          {/* Image Mismatches / Changes List */}
          {visualDiff.mismatches && visualDiff.mismatches.length > 0 ? (
            <div className="space-y-3">
              {visualDiff.mismatches.map((mismatch, idx) => (
                <div
                  key={idx}
                  className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                    mismatch.type === 'REPLACED'
                      ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/50'
                      : mismatch.type === 'REMOVED'
                      ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50'
                      : 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/50'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                        mismatch.type === 'REPLACED'
                          ? 'bg-rose-600 text-white'
                          : mismatch.type === 'REMOVED'
                          ? 'bg-amber-600 text-white'
                          : 'bg-blue-600 text-white'
                      }`}>
                        {mismatch.type}
                      </span>
                      <h5 className="font-extrabold text-xs text-slate-900 dark:text-white">
                        {mismatch.title}
                      </h5>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                      {mismatch.description}
                    </p>
                  </div>

                  {/* Side-by-Side Thumbnail Previews (if available) */}
                  <div className="flex items-center gap-3 shrink-0">
                    {mismatch.imgA && (
                      <div className="text-center">
                        <div className="w-16 h-16 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-950 flex items-center justify-center overflow-hidden shadow-xs">
                          {mismatch.imgA.dataUri ? (
                            <img src={mismatch.imgA.dataUri} alt="Doc A" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-6 h-6 text-slate-400" />
                          )}
                        </div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1 block">
                          Doc A ({mismatch.imgA.sizeKb} KB)
                        </span>
                      </div>
                    )}

                    {mismatch.imgA && mismatch.imgB && (
                      <ArrowRight className="w-4 h-4 text-slate-400 shrink-0" />
                    )}

                    {mismatch.imgB && (
                      <div className="text-center">
                        <div className="w-16 h-16 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-950 flex items-center justify-center overflow-hidden shadow-xs">
                          {mismatch.imgB.dataUri ? (
                            <img src={mismatch.imgB.dataUri} alt="Doc B" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-6 h-6 text-[#FF5E1E]" />
                          )}
                        </div>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-1 block">
                          Doc B ({mismatch.imgB.sizeKb} KB)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>All embedded photos, images, and diagrams in both documents are 100% byte-for-byte identical (SHA-256 fingerprint verified).</span>
            </div>
          )}
        </div>
      )}

      {/* Legal & Financial Risk Radar Card */}
      {contextAnalysis.riskRadar && (
        <div className="rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-white/[0.08] p-5 sm:p-7 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-white/[0.06]">
            <div className="flex items-center space-x-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                contextAnalysis.riskRadar.overallRiskLevel === 'HIGH' || contextAnalysis.riskRadar.overallRiskLevel === 'CRITICAL'
                  ? 'bg-rose-500/10 text-rose-500'
                  : contextAnalysis.riskRadar.overallRiskLevel === 'MEDIUM'
                  ? 'bg-amber-500/10 text-amber-500'
                  : 'bg-emerald-500/10 text-emerald-500'
              }`}>
                {contextAnalysis.riskRadar.overallRiskLevel === 'LOW' ? (
                  <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
                ) : (
                  <ShieldAlert className="w-5 h-5 stroke-[2.2]" />
                )}
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <span>Legal &amp; Commercial Risk Radar</span>
                  {isAi && (
                    <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      Gemini Verified
                    </span>
                  )}
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Automated risk audit for liability, payment terms, warranties, and scope changes
                </p>
              </div>
            </div>

            {/* Risk Level Badge */}
            <div className="flex items-center space-x-2">
              <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider border shadow-xs ${
                contextAnalysis.riskRadar.overallRiskLevel === 'HIGH' || contextAnalysis.riskRadar.overallRiskLevel === 'CRITICAL'
                  ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900/50 animate-pulse'
                  : contextAnalysis.riskRadar.overallRiskLevel === 'MEDIUM'
                  ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900/50'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/50'
              }`}>
                {contextAnalysis.riskRadar.overallRiskLevel} RISK EXPOSURE ({contextAnalysis.riskRadar.riskScore}/100)
              </span>
            </div>
          </div>

          {/* Risk Summary Sentence */}
          {contextAnalysis.riskRadar.riskSummary && (
            <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed bg-slate-50 dark:bg-slate-950/50 p-3 rounded-2xl border border-slate-100 dark:border-white/[0.04]">
              {contextAnalysis.riskRadar.riskSummary}
            </p>
          )}

          {/* Risk Flags Grid */}
          {contextAnalysis.riskRadar.riskFlags && contextAnalysis.riskRadar.riskFlags.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {contextAnalysis.riskRadar.riskFlags.map((flag, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-2xl border text-xs space-y-1.5 transition ${
                    flag.severity === 'HIGH'
                      ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-900/40'
                      : flag.severity === 'MEDIUM'
                      ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-900/40'
                      : 'bg-slate-50/80 dark:bg-slate-900/60 border-slate-200/60 dark:border-white/[0.06]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-white dark:bg-slate-800 border border-slate-200/60 dark:border-white/[0.08] text-slate-700 dark:text-slate-300">
                      {flag.category}
                    </span>
                    <span className={`text-[10px] font-extrabold uppercase tracking-wider ${
                      flag.severity === 'HIGH' ? 'text-rose-600 dark:text-rose-400' : flag.severity === 'MEDIUM' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'
                    }`}>
                      {flag.severity} Priority
                    </span>
                  </div>
                  <h5 className="font-extrabold text-slate-900 dark:text-white text-xs">
                    {flag.title}
                  </h5>
                  <p className="text-slate-600 dark:text-slate-300 text-[11px] leading-relaxed">
                    {flag.impact}
                  </p>
                  {flag.clause && (
                    <div className="pt-1 text-[10px] text-slate-400 font-medium">
                      Clause / Section: <span className="font-semibold text-slate-600 dark:text-slate-300">{flag.clause}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>Zero high-risk legal, financial, or indemnity alterations detected. All changes appear to be within normal editorial scope.</span>
            </div>
          )}
        </div>
      )}

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
