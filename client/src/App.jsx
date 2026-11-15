import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import ApiKeyModal from './components/ApiKeyModal';
import DualDropzone from './components/DualDropzone';
import Scoreboard from './components/Scoreboard';
import ExecutiveSummary from './components/ExecutiveSummary';
import SectionBreakdown from './components/SectionBreakdown';
import DiffViewer from './components/DiffViewer';
import { 
  Sparkles, 
  AlertCircle, 
  RefreshCw, 
  FileDiff, 
  ShieldCheck, 
  Zap, 
  Cpu, 
  Layers 
} from 'lucide-react';

const SAMPLE_DOC_A = `# Master Services Agreement (v1.0)
Section 1: Scope of Services
Provider agrees to deliver cloud architecture consulting and software engineering services as defined in Schedule A. All deliverables must meet standard ISO-27001 compliance standards.

Section 2: Payment and Compensation
Client agrees to pay Provider a total fixed fee of $15,000 USD. Invoices shall be payable within 30 days of receipt (Net 30). Late payments incur a 1.5% monthly financing charge.

Section 3: Warranty & Support
Provider warrants all software deliverables for 30 days from client sign-off. Support includes bug fixes and critical patching within 24 business hours.

Section 4: Confidentiality & IP
All intellectual property developed exclusively for the Client shall transfer upon full payment. Provider retains core framework licenses.`;

const SAMPLE_DOC_B = `# Master Services Agreement (v2.1 - Revised)
Section 1: Scope of Services
Provider agrees to deliver cloud architecture consulting, software engineering, and continuous 24/7 DevOps deployment services as defined in Schedule A. All deliverables must meet SOC-2 Type II compliance standards.

Section 2: Payment and Compensation
Client agrees to pay Provider an escalated total fee of $24,500 USD with milestone disbursements. Invoices shall be payable within 60 days of receipt (Net 60). Late payments incur a 2.5% monthly financing charge.

Section 3: Warranty & Support
Provider warrants all software deliverables for 90 days from client sign-off. Support includes ongoing maintenance, SLA response within 4 hours, and emergency weekend patching.

Section 4: Confidentiality & IP
All intellectual property developed exclusively for the Client shall transfer immediately upon project kickoff. Provider waives all retained licensing rights and indemnifies Client against infringement.`;

export default function App() {
  const [fileA, setFileA] = useState(null);
  const [textA, setTextA] = useState('');
  const [fileB, setFileB] = useState(null);
  const [textB, setTextB] = useState('');

  const [apiKey, setApiKey] = useState(() => localStorage.getItem('docdiff_gemini_key') || '');
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);

  const [isComparing, setIsComparing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const resultsRef = useRef(null);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const handleSaveApiKey = (newKey) => {
    setApiKey(newKey);
    if (newKey) {
      localStorage.setItem('docdiff_gemini_key', newKey);
    } else {
      localStorage.removeItem('docdiff_gemini_key');
    }
  };

  const handleLoadSample = () => {
    setFileA(null);
    setFileB(null);
    setTextA(SAMPLE_DOC_A);
    setTextB(SAMPLE_DOC_B);
    setErrorMessage(null);
  };

  const handleCompare = async () => {
    setIsComparing(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();

      if (fileA) {
        formData.append('fileA', fileA);
      } else if (textA.trim()) {
        formData.append('textA', textA);
      }

      if (fileB) {
        formData.append('fileB', fileB);
      } else if (textB.trim()) {
        formData.append('textB', textB);
      }

      if (apiKey) {
        formData.append('apiKey', apiKey);
      }

      const response = await fetch('/api/compare', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to compare documents');
      }

      setComparisonResult(data);

      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 120);
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || 'An unexpected error occurred.');
    } finally {
      setIsComparing(false);
    }
  };

  const handleReset = () => {
    setComparisonResult(null);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-[#070A12] text-slate-100 flex flex-col selection:bg-indigo-500/30 selection:text-indigo-200 font-sans relative overflow-x-hidden">
      {/* Background Ambient Spotlights */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[400px] bg-gradient-to-b from-indigo-500/10 via-sky-500/5 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="fixed top-1/3 -left-40 w-96 h-96 bg-indigo-600/[0.04] rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed top-1/2 -right-40 w-96 h-96 bg-sky-500/[0.04] rounded-full blur-3xl pointer-events-none -z-10" />

      <Navbar
        apiKey={apiKey}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        isDark={isDark}
        onToggleTheme={() => setIsDark(!isDark)}
        isComparing={isComparing}
      />

      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        currentKey={apiKey}
        onSaveKey={handleSaveApiKey}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14 space-y-10">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] text-xs font-semibold text-slate-300 shadow-sm backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
            <span className="bg-gradient-to-r from-indigo-300 to-sky-300 bg-clip-text text-transparent">
              Enterprise Two-Tier Comparison Engine
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-[1.15]">
            Compare documents with <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              word-level & semantic precision.
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-400 leading-relaxed font-normal max-w-2xl mx-auto">
            Detect exact phrase revisions, altered contractual terms, and semantic meaning shifts across <strong className="text-slate-200">PDF, Word, Excel, PowerPoint</strong> and text files.
          </p>

          {/* Feature Badges Bar */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2 text-[11px] font-medium text-slate-400">
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-dark-900 border border-white/[0.05]">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Myers Word Diff</span>
            </span>
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-dark-900 border border-white/[0.05]">
              <Cpu className="w-3.5 h-3.5 text-emerald-400" />
              <span>Gemini 2.5 AI Reasoning</span>
            </span>
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-dark-900 border border-white/[0.05]">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              <span>Cross-Format Ingestion</span>
            </span>
            <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-dark-900 border border-white/[0.05]">
              <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
              <span>Zero-Persistence Privacy</span>
            </span>
          </div>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center space-x-3 max-w-3xl mx-auto shadow-lg animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="flex-1 font-medium">{errorMessage}</span>
          </div>
        )}

        {/* Dual Upload / Input Cards */}
        <DualDropzone
          fileA={fileA}
          setFileA={setFileA}
          textA={textA}
          setTextA={setTextA}
          fileB={fileB}
          setFileB={setFileB}
          textB={textB}
          setTextB={setTextB}
          onCompare={handleCompare}
          isComparing={isComparing}
          onLoadSample={handleLoadSample}
        />

        {/* Comparison Results Section */}
        {comparisonResult && (
          <div ref={resultsRef} className="pt-8 space-y-8 animate-in fade-in duration-700">
            {/* Results Title Bar with Reset Button */}
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
                  <FileDiff className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white tracking-tight">Intelligence & Diff Results</h2>
                  <p className="text-xs text-slate-400">Multi-tier metrics, semantic breakdown, and synchronized view</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="flex items-center space-x-2 px-3.5 py-1.5 rounded-xl bg-dark-900 hover:bg-dark-850 border border-white/[0.08] text-xs font-semibold text-slate-300 hover:text-white transition shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5 text-indigo-400" />
                <span>Compare Another Pair</span>
              </button>
            </div>

            {/* 1. Scoreboard (Dual Glowing Gauges & 4 Metric Cards) */}
            <Scoreboard
              metrics={comparisonResult.metrics}
              stats={comparisonResult.stats}
              summary={comparisonResult.summary}
              meta={comparisonResult.meta}
            />

            {/* 2. Executive Difference Summary (AI / Local Heuristics) */}
            <ExecutiveSummary
              contextAnalysis={comparisonResult.contextAnalysis}
              summary={comparisonResult.summary}
            />

            {/* 3. Section / Page / Slide Breakdown */}
            <SectionBreakdown
              sectionReports={comparisonResult.sectionReports}
            />

            {/* 4. Interactive Diff Viewer */}
            <DiffViewer
              diffTokens={comparisonResult.diffTokens}
              meta={comparisonResult.meta}
              stats={comparisonResult.stats}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto py-8 border-t border-white/[0.06] text-center text-xs text-slate-500 bg-dark-950/40">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>DocDiff Pro &bull; Built with React, Tailwind CSS, Lucide & Google Gemini</p>
          <p className="text-slate-600 font-mono">100% Client & In-Memory Safe &bull; Zero Disk Retention</p>
        </div>
      </footer>
    </div>
  );
}
