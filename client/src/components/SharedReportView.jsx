import React, { useState, useEffect } from 'react';
import { 
  FileDiff, 
  ArrowLeft, 
  ExternalLink, 
  Clock, 
  ShieldCheck, 
  Sparkles, 
  AlertCircle, 
  Download,
  Share2
} from 'lucide-react';
import Scoreboard from './Scoreboard';
import ExecutiveSummary from './ExecutiveSummary';
import SectionBreakdown from './SectionBreakdown';
import DiffViewer from './DiffViewer';
import PdfReportModal from './PdfReportModal';

export default function SharedReportView({
  shareId,
  onExitSharedView
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [shareData, setShareData] = useState(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  useEffect(() => {
    if (!shareId) return;

    async function fetchShare() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/share/${shareId}`);
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Shared report not found.');
        }
        setShareData(data.share);
      } catch (err) {
        console.error(err);
        setError(err.message || 'Failed to load shared report.');
      } finally {
        setLoading(false);
      }
    }

    fetchShare();
  }, [shareId]);

  if (loading) {
    return (
      <div className="py-24 max-w-xl mx-auto text-center space-y-4">
        <div className="w-12 h-12 mx-auto rounded-2xl bg-[#FFF4EF] dark:bg-[#FF5E1E]/15 text-[#FF5E1E] flex items-center justify-center shadow-inner">
          <Sparkles className="w-6 h-6 animate-spin" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Loading Shared Comparison Report...
          </h3>
          <p className="text-xs text-slate-400">
            Retrieving verified document delta and metrics
          </p>
        </div>
      </div>
    );
  }

  if (error || !shareData) {
    return (
      <div className="py-20 max-w-md mx-auto text-center space-y-5 animate-in fade-in">
        <div className="w-14 h-14 mx-auto rounded-3xl bg-rose-50 dark:bg-rose-950/40 text-rose-500 border border-rose-200 dark:border-rose-900 flex items-center justify-center shadow-sm">
          <AlertCircle className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            Shared Report Unavailable
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {error || 'This comparison link does not exist, has expired after 7 days, or was removed by its author.'}
          </p>
        </div>
        <div className="pt-2">
          <button
            type="button"
            onClick={onExitSharedView}
            className="px-6 py-2.5 rounded-full bg-[#FF5E1E] hover:bg-[#FF733B] text-white text-xs font-bold shadow-md shadow-[#FF5E1E]/25 transition hover:scale-105 active:scale-95 inline-flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go to Document Difference Checker</span>
          </button>
        </div>
      </div>
    );
  }

  const { comparisonData, createdAt, expiresAt } = shareData;

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      {/* Shared Banner */}
      <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-[#111726] to-slate-900 text-white border border-white/[0.1] shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-10 h-10 rounded-2xl bg-[#FF5E1E]/20 text-[#FF5E1E] border border-[#FF5E1E]/30 flex items-center justify-center font-bold">
            <Share2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <h2 className="text-sm font-bold text-white tracking-tight">
                Verified Public Shared Report
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-slate-200 border border-white/20">
                Read-Only
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Created {new Date(createdAt).toLocaleDateString()} &bull; Valid until {new Date(expiresAt).toLocaleDateString()}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onExitSharedView}
          className="px-5 py-2.5 rounded-full bg-[#FF5E1E] hover:bg-[#FF733B] text-white text-xs font-bold shadow-md shadow-[#FF5E1E]/30 transition hover:scale-105 active:scale-95 flex items-center space-x-2 shrink-0"
        >
          <span>Compare New Files</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 1. Scoreboard */}
      <Scoreboard
        metrics={comparisonData.metrics}
        stats={comparisonData.stats}
        summary={comparisonData.summary}
        meta={comparisonData.meta}
        filters={comparisonData.filters || {}}
        onExportPdf={() => setIsPdfModalOpen(true)}
      />

      {/* 2. Executive Summary */}
      <ExecutiveSummary
        contextAnalysis={comparisonData.contextAnalysis}
        summary={comparisonData.summary}
      />

      {/* 3. Section Breakdown */}
      <SectionBreakdown
        sectionReports={comparisonData.sectionReports}
        meta={comparisonData.meta}
      />

      {/* 4. Full Diff Viewer in Read-Only Mode */}
      <DiffViewer
        diffTokens={comparisonData.diffTokens}
        meta={comparisonData.meta}
        stats={comparisonData.stats}
        filters={comparisonData.filters || {}}
        onFilterChange={() => {}}
        onApplyFilters={() => {}}
        isComparing={false}
        onExportPdf={() => setIsPdfModalOpen(true)}
        initialDecisions={comparisonData.decisions || {}}
        spreadsheetDiff={comparisonData.spreadsheetDiff}
        currentUser={null}
        onRequestAuth={() => {}}
        readOnly={true}
      />

      {/* PDF Modal */}
      <PdfReportModal
        isOpen={isPdfModalOpen}
        onClose={() => setIsPdfModalOpen(false)}
        data={comparisonData}
      />
    </div>
  );
}
