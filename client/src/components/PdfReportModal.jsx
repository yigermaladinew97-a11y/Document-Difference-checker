import React from 'react';
import { 
  X, 
  Printer, 
  Download, 
  FileText, 
  ShieldCheck, 
  ShieldAlert,
  CheckCircle2, 
  AlertTriangle
} from 'lucide-react';
import { openPrintPdfReport, downloadHtmlAuditReport } from '../utils/reportGenerator';

export default function PdfReportModal({ isOpen, onClose, data }) {
  if (!isOpen || !data) return null;

  const meta = data.meta || {};
  const metrics = data.metrics || {};
  const stats = data.stats || {};
  const summary = data.summary || {};
  const contextAnalysis = data.contextAnalysis || {};
  const sectionReports = data.sectionReports || [];
  const diffTokens = data.diffTokens || [];
  const filters = data.filters || {};
  const entitySwaps = data.entitySwaps || [];
  const imageDiff = data.imageDiff || null;

  const docA = meta.docA || { filename: 'Document A', format: 'unknown', wordCount: 0 };
  const docB = meta.docB || { filename: 'Document B', format: 'unknown', wordCount: 0 };

  const handlePrint = () => {
    openPrintPdfReport(data);
  };

  const handleDownloadHtml = () => {
    downloadHtmlAuditReport(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-white dark:bg-[#111726] border border-slate-200/80 dark:border-white/[0.1] rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Modal Header & Quick Export Actions */}
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-4 bg-slate-50/60 dark:bg-slate-900/40">
          <div className="flex items-center space-x-3.5">
            <div className="w-10 h-10 rounded-2xl bg-[#FFF4EF] dark:bg-[#FF5E1E]/15 text-[#FF5E1E] flex items-center justify-center shadow-sm">
              <FileText className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center space-x-2.5">
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Executive PDF Audit Report
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 uppercase tracking-wider">
                  Ready to Print
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium mt-0.5">
                Generate an agency-grade, client-ready PDF or standalone HTML deliverable
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            {/* Direct Print / Save as PDF button */}
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center space-x-2 px-5 py-2.5 rounded-full bg-[#FF5E1E] hover:bg-[#E04A0E] text-white text-xs font-bold transition shadow-sm hover:scale-105 active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save as PDF</span>
            </button>

            {/* Offline HTML Download */}
            <button
              type="button"
              onClick={handleDownloadHtml}
              className="flex items-center space-x-2 px-4 py-2.5 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-200 text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition shadow-sm hover:scale-105 active:scale-95"
              title="Download standalone offline report"
            >
              <Download className="w-4 h-4 text-slate-400" />
              <span className="hidden sm:inline">Download HTML</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full bg-slate-100 dark:bg-slate-900 text-slate-400 hover:text-slate-900 dark:hover:text-white transition hover:scale-105"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Live Document Preview (Stylized A4 Sheet in Viewport) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100/70 dark:bg-slate-950/60">
          <div className="max-w-3xl mx-auto bg-white text-slate-900 p-8 sm:p-12 rounded-2xl shadow-xl border border-slate-200/80 font-sans space-y-7">
            
            {/* Header Brand */}
            <div className="flex items-start justify-between pb-6 border-b-2 border-slate-100">
              <div className="flex items-center space-x-3.5">
                <div className="w-11 h-11 rounded-xl bg-[#FFF4EF] text-[#FF5E1E] font-black text-xl flex items-center justify-center border border-[#FFE2D4]">
                  D
                </div>
                <div>
                  <h2 className="text-xl font-extrabold tracking-tight text-slate-900">DocDiff Pro</h2>
                  <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Executive Audit Report</p>
                </div>
              </div>
              <div className="text-right text-xs text-slate-500 space-y-0.5">
                <p><strong>Generated:</strong> {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                <p><strong>Engine:</strong> {metrics.analysisMode === 'ai' ? 'Gemini 2.5 Flash' : 'Algorithmic Matcher'}</p>
                {Object.values(filters).some(Boolean) && (
                  <p className="text-[10px] font-bold text-[#FF5E1E]">
                    Filters: {[
                      filters.ignoreCase && 'Case',
                      filters.ignorePunctuation && 'Punctuation',
                      filters.ignoreWhitespace && 'Spaces',
                      filters.ignoreNumbers && 'Numbers',
                      filters.trimLines && 'Trim'
                    ].filter(Boolean).join(' • ')}
                  </p>
                )}
              </div>
            </div>

            {/* Target Files Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Baseline (Document A)</span>
                <p className="font-bold text-xs text-slate-800 truncate mt-0.5">📄 {docA.filename}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{docA.format?.toUpperCase()} • {docA.wordCount} words</p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Comparison (Document B)</span>
                <p className="font-bold text-xs text-slate-800 truncate mt-0.5">📄 {docB.filename}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{docB.format?.toUpperCase()} • {docB.wordCount} words</p>
              </div>
            </div>

            {/* Scorecard Metrics */}
            <div className="grid grid-cols-4 gap-3 text-center">
              <div className="p-4 rounded-xl bg-white border border-slate-200">
                <span className="text-2xl font-black text-[#FF5E1E] font-mono">{metrics.lexicalSimilarityPercent}%</span>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Similarity</p>
              </div>
              <div className="p-4 rounded-xl bg-white border border-slate-200">
                <span className="text-2xl font-black text-emerald-600 font-mono">+{stats.addedWords}</span>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Added</p>
              </div>
              <div className="p-4 rounded-xl bg-white border border-slate-200">
                <span className="text-2xl font-black text-rose-500 font-mono">-{stats.deletedWords}</span>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Removed</p>
              </div>
              <div className="p-4 rounded-xl bg-white border border-slate-200">
                <span className="text-2xl font-black text-slate-600 font-mono">{stats.unchangedWords}</span>
                <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">Unchanged</p>
              </div>
            </div>

            {/* Executive Summary Callout */}
            <div className="p-5 rounded-xl bg-[#FFF9F6] border border-[#FFE7DD] space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-[11px] font-black text-[#FF5E1E] uppercase tracking-wider">Executive Findings</h4>
                {contextAnalysis.toneShift && (
                  <span className="text-[10px] font-bold text-slate-500 bg-white px-2 py-0.5 rounded-md border border-slate-200">
                    Tone: {contextAnalysis.toneShift}
                  </span>
                )}
              </div>
              {contextAnalysis.verdictHeadline && (
                <p className="text-xs font-black text-slate-900">{contextAnalysis.verdictHeadline}</p>
              )}
              <p className="text-xs text-slate-800 leading-relaxed font-medium">
                {contextAnalysis.executiveSummary || summary.headline}
              </p>
              {contextAnalysis.explanations && contextAnalysis.explanations.length > 0 && (
                <div className="pt-2 border-t border-[#FFE7DD] space-y-1">
                  <span className="text-[10px] font-bold text-[#FF5E1E] uppercase tracking-wider block">Key Strategic Explanations:</span>
                  <ul className="text-[11px] text-slate-700 space-y-1 pl-3.5 list-disc leading-relaxed font-medium">
                    {contextAnalysis.explanations.map((exp, idx) => (
                      <li key={idx}><strong>{exp.title}:</strong> {exp.detail}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Critical Alerts (if any) */}
            {contextAnalysis.criticalAlerts && contextAnalysis.criticalAlerts.length > 0 && (
              <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-1.5">
                <div className="flex items-center space-x-1.5 text-rose-600 text-xs font-bold uppercase tracking-wider">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>High-Risk Discrepancies & Modified Obligations</span>
                </div>
                <ul className="list-disc pl-5 text-xs text-rose-800 space-y-0.5">
                  {contextAnalysis.criticalAlerts.map((a, idx) => (
                    <li key={idx}>{a}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Identity & Entity Swap Sentinel Alert */}
            {entitySwaps.length > 0 && (
              <div className="p-4 rounded-xl bg-rose-50 border-2 border-rose-300 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1.5 text-rose-700 text-xs font-black uppercase tracking-wider">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Critical Alert: Identity &amp; Party Name Substitution</span>
                  </div>
                  <span className="text-[10px] font-black uppercase bg-rose-600 text-white px-2 py-0.5 rounded">
                    {entitySwaps.length} Entity Substitution(s)
                  </span>
                </div>
                <div className="space-y-1.5 pt-1">
                  {entitySwaps.map((swap, idx) => (
                    <div key={idx} className="p-2.5 rounded-lg bg-white border border-rose-200 text-xs flex items-center justify-between">
                      <div>
                        <span className="line-through text-rose-600 font-bold">{swap.entityA}</span>
                        <span className="mx-2 text-slate-400">➔</span>
                        <span className="text-emerald-700 font-bold">{swap.entityB}</span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500 font-semibold">{swap.occurrences}x</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Embedded Photos & Visual Media Audit */}
            {imageDiff && imageDiff.hasImages && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-slate-800 text-xs font-black uppercase tracking-wider">
                    Embedded Photos &amp; Visual Media Audit
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                    imageDiff.status === 'REPLACED' ? 'bg-rose-100 text-rose-700' : imageDiff.status === 'MODIFIED' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                  }`}>
                    {imageDiff.status}
                  </span>
                </div>
                {imageDiff.mismatches && imageDiff.mismatches.length > 0 ? (
                  <div className="space-y-1.5 pt-1">
                    {imageDiff.mismatches.map((m, idx) => (
                      <div key={idx} className="p-2 rounded-lg bg-white border border-slate-200 text-xs flex items-center justify-between">
                        <div>
                          <strong>{m.title}:</strong> <span className="text-slate-600">{m.description}</span>
                        </div>
                        <span className="text-[10px] font-bold text-slate-400 shrink-0 ml-2">#{m.index}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-emerald-700 font-medium">All embedded images are 100% identical (matching SHA-256 fingerprints).</p>
                )}
              </div>
            )}

            {/* Legal & Commercial Risk Radar */}
            {contextAnalysis.riskRadar && (
              <div className="p-5 rounded-xl border border-slate-200 bg-white space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                  <div className="flex items-center space-x-2.5">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      contextAnalysis.riskRadar.overallRiskLevel === 'HIGH' || contextAnalysis.riskRadar.overallRiskLevel === 'CRITICAL'
                        ? 'bg-rose-100 text-rose-600'
                        : contextAnalysis.riskRadar.overallRiskLevel === 'MEDIUM'
                        ? 'bg-amber-100 text-amber-600'
                        : 'bg-emerald-100 text-emerald-600'
                    }`}>
                      {contextAnalysis.riskRadar.overallRiskLevel === 'LOW' ? (
                        <ShieldCheck className="w-4 h-4" />
                      ) : (
                        <ShieldAlert className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-900">
                        Legal & Commercial Risk Radar
                      </h4>
                      <p className="text-[10px] text-slate-400 font-medium">
                        Automated exposure evaluation on liability, warranties, payment terms, and scope
                      </p>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider border ${
                    contextAnalysis.riskRadar.overallRiskLevel === 'HIGH' || contextAnalysis.riskRadar.overallRiskLevel === 'CRITICAL'
                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                      : contextAnalysis.riskRadar.overallRiskLevel === 'MEDIUM'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  }`}>
                    {contextAnalysis.riskRadar.overallRiskLevel} RISK EXPOSURE ({contextAnalysis.riskRadar.riskScore || 0}/100)
                  </span>
                </div>

                {contextAnalysis.riskRadar.riskSummary && (
                  <p className="text-[11px] text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 leading-relaxed font-medium">
                    {contextAnalysis.riskRadar.riskSummary}
                  </p>
                )}

                {contextAnalysis.riskRadar.riskFlags && contextAnalysis.riskRadar.riskFlags.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    {contextAnalysis.riskRadar.riskFlags.map((flag, idx) => (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border text-[11px] space-y-1 ${
                          flag.severity === 'HIGH'
                            ? 'bg-rose-50/70 border-rose-200 text-rose-900'
                            : flag.severity === 'MEDIUM'
                            ? 'bg-amber-50/70 border-amber-200 text-amber-900'
                            : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-extrabold text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-white border border-slate-200/80">
                            {flag.category}
                          </span>
                          <span className={`text-[9px] font-black uppercase tracking-wider ${
                            flag.severity === 'HIGH' ? 'text-rose-600' : flag.severity === 'MEDIUM' ? 'text-amber-600' : 'text-slate-500'
                          }`}>
                            {flag.severity} PRIORITY
                          </span>
                        </div>
                        <p className="font-bold text-slate-900 text-xs">{flag.title}</p>
                        <p className="text-[10.5px] text-slate-600 leading-relaxed">{flag.impact || flag.explanation}</p>
                        {flag.clause && (
                          <p className="text-[9.5px] text-slate-400 font-medium">
                            Clause: <span className="font-semibold text-slate-600">{flag.clause}</span>
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-medium flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Zero high-risk legal or financial exposures identified. Changes fall within standard operational bounds.</span>
                  </div>
                )}
              </div>
            )}

            {/* Section Breakdown Table */}
            {sectionReports.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Section & Page-Level Breakdown ({sectionReports.length} parts)
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase">
                      <tr>
                        <th className="p-2.5 pl-3">#</th>
                        <th className="p-2.5">Section</th>
                        <th className="p-2.5">Status</th>
                        <th className="p-2.5 pr-3">Description of Changes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sectionReports.slice(0, 15).map((sec, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50">
                          <td className="p-2.5 pl-3 font-bold text-slate-400">{sec.index}</td>
                          <td className="p-2.5 font-bold text-slate-800">{sec.title}</td>
                          <td className="p-2.5">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              sec.status === 'UNCHANGED' ? 'bg-emerald-50 text-emerald-700' :
                              sec.status === 'MOVED' ? 'bg-purple-50 text-purple-700' :
                              sec.status === 'MODIFIED' ? 'bg-amber-50 text-amber-700' :
                              sec.status === 'ADDED' ? 'bg-blue-50 text-blue-700' : 'bg-rose-50 text-rose-700'
                            }`}>
                              {sec.status}
                            </span>
                          </td>
                          <td className="p-2.5 pr-3 text-slate-600">{sec.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {sectionReports.length > 15 && (
                    <div className="p-2 bg-slate-50 text-center text-[11px] text-slate-400 border-t border-slate-100">
                      + {sectionReports.length - 15} additional sections included in complete PDF export
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Redline Sample */}
            <div className="space-y-2">
              <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Redline Difference Preview</h4>
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 font-mono text-[11px] leading-relaxed max-h-48 overflow-y-auto text-slate-700">
                {diffTokens.slice(0, 300).map((t, idx) => {
                  if (t.type === 'added') return <span key={idx} className="bg-emerald-100 text-emerald-800 font-bold px-1 rounded">+{t.value}</span>;
                  if (t.type === 'removed') return <span key={idx} className="bg-rose-100 text-rose-800 line-through font-bold px-1 rounded">-{t.value}</span>;
                  return <span key={idx}>{t.value}</span>;
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
              <span>DocDiff Pro Executive Deliverable</span>
              <span>Official Verification Stamp Active</span>
            </div>
          </div>
        </div>

        {/* Modal Bottom Bar */}
        <div className="p-4 px-6 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-white/[0.06] flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Ready for high-resolution vector PDF printing (A4 / Letter compatible)</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-300 dark:hover:bg-slate-700 transition"
          >
            Close Preview
          </button>
        </div>

      </div>
    </div>
  );
}
