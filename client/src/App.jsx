import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import Navbar from './components/Navbar';
import ApiKeyModal from './components/ApiKeyModal';
import DualDropzone from './components/DualDropzone';
import Scoreboard from './components/Scoreboard';
import ExecutiveSummary from './components/ExecutiveSummary';
import SectionBreakdown from './components/SectionBreakdown';
import DiffViewer from './components/DiffViewer';
import PdfReportModal from './components/PdfReportModal';
import NoiseFiltersBar from './components/NoiseFiltersBar';
import HistoryDrawer from './components/HistoryDrawer';
import AuthModal from './components/AuthModal';
import UserProfileModal from './components/UserProfileModal';
import BatchDropzone from './components/BatchDropzone';
import BatchDashboard from './components/BatchDashboard';
import ShareModal from './components/ShareModal';
import SharedReportView from './components/SharedReportView';
import { saveComparisonSession, getAllSessions, updateSessionDecisions } from './utils/historyStorage';
import { getCurrentUser, clearAuthSession, syncCloudSession, fetchCurrentProfile } from './utils/authClient';
import {
  Sparkles,
  AlertCircle,
  RefreshCw,
  FileDiff,
  ShieldCheck,
  Zap,
  Cpu,
  Layers,
  ArrowRight,
  Award,
  SlidersHorizontal,
  FolderUp,
  ArrowLeft,
  Share2
} from 'lucide-react';

const SAMPLES = {
  contract: {
    name: 'Legal Contract (MSA)',
    a: `# Master Services Agreement (v1.0)
Section 1: Scope of Services
Provider agrees to deliver cloud architecture consulting and software engineering services as defined in Schedule A. All deliverables must meet standard ISO-27001 compliance standards.

Section 2: Payment and Compensation
Client agrees to pay Provider a total fixed fee of $15,000 USD. Invoices shall be payable within 30 days of receipt (Net 30). Late payments incur a 1.5% monthly financing charge.

Section 3: Warranty & Support
Provider warrants all software deliverables for 30 days from client sign-off. Support includes bug fixes and critical patching within 24 business hours.

Section 4: Confidentiality & IP
All intellectual property developed exclusively for the Client shall transfer upon full payment. Provider retains core framework licenses.`,
    b: `# Master Services Agreement (v2.1 - Revised)
Section 1: Scope of Services
Provider agrees to deliver cloud architecture consulting, software engineering, and continuous 24/7 DevOps deployment services as defined in Schedule A. All deliverables must meet SOC-2 Type II compliance standards.

Section 2: Payment and Compensation
Client agrees to pay Provider an escalated total fee of $24,500 USD with milestone disbursements. Invoices shall be payable within 60 days of receipt (Net 60). Late payments incur a 2.5% monthly financing charge.

Section 3: Warranty & Support
Provider warrants all software deliverables for 90 days from client sign-off. Support includes ongoing maintenance, SLA response within 4 hours, and emergency weekend patching.

Section 4: Confidentiality & IP
All intellectual property developed exclusively for the Client shall transfer immediately upon project kickoff. Provider waives all retained licensing rights and indemnifies Client against infringement.`
  },
  spreadsheet: {
    name: 'Financial Ledger (Excel/CSV)',
    a: `Product SKU,Category,Unit Price,Q1 Volume,Total Revenue
SKU-1001,Hardware,$450.00,100,$45,000.00
SKU-1002,Software License,$120.00,500,$60,000.00
SKU-1003,Professional Services,$250.00,80,$20,000.00
SKU-1004,Legacy Maintenance,$50.00,10,$500.00`,
    b: `Product SKU,Category,Unit Price,Q1 Volume,Total Revenue
SKU-1001,Hardware,$495.00,100,$49,500.00
SKU-1002,Cloud SaaS,$120.00,650,$78,000.00
SKU-1003,Professional Services,$250.00,80,$20,000.00
SKU-1005,Enterprise AI Platform,$899.00,25,$22,475.00`
  },
  tech: {
    name: 'API Architecture Spec',
    a: `# API v1.0 Architecture Specification
GET /api/v1/auth/login
Returns JWT bearer token valid for 24 hours.

POST /api/v1/data/sync
Syncs local SQLite databases with central cluster. Deprecated after Q2 2026.

DELETE /api/v1/users/{id}
Soft deletes user account and flags status as inactive. Data retained for 90 days.`,
    b: `# API v2.0 Architecture Specification (Zero-Trust Security)
POST /api/v2/auth/oauth/token
Returns short-lived ephemeral token (15 minutes) with mandatory PKCE and mTLS handshake.

POST /api/v2/data/stream
Real-time bi-directional WebSocket streaming replication backed by Apache Kafka.

DELETE /api/v2/users/{id}
Executes cryptographically verified GDPR right-to-be-forgotten purge within 24 hours.`
  }
};

export default function App() {
  const [fileA, setFileA] = useState(null);
  const [textA, setTextA] = useState('');
  const [fileB, setFileB] = useState(null);
  const [textB, setTextB] = useState('');

  const [apiKey, setApiKey] = useState(() => localStorage.getItem('docdiff_gemini_key') || '');
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  const [isComparing, setIsComparing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  // Compare Mode: 'single' vs 'batch'
  const [compareMode, setCompareMode] = useState('single');
  const [batchPairs, setBatchPairs] = useState([]);
  const [batchUnpaired, setBatchUnpaired] = useState([]);
  const [batchResults, setBatchResults] = useState(null);
  const [batchMetrics, setBatchMetrics] = useState({});
  const [inspectedPair, setInspectedPair] = useState(null);
  const [isBatchComparing, setIsBatchComparing] = useState(false);
  const [batchProgress, setBatchProgress] = useState(null);

  // 1-Click Public Share state & Route detection
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareToOpen, setShareToOpen] = useState(null);
  const [activeShareId, setActiveShareId] = useState(() => {
    const path = window.location.pathname;
    const match = path.match(/^\/share\/([a-zA-Z0-9]+)/);
    if (match) return match[1];
    const searchParams = new URLSearchParams(window.location.search);
    return searchParams.get('share');
  });

  const handleExitSharedView = () => {
    setActiveShareId(null);
    window.history.pushState({}, '', '/');
  };

  // Smart Noise Filtering options
  const [filters, setFilters] = useState({
    ignoreCase: false,
    ignorePunctuation: false,
    ignoreWhitespace: true,
    ignoreNumbers: false,
    trimLines: false
  });

  // History Drawer state & persistence
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false);
  const [historySessions, setHistorySessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);

  // Authentication & Cloud Sync state
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login');
  const [authModalReason, setAuthModalReason] = useState(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  useEffect(() => {
    // Keep user profile up-to-date from server
    fetchCurrentProfile().then((profile) => {
      if (profile) setCurrentUser(profile);
    });
  }, []);

  const handleOpenAuthModal = (mode = 'login', reason = null) => {
    setAuthModalMode(mode);
    setAuthModalReason(reason);
    setIsAuthModalOpen(true);
  };

  const handleLogout = () => {
    clearAuthSession();
    setCurrentUser(null);
  };

  const handleAuthSuccess = (user) => {
    setCurrentUser(user);
    if (comparisonResult) {
      syncCloudSession(comparisonResult);
    }
  };

  const resultsRef = useRef(null);

  const loadHistorySessions = async () => {
    try {
      const list = await getAllSessions();
      setHistorySessions(list);
    } catch (e) {
      console.warn('Could not load history:', e);
    }
  };

  useEffect(() => {
    loadHistorySessions();
  }, []);

  const handleRestoreSession = (session) => {
    setComparisonResult(session);
    setActiveSessionId(session.id);
    if (session.filters) {
      setFilters(session.filters);
    }
    setErrorMessage(null);
    triggerCelebration();

    setTimeout(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 120);
  };

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

  const handleLoadSample = (key = 'contract') => {
    const sample = SAMPLES[key] || SAMPLES.contract;
    setFileA(null);
    setFileB(null);
    setTextA(sample.a);
    setTextB(sample.b);
    setErrorMessage(null);
  };

  const triggerCelebration = () => {
    confetti({
      particleCount: 90,
      spread: 75,
      origin: { y: 0.65 },
      colors: ['#FF5E1E', '#10B981', '#38BDF8', '#F59E0B', '#6366F1']
    });
  };

  const handleCompare = async (overrideFilters) => {
    setIsComparing(true);
    setErrorMessage(null);

    // Validate overrideFilters is an actual filters object and not a SyntheticEvent
    const isFilterObject = overrideFilters &&
      typeof overrideFilters === 'object' &&
      !overrideFilters.nativeEvent &&
      !overrideFilters.target &&
      typeof overrideFilters.ignoreWhitespace !== 'undefined';

    const activeFilters = isFilterObject ? overrideFilters : filters;
    if (isFilterObject) {
      setFilters(overrideFilters);
    }

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

      // Append Smart Noise Filtering options with strict boolean values
      formData.append('ignoreCase', String(Boolean(activeFilters.ignoreCase)));
      formData.append('ignorePunctuation', String(Boolean(activeFilters.ignorePunctuation)));
      formData.append('ignoreWhitespace', String(Boolean(activeFilters.ignoreWhitespace)));
      formData.append('ignoreNumbers', String(Boolean(activeFilters.ignoreNumbers)));
      formData.append('trimLines', String(Boolean(activeFilters.trimLines)));

      const response = await fetch('/api/compare', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to compare documents');
      }

      setComparisonResult(data);
      triggerCelebration();

      // Automatically preserve comparison in private IndexedDB
      try {
        const saved = await saveComparisonSession({
          ...data,
          filters: activeFilters
        });
        if (saved) {
          setActiveSessionId(saved.id);
          loadHistorySessions();
        }

        // Auto-sync with cloud history if user is logged in
        if (currentUser) {
          syncCloudSession({
            id: saved?.id || activeSessionId,
            ...data,
            filters: activeFilters
          }).catch((err) => console.warn('Cloud sync error:', err));
        }
      } catch (saveErr) {
        console.warn('Failed to auto-save session to history:', saveErr);
      }

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

  const handleRunBatch = async () => {
    if (!batchPairs || batchPairs.length === 0) return;
    setIsBatchComparing(true);
    setErrorMessage(null);
    setBatchProgress({ label: `Preparing ${batchPairs.length} document pairs...`, percent: 15 });

    try {
      const formData = new FormData();

      // Collect all unique files
      const uniqueFiles = new Map();
      batchPairs.forEach(p => {
        if (!uniqueFiles.has(p.docA.name)) uniqueFiles.set(p.docA.name, p.docA);
        if (!uniqueFiles.has(p.docB.name)) uniqueFiles.set(p.docB.name, p.docB);
      });

      uniqueFiles.forEach(file => {
        formData.append('files', file, file.name);
      });

      // Prepare mapping
      const mapping = batchPairs.map(p => ({
        id: p.id,
        aName: p.docA.name,
        bName: p.docB.name
      }));
      formData.append('pairs', JSON.stringify(mapping));

      // Append noise filters
      formData.append('ignoreCase', String(Boolean(filters.ignoreCase)));
      formData.append('ignorePunctuation', String(Boolean(filters.ignorePunctuation)));
      formData.append('ignoreWhitespace', String(Boolean(filters.ignoreWhitespace)));
      formData.append('ignoreNumbers', String(Boolean(filters.ignoreNumbers)));
      formData.append('trimLines', String(Boolean(filters.trimLines)));

      if (apiKey) {
        formData.append('apiKey', apiKey);
      }

      setBatchProgress({ label: `Comparing ${batchPairs.length} pairs with lexical Myers engine...`, percent: 50 });

      const response = await fetch('/api/batch-compare', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Batch comparison failed');
      }

      setBatchProgress({ label: 'Synthesizing batch analytics...', percent: 90 });
      setBatchResults(data.results);
      setBatchMetrics(data.batchMetrics);
      triggerCelebration();

      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      console.error('[Batch Error]:', err);
      setErrorMessage(err.message || 'An error occurred during batch comparison.');
    } finally {
      setIsBatchComparing(false);
      setBatchProgress(null);
    }
  };

  const handleResetBatch = () => {
    setBatchResults(null);
    setBatchMetrics({});
    setInspectedPair(null);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-[#FBFBFD] dark:bg-[#0B0F19] text-slate-900 dark:text-slate-100 flex flex-col font-sans relative selection:bg-[#FF5E1E]/20 selection:text-[#FF5E1E] overflow-x-hidden">
      {/* Background Dot Pattern (Cambased Style) */}
      <div className="fixed inset-0 bg-dot-pattern pointer-events-none opacity-60 dark:opacity-20" />

      {/* Decorative Floating 3D Sphere & Badges (Like the orange sphere in Cambased!) */}
      <div className="hidden lg:block absolute top-28 right-12 w-28 h-28 rounded-full bg-gradient-to-tr from-[#FF5E1E] via-[#FF7A45] to-[#FFA07A] shadow-orange-soft animate-float pointer-events-none opacity-90 blur-[0.5px]" />
      <div className="hidden lg:block absolute top-48 right-32 w-10 h-10 rounded-full bg-gradient-to-tr from-amber-400 to-orange-300 shadow-lg animate-float-reverse pointer-events-none opacity-80" />
      <div className="hidden lg:block absolute top-36 left-12 p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/[0.08] shadow-card animate-float-reverse pointer-events-none">
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 dark:text-slate-200">
          <Award className="w-4 h-4 text-[#FF5E1E]" />
          <span>Word Myers Diff &bull; Active</span>
        </div>
      </div>

      <Navbar
        apiKey={apiKey}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        isDark={isDark}
        onToggleTheme={() => setIsDark(!isDark)}
        isComparing={isComparing}
        historyCount={historySessions.length}
        onOpenHistory={() => setIsHistoryDrawerOpen(true)}
        currentUser={currentUser}
        onOpenAuthModal={handleOpenAuthModal}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onLogout={handleLogout}
      />

      <HistoryDrawer
        isOpen={isHistoryDrawerOpen}
        onClose={() => setIsHistoryDrawerOpen(false)}
        sessions={historySessions}
        onRestoreSession={handleRestoreSession}
        onSessionsChange={loadHistorySessions}
        currentUser={currentUser}
        onRequestAuth={handleOpenAuthModal}
      />

      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        currentKey={apiKey}
        onSaveKey={handleSaveApiKey}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
        reasonMessage={authModalReason}
        onSuccess={handleAuthSuccess}
      />

      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        currentUser={currentUser}
        onUserUpdated={(updated) => setCurrentUser(updated)}
        onLogout={handleLogout}
        historyCount={historySessions.length}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => { setIsShareModalOpen(false); setShareToOpen(null); }}
        comparisonData={shareToOpen || comparisonResult}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16 space-y-12 relative z-10">
        {activeShareId ? (
          <SharedReportView
            shareId={activeShareId}
            onExitSharedView={handleExitSharedView}
          />
        ) : (
          <>
            {/* Hero Section (Matching Cambased Display Style) */}
        <div className="max-w-4xl mx-auto text-center space-y-5">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-[#FFF4EF] dark:bg-[#FF5E1E]/15 border border-[#FFD6C4] dark:border-[#FF5E1E]/30 text-xs font-bold text-[#FF5E1E] shadow-sm hover:scale-105 transition-transform cursor-default">
            <span>AI & Word-Level Enterprise Document Diff</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.12]">
            We Build Clarity Around <br />
            <span className="text-[#FF5E1E] relative inline-block">
              Document Differences
              {/* Subtle underline sketch */}
              <svg className="absolute -bottom-2 left-0 w-full h-3 text-[#FF5E1E]/30 pointer-events-none" viewBox="0 0 100 12" preserveAspectRatio="none">
                <path d="M0,8 Q50,0 100,8" stroke="currentColor" strokeWidth="3" fill="none" />
              </svg>
            </span> That Scale.
          </h1>

          <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 font-medium max-w-2xl mx-auto leading-relaxed">
            Spot subtle wording revisions, altered financial terms, and semantic meaning shifts across <strong className="text-slate-900 dark:text-white font-bold">PDF, Word, Excel, PowerPoint</strong> and text files.
          </p>

          {/* Cambased-Style Floating Quick Stats Strip with Hover Effects */}
          <div className="pt-3 flex flex-wrap items-center justify-center gap-3 text-xs font-bold">
            <div className="px-4 py-2 rounded-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/[0.08] shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center space-x-2 text-slate-700 dark:text-slate-300">
              <Zap className="w-4 h-4 text-[#FF5E1E]" />
              <span>Word-by-Word Accuracy</span>
            </div>
            <div className="px-4 py-2 rounded-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/[0.08] shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center space-x-2 text-slate-700 dark:text-slate-300">
              <Cpu className="w-4 h-4 text-emerald-500" />
              <span>Gemini 2.5 Flash Reasoning</span>
            </div>
            <div className="px-4 py-2 rounded-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/[0.08] shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center space-x-2 text-slate-700 dark:text-slate-300">
              <Layers className="w-4 h-4 text-blue-500" />
              <span>PDF &bull; DOCX &bull; XLSX &bull; PPTX</span>
            </div>
            <div className="px-4 py-2 rounded-full bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/[0.08] shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex items-center space-x-2 text-slate-700 dark:text-slate-300">
              <ShieldCheck className="w-4 h-4 text-indigo-500" />
              <span>100% In-Memory Privacy</span>
            </div>
          </div>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-xs font-bold text-rose-700 dark:text-rose-300 flex items-center space-x-3 max-w-3xl mx-auto shadow-sm animate-in fade-in duration-300">
            <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
            <span className="flex-1">{errorMessage}</span>
          </div>
        )}

        {/* Compare Mode Switcher (Single Pair vs Batch Folder) */}
        <div className="flex justify-center pt-2">
          <div className="p-1 rounded-2xl bg-slate-200/70 dark:bg-slate-900 border border-slate-300/60 dark:border-white/[0.08] inline-flex items-center space-x-1 shadow-inner">
            <button
              type="button"
              onClick={() => { setCompareMode('single'); setInspectedPair(null); }}
              className={`flex items-center space-x-2 px-5 py-2 rounded-xl text-xs font-black transition-all ${
                compareMode === 'single'
                  ? 'bg-white dark:bg-[#111726] text-[#FF5E1E] shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FileDiff className="w-3.5 h-3.5" />
              <span>Single Pair</span>
            </button>
            <button
              type="button"
              onClick={() => { setCompareMode('batch'); setComparisonResult(null); }}
              className={`flex items-center space-x-2 px-5 py-2 rounded-xl text-xs font-black transition-all ${
                compareMode === 'batch'
                  ? 'bg-white dark:bg-[#111726] text-[#FF5E1E] shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <FolderUp className="w-3.5 h-3.5" />
              <span>Batch Folder</span>
              <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-[#FF5E1E]/15 text-[#FF5E1E] border border-[#FF5E1E]/20">
                NEW
              </span>
            </button>
          </div>
        </div>

        {/* Mode 1: Single Pair Comparison */}
        {compareMode === 'single' && (
          <>
            <DualDropzone
              fileA={fileA}
              setFileA={setFileA}
              textA={textA}
              setTextA={setTextA}
              fileB={fileB}
              setFileB={setFileB}
              textB={textB}
              setTextB={setTextB}
              onCompare={(f) => handleCompare(f)}
              isComparing={isComparing}
              onLoadSample={handleLoadSample}
              filters={filters}
              onFilterChange={setFilters}
            />

            {/* Comparison Results Section */}
            {comparisonResult && (
              <div ref={resultsRef} className="pt-10 space-y-10 animate-in fade-in duration-700">
                {/* Results Title Bar with Reset Button */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/[0.08]">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-[#FFF4EF] dark:bg-[#FF5E1E]/15 text-[#FF5E1E] flex items-center justify-center shadow-sm">
                      <FileDiff className="w-5 h-5 stroke-[2.2]" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Intelligence &amp; Diff Results</h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Multi-tier metrics, semantic breakdown, and synchronized view</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => { setShareToOpen(comparisonResult); setIsShareModalOpen(true); }}
                      className="group flex items-center space-x-1.5 px-4 py-2 rounded-full bg-[#FFF4EF] dark:bg-[#FF5E1E]/15 hover:bg-[#FF5E1E]/25 border border-[#FF5E1E]/30 text-xs font-semibold text-[#FF5E1E] shadow-xs transition hover:scale-105 active:scale-95 cursor-pointer"
                      title="Generate public shareable link for clients &amp; teammates"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Share</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleReset}
                      className="group flex items-center space-x-2 px-4 py-2 rounded-full bg-white dark:bg-slate-900 hover:bg-slate-50 border border-slate-200 dark:border-white/[0.08] text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm transition hover:scale-105 active:scale-95"
                    >
                      <RefreshCw className="w-3.5 h-3.5 text-[#FF5E1E] group-hover:rotate-180 transition-transform duration-500" />
                      <span>Compare Another Pair</span>
                    </button>
                  </div>
                </div>

                {/* Real-time Smart Noise Filters on Results Screen */}
                <div className="p-4 sm:p-5 rounded-3xl bg-white dark:bg-[#111726] border border-slate-200/80 dark:border-white/[0.08] shadow-card space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06] gap-2">
                    <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                      <SlidersHorizontal className="w-4 h-4 text-[#FF5E1E]" />
                      <span>Real-Time Comparison Rules</span>
                    </span>
                    <span className="text-[11px] text-slate-400 font-medium">
                      Toggle "Normalize Spaces" below to instantly switch between ignoring spaces and detecting exact whitespace
                    </span>
                  </div>
                  <NoiseFiltersBar
                    filters={filters}
                    onFilterChange={setFilters}
                    onApply={(newFilters) => handleCompare(newFilters)}
                    isComparing={isComparing}
                  />
                </div>

                {/* 1. Visual Match Scoreboard & Percentage Gauges (First immediately after running) */}
                <Scoreboard
                  metrics={comparisonResult.metrics}
                  stats={comparisonResult.stats}
                  summary={comparisonResult.summary}
                  meta={comparisonResult.meta}
                  filters={comparisonResult.filters || filters}
                  onExportPdf={() => setIsPdfModalOpen(true)}
                />

                {/* 2. What Changed? (Detailed Plain-English Explanation) */}
                <ExecutiveSummary
                  contextAnalysis={comparisonResult.contextAnalysis}
                  summary={comparisonResult.summary}
                />

                {/* 3. Section / Page / Slide Breakdown */}
                <SectionBreakdown
                  sectionReports={comparisonResult.sectionReports}
                  meta={comparisonResult.meta}
                />

                {/* 4. Interactive Diff Viewer with Micro-Hover Tokens & Smart Noise Filter Toolbar */}
                <DiffViewer
                  diffTokens={comparisonResult.diffTokens}
                  meta={comparisonResult.meta}
                  stats={comparisonResult.stats}
                  filters={filters}
                  onFilterChange={setFilters}
                  onApplyFilters={handleCompare}
                  isComparing={isComparing}
                  onExportPdf={() => setIsPdfModalOpen(true)}
                  initialDecisions={comparisonResult.decisions || {}}
                  onDecisionsChange={(newDecisions) => {
                    if (activeSessionId) {
                      updateSessionDecisions(activeSessionId, newDecisions);
                    }
                  }}
                  spreadsheetDiff={comparisonResult.spreadsheetDiff}
                  currentUser={currentUser}
                  onRequestAuth={handleOpenAuthModal}
                />

                {/* 5. Executive PDF Audit Report Modal */}
                <PdfReportModal
                  isOpen={isPdfModalOpen}
                  onClose={() => setIsPdfModalOpen(false)}
                  data={comparisonResult}
                />
              </div>
            )}
          </>
        )}

        {/* Mode 2: Batch Folder Comparison */}
        {compareMode === 'batch' && (
          <div ref={resultsRef} className="space-y-8">
            {inspectedPair ? (
              /* Inspected Batch Pair Detailed Drill-Down */
              <div className="pt-4 space-y-10 animate-in fade-in duration-500">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200 dark:border-white/[0.08] gap-4">
                  <button
                    type="button"
                    onClick={() => setInspectedPair(null)}
                    className="flex items-center space-x-2 px-4 py-2 rounded-full bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-white/[0.08] text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm transition hover:scale-105 active:scale-95"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 text-[#FF5E1E]" />
                    <span>Back to Batch Dashboard</span>
                  </button>

                  <div className="flex items-center space-x-3">
                    <button
                      type="button"
                      onClick={() => { setShareToOpen(inspectedPair); setIsShareModalOpen(true); }}
                      className="flex items-center space-x-1.5 px-3.5 py-2 rounded-full bg-[#FFF4EF] dark:bg-[#FF5E1E]/15 hover:bg-[#FF5E1E]/25 border border-[#FF5E1E]/30 text-xs font-semibold text-[#FF5E1E] shadow-xs transition hover:scale-105 active:scale-95"
                      title="Share this specific pair"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Share Pair</span>
                    </button>

                    <div className="text-left sm:text-right">
                      <span className="text-[11px] font-bold text-slate-400 block uppercase tracking-wider">
                        Drill-Down Inspection
                      </span>
                      <span className="text-xs font-bold text-slate-900 dark:text-white">
                        {inspectedPair.meta.docA.filename} &bull; {inspectedPair.meta.docB.filename}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Match Scoreboard */}
                <Scoreboard
                  metrics={inspectedPair.metrics}
                  stats={inspectedPair.stats}
                  summary={inspectedPair.summary}
                  meta={inspectedPair.meta}
                  filters={inspectedPair.filters || filters}
                  onExportPdf={() => setIsPdfModalOpen(true)}
                />

                {/* What Changed? */}
                <ExecutiveSummary
                  contextAnalysis={inspectedPair.contextAnalysis}
                  summary={inspectedPair.summary}
                />

                {/* Section Breakdown */}
                <SectionBreakdown
                  sectionReports={inspectedPair.sectionReports}
                  meta={inspectedPair.meta}
                />

                {/* Full Diff Viewer */}
                <DiffViewer
                  diffTokens={inspectedPair.diffTokens}
                  meta={inspectedPair.meta}
                  stats={inspectedPair.stats}
                  filters={filters}
                  onFilterChange={setFilters}
                  onApplyFilters={handleCompare}
                  isComparing={isComparing}
                  onExportPdf={() => setIsPdfModalOpen(true)}
                  initialDecisions={{}}
                  spreadsheetDiff={inspectedPair.spreadsheetDiff}
                  currentUser={currentUser}
                  onRequestAuth={handleOpenAuthModal}
                />

                {/* PDF Modal */}
                <PdfReportModal
                  isOpen={isPdfModalOpen}
                  onClose={() => setIsPdfModalOpen(false)}
                  data={inspectedPair}
                />
              </div>
            ) : batchResults ? (
              /* Batch Results Dashboard Table */
              <BatchDashboard
                batchResults={batchResults}
                batchMetrics={batchMetrics}
                onInspectPair={(p) => setInspectedPair(p)}
                onResetBatch={handleResetBatch}
              />
            ) : (
              /* Batch Upload & Auto-Pairing Review */
              <BatchDropzone
                pairs={batchPairs}
                setPairs={setBatchPairs}
                unpaired={batchUnpaired}
                setUnpaired={setBatchUnpaired}
                onRunBatch={handleRunBatch}
                isComparing={isBatchComparing}
                progress={batchProgress}
              />
            )}
          </div>
        )}
          </>
        )}
      </main>

      {/* Footer */}
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
