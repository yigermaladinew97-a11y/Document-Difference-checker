import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import ApiKeyModal from './components/ApiKeyModal';
import DualDropzone from './components/DualDropzone';
import Scoreboard from './components/Scoreboard';
import ExecutiveSummary from './components/ExecutiveSummary';
import SectionBreakdown from './components/SectionBreakdown';
import DiffViewer from './components/DiffViewer';
import { Sparkles, AlertCircle, RefreshCw, FileDiff } from 'lucide-react';

const SAMPLE_DOC_A = `# Master Services Agreement (v1.0)
Section 1: Scope of Services
Provider agrees to deliver cloud architecture consulting and software engineering services as defined in Schedule A.

Section 2: Payment and Compensation
Client agrees to pay Provider a total fixed fee of $15,000 USD. Invoices shall be payable within 30 days of receipt (Net 30). Late payments incur a 1.5% monthly fee.

Section 3: Warranty & Support
Provider warrants all software deliverables for 30 days from client sign-off. Support includes bug fixes and critical patching.

Section 4: Confidentiality & IP
All intellectual property developed exclusively for the Client shall transfer upon full payment. Provider retains core framework licenses.`;

const SAMPLE_DOC_B = `# Master Services Agreement (v2.1 - Revised)
Section 1: Scope of Services
Provider agrees to deliver cloud architecture consulting, software engineering, and continuous DevOps deployment services as defined in Schedule A.

Section 2: Payment and Compensation
Client agrees to pay Provider a total fee of $24,500 USD with milestone disbursements. Invoices shall be payable within 60 days of receipt (Net 60). Late payments incur a 2.0% monthly fee.

Section 3: Warranty & Support
Provider warrants all software deliverables for 90 days from client sign-off. Support includes ongoing maintenance, SLA response within 4 hours, and bug fixes.

Section 4: Confidentiality & IP
All intellectual property developed exclusively for the Client shall transfer immediately upon project kickoff. Provider waives all retained licensing rights.`;

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

  // Sync theme with document element
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

      // Smooth scroll down to results
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-sky-500/30 selection:text-sky-200">
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

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-xs font-medium text-sky-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI & Lexical Two-Tier Comparison Engine</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Intelligent Document Difference Checker
          </h1>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
            Compare PDF, Word, Excel, PowerPoint, or text documents side-by-side. Spot exact word changes, detect meaning & contractual risk shifts, and calculate similarity percentages instantly.
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center space-x-2.5 max-w-3xl mx-auto">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="flex-1">{errorMessage}</span>
          </div>
        )}

        {/* Dual Upload / Input Section */}
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

        {/* Results Container */}
        {comparisonResult && (
          <div ref={resultsRef} className="pt-8 space-y-8 animate-in fade-in duration-500">
            {/* Results Title Bar with Reset */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2">
                <FileDiff className="w-5 h-5 text-sky-400" />
                <h2 className="text-lg font-bold text-white">Comparison Results</h2>
              </div>
              <button
                type="button"
                onClick={handleReset}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 hover:text-white transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Compare Another Pair</span>
              </button>
            </div>

            {/* 1. Scoreboard (Circular Gauges & Stats) */}
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

      {/* Footer */}
      <footer className="mt-auto py-6 border-t border-slate-900 text-center text-xs text-slate-500">
        <p>DocDiff &copy; {new Date().getFullYear()} &bull; Multi-Format Document Difference Engine</p>
      </footer>
    </div>
  );
}
