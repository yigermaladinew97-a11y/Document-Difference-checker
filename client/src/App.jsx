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
  Layers,
  ArrowRight
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
  const [isDark, setIsDark] = useState(false); // Default to clean light agency look like Cambased

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
    <div className="min-h-screen bg-[#FBFBFD] dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 flex flex-col font-sans relative selection:bg-[#FF5E1E]/20 selection:text-[#FF5E1E]">
      {/* Background Dot Pattern (from Cambased design) */}
      <div className="fixed inset-0 bg-dot-pattern pointer-events-none opacity-60 dark:opacity-20" />

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

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12 relative z-10">
        {/* Hero Section (Matching Cambased Display Style) */}
        <div className="max-w-4xl mx-auto text-center space-y-5">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-[#FFF4EF] dark:bg-[#FF5E1E]/15 border border-[#FFD6C4] dark:border-[#FF5E1E]/30 text-xs font-bold text-[#FF5E1E] shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#FF5E1E] animate-pulse" />
            <span>AI & Word-Level Enterprise Document Diff</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.12]">
            We Build Clarity Around <br />
            <span className="text-[#FF5E1E]">Document Differences</span> That Scale.
          </h1>

          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 font-medium max-w-2xl mx-auto leading-relaxed">
            Spot subtle wording revisions, altered financial terms, and semantic meaning shifts across <strong className="text-slate-900 dark:text-white font-bold">PDF, Word, Excel, PowerPoint</strong> and text files.
          </p>

          {/* Cambased-Style Floating Quick Stats Strip */}
          <div className="pt-3 flex flex-wrap items-center justify-center gap-3 text-xs font-bold">
            <div className="px-4 py-2 rounded-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/[0.08] shadow-sm flex items-center space-x-2 text-slate-700 dark:text-slate-300">
              <Zap className="w-4 h-4 text-[#FF5E1E]" />
              <span>Word-by-Word Accuracy</span>
            </div>
            <div className="px-4 py-2 rounded-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/[0.08] shadow-sm flex items-center space-x-2 text-slate-700 dark:text-slate-300">
              <Cpu className="w-4 h-4 text-emerald-500" />
              <span>Gemini 2.5 Flash Reasoning</span>
            </div>
            <div className="px-4 py-2 rounded-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/[0.08] shadow-sm flex items-center space-x-2 text-slate-700 dark:text-slate-300">
              <Layers className="w-4 h-4 text-blue-500" />
              <span>PDF &bull; DOCX &bull; XLSX &bull; PPTX</span>
            </div>
            <div className="px-4 py-2 rounded-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/[0.08] shadow-sm flex items-center space-x-2 text-slate-700 dark:text-slate-300">
              <ShieldCheck className="w-4 h-4 text-indigo-500" />
              <span>100% In-Memory Privacy</span>
            </div>
          </div>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center space-x-3 max-w-3xl mx-auto shadow-sm">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span className="flex-1">{errorMessage}</span>
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
          <div ref={resultsRef} className="pt-10 space-y-10 animate-in fade-in duration-500">
            {/* Results Title Bar with Reset Button */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/[0.08]">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-[#FFF4EF] dark:bg-[#FF5E1E]/15 text-[#FF5E1E] flex items-center justify-center shadow-sm">
                  <FileDiff className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Intelligence & Diff Results</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Multi-tier metrics, semantic breakdown, and synchronized view</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleReset}
                className="group flex items-center space-x-2 px-4 py-2 rounded-full bg-white dark:bg-slate-900 hover:bg-slate-50 border border-slate-200 dark:border-white/[0.08] text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm transition"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#FF5E1E] group-hover:rotate-180 transition-transform duration-500" />
                <span>Compare Another Pair</span>
              </button>
            </div>

            {/* 1. Scoreboard (Cambased Gauges & Stat Boxes) */}
            <Scoreboard
              metrics={comparisonResult.metrics}
              stats={comparisonResult.stats}
              summary={comparisonResult.summary}
              meta={comparisonResult.meta}
            />

            {/* 2. Executive Difference Summary (AI / Heuristic) */}
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

      {/* Footer (Cambased Agency Clean Style) */}
      <footer className="mt-auto py-10 border-t border-slate-200/80 dark:border-white/[0.06] bg-white dark:bg-[#0B0F19] text-xs text-slate-500 font-medium">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <span className="font-extrabold text-sm text-slate-900 dark:text-white">
              Doc<span className="text-[#FF5E1E]">Diff</span>
            </span>
            <span className="text-slate-400">&bull; Enterprise Document Intelligence</span>
          </div>
          <p className="text-slate-400">100% Client & In-Memory Safe &bull; Zero Disk Retention</p>
        </div>
      </footer>
    </div>
  );
}
