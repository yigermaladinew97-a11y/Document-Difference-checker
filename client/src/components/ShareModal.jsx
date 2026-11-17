import React, { useState, useEffect } from 'react';
import { 
  X, 
  Share2, 
  Copy, 
  Check, 
  ExternalLink, 
  Clock, 
  ShieldCheck, 
  Sparkles, 
  Mail, 
  MessageCircle,
  FileDiff
} from 'lucide-react';
import confetti from 'canvas-confetti';

export default function ShareModal({
  isOpen,
  onClose,
  comparisonData
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [shareData, setShareData] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && comparisonData && !shareData) {
      generateShare();
    }
  }, [isOpen, comparisonData]);

  const generateShare = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('docdiff_auth_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/share', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          comparisonData,
          title: `${comparisonData.meta?.docA?.filename || 'Document A'} vs ${comparisonData.meta?.docB?.filename || 'Document B'}`
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate share link.');
      }

      setShareData(data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'An error occurred while creating the share link.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const fullShareUrl = shareData 
    ? `${window.location.origin}/share/${shareData.shareId}`
    : '';

  const handleCopy = () => {
    if (!fullShareUrl) return;
    navigator.clipboard.writeText(fullShareUrl);
    setCopied(true);
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 }
    });
    setTimeout(() => setCopied(false), 2500);
  };

  const shareText = `Check out this document comparison between ${comparisonData?.meta?.docA?.filename || 'Document A'} and ${comparisonData?.meta?.docB?.filename || 'Document B'}: ${fullShareUrl}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg rounded-3xl bg-white dark:bg-[#111726] border border-slate-200 dark:border-white/[0.1] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 dark:border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FFF4EF] dark:bg-[#FF5E1E]/15 text-[#FF5E1E] flex items-center justify-center shadow-xs">
              <Share2 className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Share Comparison Report
              </h3>
              <p className="text-xs text-slate-400 font-medium">
                Generate an instant, read-only link for clients &amp; teammates
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {loading ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-10 h-10 mx-auto rounded-2xl bg-[#FFF4EF] dark:bg-[#FF5E1E]/15 text-[#FF5E1E] flex items-center justify-center">
                <Sparkles className="w-5 h-5 animate-spin" />
              </div>
              <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Generating unique share link...
              </p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-xs text-rose-700 dark:text-rose-300 space-y-2">
              <p className="font-bold">Failed to create share link</p>
              <p>{error}</p>
              <button
                type="button"
                onClick={generateShare}
                className="mt-2 px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold"
              >
                Try Again
              </button>
            </div>
          ) : (
            <>
              {/* Document Pair Preview Chip */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-white/[0.06] flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2 truncate">
                  <FileDiff className="w-4 h-4 text-[#FF5E1E] shrink-0" />
                  <span className="font-semibold text-slate-900 dark:text-white truncate">
                    {comparisonData?.meta?.docA?.filename} <span className="text-slate-400 font-normal">vs</span> {comparisonData?.meta?.docB?.filename}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FF5E1E]/15 text-[#FF5E1E] shrink-0">
                  {comparisonData?.metrics?.lexicalSimilarityPercent}% Match
                </span>
              </div>

              {/* Link Input & Copy Button */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-600 dark:text-slate-300 block">
                  Public Read-Only URL
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    readOnly
                    value={fullShareUrl}
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/[0.08] text-xs font-semibold text-slate-900 dark:text-white font-mono focus:outline-none select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopy}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center space-x-1.5 shrink-0 ${
                      copied
                        ? 'bg-emerald-600 text-white'
                        : 'bg-[#FF5E1E] hover:bg-[#FF733B] text-white hover:scale-105 active:scale-95'
                    }`}
                  >
                    {copied ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied!' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* Quick Share Buttons */}
              <div className="pt-1 flex flex-wrap items-center gap-2">
                <a
                  href={`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-emerald-500 hover:text-white text-slate-700 dark:text-slate-300 text-xs font-semibold transition"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </a>

                <a
                  href={`mailto:?subject=${encodeURIComponent(`Document Difference Report: ${comparisonData?.meta?.docA?.filename} vs ${comparisonData?.meta?.docB?.filename}`)}&body=${encodeURIComponent(shareText)}`}
                  className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-blue-500 hover:text-white text-slate-700 dark:text-slate-300 text-xs font-semibold transition"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email</span>
                </a>

                <a
                  href={fullShareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-[#FF5E1E] hover:text-white text-slate-700 dark:text-slate-300 text-xs font-semibold transition ml-auto"
                >
                  <span>Preview Tab</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Security & Expiration Notes */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/60 dark:border-white/[0.04] text-[11px] text-slate-400 space-y-1.5">
                <div className="flex items-center space-x-2 text-slate-600 dark:text-slate-300 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Zero-Account Required &bull; Read-Only Protection</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span>This link is valid for 7 days (expires {shareData?.expiresAt ? new Date(shareData.expiresAt).toLocaleDateString() : 'in 7 days'}).</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
