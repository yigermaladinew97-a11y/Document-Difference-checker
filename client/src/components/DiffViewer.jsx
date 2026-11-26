import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  Columns,
  AlignLeft,
  Filter,
  Search,
  Copy,
  Check,
  Download,
  WrapText,
  FileText,
  SlidersHorizontal,
  FileEdit,
  RotateCcw,
  Sparkles,
  ChevronUp,
  ChevronDown,
  X,
  Table,
  Layers,
  Volume2,
  VolumeX,
  Keyboard,
  Info,
  Image as ImageIcon,
  Camera,
  Lock,
  CheckCircle2
} from 'lucide-react';
import NoiseFiltersBar from './NoiseFiltersBar';
import MergeResolver from './MergeResolver';
import InlineChangeAction from './InlineChangeAction';
import SpreadsheetGridDiff from './SpreadsheetGridDiff';
import DiffMiniMap from './DiffMiniMap';
import CurtainSwipeDiff from './CurtainSwipeDiff';
import KeyboardShortcutsModal from './KeyboardShortcutsModal';
import { soundEffects } from '../utils/audioFeedback';
import { extractChangeBlocks, tagTokensWithChangeIds, exportRedlineDocx } from '../utils/mergeExporter';

export default function DiffViewer({
  diffTokens,
  meta,
  stats,
  filters,
  onFilterChange,
  onApplyFilters,
  isComparing = false,
  onExportPdf,
  initialDecisions = {},
  onDecisionsChange,
  spreadsheetDiff,
  imageDiff = null,
  entitySwaps = [],
  currentUser = null,
  onRequestAuth = null,
  readOnly = false
}) {
  const hasSpreadsheet = Boolean(spreadsheetDiff && spreadsheetDiff.length > 0);
  const hasImages = Boolean(imageDiff && imageDiff.hasImages);
  const [viewMode, setViewMode] = useState(() => (hasSpreadsheet ? 'spreadsheet' : 'sideBySide'));
  const [filterChangesOnly, setFilterChangesOnly] = useState(false);
  const [wrapText, setWrapText] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [copied, setCopied] = useState(false);
  const [showFilterTray, setShowFilterTray] = useState(false);
  const [isExportingWord, setIsExportingWord] = useState(false);
  const [isKeyboardModalOpen, setIsKeyboardModalOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(() => soundEffects.isSoundEnabled());

  // In-line change decision state shared across Side-by-Side, Unified, and MergeResolver
  const [decisions, setDecisions] = useState(() => initialDecisions || {});
  const [hoveredChangeId, setHoveredChangeId] = useState(null);
  const [currentChangeIndex, setCurrentChangeIndex] = useState(0);

  const toggleSound = () => {
    const next = soundEffects.toggleSound();
    setSoundEnabled(next);
  };

  const handleExportRedlineWord = async () => {
    if (!currentUser && onRequestAuth) {
      onRequestAuth('signup', 'Create a free account or sign in to download Legal Redline Word (.docx) markups with Track Changes.');
      return;
    }
    try {
      setIsExportingWord(true);
      await exportRedlineDocx(diffTokens, meta, stats);
    } catch (err) {
      console.error('Failed to export redline Word document:', err);
      alert('Could not export redline Word document.');
    } finally {
      setIsExportingWord(false);
    }
  };

  // Auto-switch to spreadsheet view if spreadsheetDiff is provided
  useEffect(() => {
    if (hasSpreadsheet) {
      setViewMode('spreadsheet');
    }
  }, [hasSpreadsheet]);

  // Synchronize when restored from history
  useEffect(() => {
    if (initialDecisions) {
      setDecisions(initialDecisions);
    }
  }, [initialDecisions]);

  const activeFilterCount = filters ? Object.values(filters).filter(Boolean).length : 0;

  const leftPaneRef = useRef(null);
  const rightPaneRef = useRef(null);
  const isSyncingRef = useRef(false);

  // Synchronized Scrolling between Left and Right Panes
  const handleScroll = (source) => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;

    if (source === 'left' && leftPaneRef.current && rightPaneRef.current) {
      rightPaneRef.current.scrollTop = leftPaneRef.current.scrollTop;
    } else if (source === 'right' && rightPaneRef.current && leftPaneRef.current) {
      leftPaneRef.current.scrollTop = rightPaneRef.current.scrollTop;
    }

    setTimeout(() => {
      isSyncingRef.current = false;
    }, 35);
  };

  // Tag raw tokens with change metadata (changeId, changeNum, changeType, etc.)
  const taggedDiffTokens = useMemo(() => tagTokensWithChangeIds(diffTokens), [diffTokens]);
  const changeBlocks = useMemo(() => extractChangeBlocks(diffTokens).filter(b => b.isChange), [diffTokens]);

  const totalChanges = changeBlocks.length;
  const acceptedCount = changeBlocks.filter(b => decisions[b.id] === 'accepted').length;
  const rejectedCount = changeBlocks.filter(b => decisions[b.id] === 'rejected').length;
  const resolvedCount = acceptedCount + rejectedCount;
  const percentResolved = totalChanges > 0 ? Math.round((resolvedCount / totalChanges) * 100) : 100;

  // Single change decision handler with audio haptics
  const handleInlineDecision = (changeId, choice) => {
    if (choice === 'accepted') soundEffects.playAccept();
    else if (choice === 'rejected') soundEffects.playReject();
    else soundEffects.playTick();

    setDecisions(prev => {
      const next = { ...prev, [changeId]: choice };
      if (onDecisionsChange) onDecisionsChange(next);
      return next;
    });
  };

  // Bulk decision handlers with audio haptics
  const handleAcceptAll = () => {
    soundEffects.playAccept();
    const next = {};
    changeBlocks.forEach(b => { next[b.id] = 'accepted'; });
    setDecisions(next);
    if (onDecisionsChange) onDecisionsChange(next);
  };

  const handleRejectAll = () => {
    soundEffects.playReject();
    const next = {};
    changeBlocks.forEach(b => { next[b.id] = 'rejected'; });
    setDecisions(next);
    if (onDecisionsChange) onDecisionsChange(next);
  };

  const handleResetAll = () => {
    soundEffects.playTick();
    setDecisions({});
    if (onDecisionsChange) onDecisionsChange({});
  };

  // Smooth jump to next/previous change
  const jumpToChange = (direction) => {
    if (totalChanges === 0) return;
    soundEffects.playTick();
    let nextIdx = direction === 'next' ? currentChangeIndex + 1 : currentChangeIndex - 1;
    if (nextIdx >= totalChanges) nextIdx = 0;
    if (nextIdx < 0) nextIdx = totalChanges - 1;
    setCurrentChangeIndex(nextIdx);

    const target = changeBlocks[nextIdx];
    if (target) {
      setHoveredChangeId(target.id);
      const el = document.getElementById(`diff-change-${target.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  };

  // Keyboard Navigation Listener
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) {
        return;
      }

      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault();
        jumpToChange('next');
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault();
        jumpToChange('prev');
      } else if (e.key === 'a' || e.key === 'A') {
        if (changeBlocks[currentChangeIndex]) {
          e.preventDefault();
          handleInlineDecision(changeBlocks[currentChangeIndex].id, 'accepted');
        }
      } else if (e.key === 'r' || e.key === 'R') {
        if (changeBlocks[currentChangeIndex]) {
          e.preventDefault();
          handleInlineDecision(changeBlocks[currentChangeIndex].id, 'rejected');
        }
      } else if (e.key === 'z' || e.key === 'Z') {
        if (changeBlocks[currentChangeIndex]) {
          e.preventDefault();
          handleInlineDecision(changeBlocks[currentChangeIndex].id, 'pending');
        }
      } else if (e.key === '1') {
        setViewMode('sideBySide');
      } else if (e.key === '2') {
        setViewMode('unified');
      } else if (e.key === '3') {
        setViewMode('curtain');
      } else if (e.key === '4') {
        setViewMode('merge');
      } else if (e.key === '5' && hasSpreadsheet) {
        setViewMode('spreadsheet');
      } else if (e.key === 'm' || e.key === 'M') {
        toggleSound();
      } else if (e.key === '?') {
        e.preventDefault();
        setIsKeyboardModalOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [changeBlocks, currentChangeIndex, hasSpreadsheet]);

  // Audio Celebration when 100% of revisions resolved
  const hasCelebratedRef = useRef(false);
  useEffect(() => {
    if (totalChanges > 0 && resolvedCount === totalChanges && !hasCelebratedRef.current) {
      hasCelebratedRef.current = true;
      soundEffects.playCelebration();
    } else if (resolvedCount < totalChanges) {
      hasCelebratedRef.current = false;
    }
  }, [resolvedCount, totalChanges]);

  if (!diffTokens || diffTokens.length === 0) return null;

  // Format whitespace characters into visible symbols for clarity
  const renderWhitespaceGlyphs = (val) => {
    if (!val) return '';
    return val
      .replace(/ /g, '·')
      .replace(/\t/g, '⇥   ')
      .replace(/\n/g, '↵\n');
  };

  // Search Matches across all tagged tokens for in-context non-destructive navigation
  const searchMatches = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const matches = [];
    taggedDiffTokens.forEach((token) => {
      if (token.value && token.value.toLowerCase().includes(q)) {
        matches.push({ tokenIndex: token.globalIndex, tokenId: `diff-token-${token.globalIndex}` });
      }
    });
    return matches;
  }, [taggedDiffTokens, searchQuery]);

  const scrollToMatch = (matchIdx) => {
    const match = searchMatches[matchIdx];
    if (!match) return;
    const el = document.getElementById(match.tokenId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleNextMatch = () => {
    if (searchMatches.length === 0) return;
    const next = (currentMatchIndex + 1) % searchMatches.length;
    setCurrentMatchIndex(next);
    scrollToMatch(next);
  };

  const handlePrevMatch = () => {
    if (searchMatches.length === 0) return;
    const prev = (currentMatchIndex - 1 + searchMatches.length) % searchMatches.length;
    setCurrentMatchIndex(prev);
    scrollToMatch(prev);
  };

  useEffect(() => {
    if (searchQuery.trim() && searchMatches.length > 0) {
      setCurrentMatchIndex(0);
      scrollToMatch(0);
    }
  }, [searchQuery]);

  // Non-destructive token display: keep full document paragraph context when searching
  const filteredTokens = useMemo(() => {
    if (filterChangesOnly) {
      return taggedDiffTokens.filter(token => token.type !== 'unchanged');
    }
    return taggedDiffTokens;
  }, [taggedDiffTokens, filterChangesOnly]);

  const tokensDocA = useMemo(() => taggedDiffTokens.filter(t => t.type === 'unchanged' || t.type === 'removed'), [taggedDiffTokens]);
  const tokensDocB = useMemo(() => taggedDiffTokens.filter(t => t.type === 'unchanged' || t.type === 'added'), [taggedDiffTokens]);

  // Aligned dual-pane block grouping to prevent vertical paragraph drift in Side-by-Side view
  const alignedBlocks = useMemo(() => {
    if (!taggedDiffTokens || taggedDiffTokens.length === 0) return [];
    const blocks = [];
    let currentBlock = {
      id: 'block-0',
      type: 'unchanged',
      tokensDocA: [],
      tokensDocB: []
    };

    for (let i = 0; i < taggedDiffTokens.length; i++) {
      const token = taggedDiffTokens[i];

      if (token.isChange) {
        if (currentBlock.tokensDocA.length > 0 || currentBlock.tokensDocB.length > 0) {
          blocks.push(currentBlock);
          currentBlock = {
            id: `block-${blocks.length}`,
            type: 'unchanged',
            tokensDocA: [],
            tokensDocB: []
          };
        }

        const changeId = token.changeId;
        const lastBlock = blocks[blocks.length - 1];
        let changeBlock = lastBlock && lastBlock.changeId === changeId ? lastBlock : null;
        if (!changeBlock) {
          changeBlock = {
            id: `block-change-${changeId}`,
            type: 'change',
            changeId: token.changeId,
            changeNum: token.changeNum,
            changeType: token.changeType,
            originalText: token.originalText,
            newText: token.newText,
            tokensDocA: [],
            tokensDocB: []
          };
          blocks.push(changeBlock);
        }

        if (token.type === 'removed') {
          changeBlock.tokensDocA.push(token);
        } else if (token.type === 'added') {
          changeBlock.tokensDocB.push(token);
        }
      } else {
        if (currentBlock.type === 'change' || currentBlock.changeId) {
          currentBlock = {
            id: `block-${blocks.length}`,
            type: 'unchanged',
            tokensDocA: [],
            tokensDocB: []
          };
        }

        currentBlock.tokensDocA.push(token);
        currentBlock.tokensDocB.push(token);

        if (token.value && token.value.includes('\n')) {
          blocks.push(currentBlock);
          currentBlock = {
            id: `block-${blocks.length}`,
            type: 'unchanged',
            tokensDocA: [],
            tokensDocB: []
          };
        }
      }
    }

    if (currentBlock.tokensDocA.length > 0 || currentBlock.tokensDocB.length > 0) {
      blocks.push(currentBlock);
    }

    return blocks;
  }, [taggedDiffTokens]);

  // Unified Token Renderer with Intra-Word Character Precision & In-Context Search Highlights
  const renderToken = (token, idx, pane = 'unified') => {
    const tokenIndex = token.globalIndex ?? idx;
    const tokenId = `diff-token-${tokenIndex}`;
    const isWs = token.isWhitespace || /^\s+$/.test(token.value);
    const decision = token.changeId ? (decisions[token.changeId] || 'pending') : 'pending';
    const isAccepted = decision === 'accepted';
    const isRejected = decision === 'rejected';
    const isHovered = token.changeId && hoveredChangeId === token.changeId;

    // Search Match Highlighting
    const hasSearch = searchQuery.trim().length > 0;
    const isSearchMatch = hasSearch && token.value && token.value.toLowerCase().includes(searchQuery.toLowerCase());
    const isActiveSearchMatch = isSearchMatch && searchMatches[currentMatchIndex]?.tokenIndex === tokenIndex;

    let searchHighlightClass = '';
    if (isActiveSearchMatch) {
      searchHighlightClass = 'ring-2 ring-[#FF5E1E] ring-offset-1 bg-amber-300 dark:bg-amber-400 text-slate-900 font-bold shadow-sm';
    } else if (isSearchMatch) {
      searchHighlightClass = 'bg-amber-100 dark:bg-amber-900/50 text-amber-950 dark:text-amber-100';
    }

    // Unchanged Token
    if (token.type === 'unchanged') {
      if (isSearchMatch) {
        return (
          <mark id={tokenId} key={idx} className={`rounded px-0.5 ${searchHighlightClass}`}>
            {token.value}
          </mark>
        );
      }
      return <span id={tokenId} key={idx}>{token.value}</span>;
    }

    // Changed Token (Added or Removed)
    let markClass = '';
    let markTitle = '';

    if (token.type === 'added') {
      if (isAccepted) {
        markClass = 'diff-token bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border-b-2 border-emerald-500 font-bold px-1.5 py-0.5 rounded mr-1 select-text shadow-xs';
        markTitle = `Accepted revision in Change #${token.changeNum}`;
      } else if (isRejected) {
        markClass = 'diff-token bg-slate-100 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 line-through decoration-rose-400 px-1.5 py-0.5 rounded mr-1 opacity-50 select-text';
        markTitle = `Rejected in Change #${token.changeNum}`;
      } else {
        if (isWs) {
          markClass = 'diff-token-ws inline-block bg-emerald-200/90 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-200 px-1 py-0.5 rounded text-[11px] font-mono border border-dashed border-emerald-400 select-all mx-0.5 align-middle';
          markTitle = `Added whitespace (${token.value.length} char${token.value.length > 1 ? 's' : ''})`;
        } else {
          markClass = `diff-token bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded-md border-b-2 border-emerald-500 font-bold mr-1 cursor-pointer transition ${
            isHovered ? 'ring-2 ring-[#FF5E1E] bg-emerald-200 dark:bg-emerald-900/60' : ''
          }`;
          markTitle = `Hover/Click to resolve Change #${token.changeNum}`;
        }
      }
    } else if (token.type === 'removed') {
      if (isAccepted) {
        markClass = 'diff-token bg-slate-100 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 line-through decoration-slate-400 px-1.5 py-0.5 rounded mr-1 opacity-50 select-text';
        markTitle = `Replaced by revision in Change #${token.changeNum}`;
      } else if (isRejected) {
        markClass = 'diff-token bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200 border-b-2 border-emerald-500 font-bold px-1.5 py-0.5 rounded mr-1 select-text shadow-xs';
        markTitle = `Original preserved in Change #${token.changeNum}`;
      } else {
        if (isWs) {
          markClass = 'diff-token-ws inline-block bg-rose-200/90 dark:bg-rose-950/80 text-rose-800 dark:text-rose-200 px-1 py-0.5 rounded text-[11px] font-mono border border-dashed border-rose-400 select-all mx-0.5 align-middle';
          markTitle = `Removed whitespace (${token.value.length} char${token.value.length > 1 ? 's' : ''})`;
        } else {
          markClass = `diff-token bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 px-1.5 py-0.5 rounded-md border-b-2 border-rose-500 font-bold line-through decoration-rose-500/60 mr-1 cursor-pointer transition ${
            isHovered ? 'ring-2 ring-[#FF5E1E] bg-rose-200 dark:bg-rose-900/60' : ''
          }`;
          markTitle = `Hover/Click to resolve Change #${token.changeNum}`;
        }
      }
    }

    if (searchHighlightClass) {
      markClass += ` ${searchHighlightClass}`;
    }

    // Token Inner Content (Intra-word sub-diff character precision)
    let tokenContent = null;
    const prefix = token.type === 'added' ? '+' : token.type === 'removed' ? '-' : '';

    if (isWs) {
      tokenContent = <span className="opacity-80 font-bold">{prefix}{renderWhitespaceGlyphs(token.value)}</span>;
    } else if (token.charDiff && token.charDiff.length > 1 && !isAccepted && !isRejected) {
      tokenContent = (
        <span>
          {prefix}
          {token.charDiff.map((part, pIdx) => {
            if (part.type === 'removed') {
              return (
                <span key={pIdx} className="bg-rose-600 text-white font-black px-0.5 rounded-xs shadow-xs" title="Exact character modified">
                  {part.value}
                </span>
              );
            }
            if (part.type === 'added') {
              return (
                <span key={pIdx} className="bg-emerald-600 text-white font-black px-0.5 rounded-xs shadow-xs" title="Exact character modified">
                  {part.value}
                </span>
              );
            }
            return <span key={pIdx}>{part.value}</span>;
          })}
        </span>
      );
    } else {
      tokenContent = <>{prefix}{token.value}</>;
    }

    const contentMark = (
      <mark id={tokenId} className={markClass} title={markTitle}>
        {tokenContent}
      </mark>
    );

    const wrapped = (
      <span
        key={idx}
        onMouseEnter={() => setHoveredChangeId(token.changeId)}
        onMouseLeave={() => setHoveredChangeId(null)}
        className="inline"
      >
        {contentMark}
      </span>
    );

    if (token.isFirstInChange && (pane === 'unified' || (pane === 'left' && token.type === 'removed') || (pane === 'right' && token.type === 'added'))) {
      return (
        <InlineChangeAction
          key={idx}
          changeId={token.changeId}
          changeNum={token.changeNum}
          changeType={token.changeType}
          originalText={token.originalText}
          newText={token.newText}
          decision={decision}
          onDecision={handleInlineDecision}
          pane={pane}
          isHovered={isHovered}
        >
          {wrapped}
        </InlineChangeAction>
      );
    }

    return wrapped;
  };

  const handleCopy = () => {
    const textDiff = diffTokens.map(t => {
      if (t.type === 'added') return `[+ ${t.value.trim()} +]`;
      if (t.type === 'removed') return `[- ${t.value.trim()} -]`;
      return t.value;
    }).join(' ');
    navigator.clipboard.writeText(textDiff);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportReport = () => {
    if (!currentUser && onRequestAuth) {
      onRequestAuth('signup', 'Create a free account or sign in to download comparison JSON reports.');
      return;
    }
    const reportData = {
      timestamp: new Date().toISOString(),
      meta,
      stats,
      diffSummary: diffTokens.filter(t => t.type !== 'unchanged').map(t => ({
        type: t.type,
        text: t.value.trim()
      }))
    };
    const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Ydiff_Report_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-[32px] bg-white dark:bg-[#111726] border border-slate-200/80 dark:border-white/[0.08] shadow-card hover:shadow-clean-hover transition-shadow duration-300 overflow-hidden">
      {/* Top Toolbar */}
      <div className="p-3.5 sm:p-5 bg-slate-50/70 dark:bg-slate-900/60 border-b border-slate-100 dark:border-white/[0.06] flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Left: View Mode Controls */}
        <div className="flex flex-wrap items-center gap-2 max-w-full">
          <div className="flex items-center bg-white dark:bg-slate-950 p-1 rounded-full border border-slate-200/80 dark:border-white/[0.08] text-xs shadow-sm overflow-x-auto max-w-full no-scrollbar">
            {hasSpreadsheet && (
              <button
                type="button"
                onClick={() => setViewMode('spreadsheet')}
                className={`shrink-0 flex items-center space-x-1.5 px-3 sm:px-4 py-1.5 rounded-full font-bold transition-all duration-200 ${viewMode === 'spreadsheet'
                    ? 'bg-[#FF5E1E] text-white shadow-sm scale-100'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                title="Spreadsheet cell-by-cell table comparison"
              >
                <Table className="w-3.5 h-3.5" />
                <span>Table</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setViewMode('sideBySide')}
              className={`shrink-0 flex items-center space-x-1.5 px-3 sm:px-4 py-1.5 rounded-full font-bold transition-all duration-200 ${viewMode === 'sideBySide'
                  ? 'bg-[#FF5E1E] text-white shadow-sm scale-100'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              title="Compare Old and New documents side-by-side [1]"
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Side-by-Side</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('unified')}
              className={`shrink-0 flex items-center space-x-1.5 px-3 sm:px-4 py-1.5 rounded-full font-bold transition-all duration-200 ${viewMode === 'unified'
                  ? 'bg-[#FF5E1E] text-white shadow-sm scale-100'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              title="Show all revisions in one continuous document [2]"
            >
              <AlignLeft className="w-3.5 h-3.5" />
              <span>Single Page</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('curtain')}
              className={`shrink-0 flex items-center space-x-1.5 px-3 sm:px-4 py-1.5 rounded-full font-bold transition-all duration-200 ${viewMode === 'curtain'
                  ? 'bg-[#FF5E1E] text-white shadow-sm scale-100'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              title="Curtain swipe split slider lens [3]"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Split Slider</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('merge')}
              className={`shrink-0 flex items-center space-x-1.5 px-3 sm:px-4 py-1.5 rounded-full font-bold transition-all duration-200 ${viewMode === 'merge'
                  ? 'bg-[#FF5E1E] text-white shadow-sm scale-100'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              title="Track changes: Accept or reject each change like Microsoft Word [4]"
            >
              <FileEdit className="w-3.5 h-3.5" />
              <span>Track Changes</span>
            </button>
            {hasImages && (
              <button
                type="button"
                onClick={() => setViewMode('images')}
                className={`shrink-0 flex items-center space-x-1.5 px-3 sm:px-4 py-1.5 rounded-full font-bold transition-all duration-200 ${viewMode === 'images'
                    ? 'bg-[#FF5E1E] text-white shadow-sm scale-100'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                  }`}
                title="View embedded photos and visual media diff"
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Visuals ({imageDiff.countA + imageDiff.countB})</span>
                {imageDiff.status === 'REPLACED' && (
                  <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                )}
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setFilterChangesOnly(!filterChangesOnly)}
            className={`flex items-center space-x-1.5 px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all duration-200 shrink-0 ${filterChangesOnly
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border-amber-300 shadow-sm scale-105'
                : 'bg-white dark:bg-slate-950 border-slate-200/80 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 hover:text-slate-900 shadow-sm hover:scale-105'
              }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Changes Only</span>
          </button>

          <button
            type="button"
            onClick={() => setWrapText(!wrapText)}
            className={`hidden sm:flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold border transition shrink-0 ${wrapText
                ? 'bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-white border-transparent'
                : 'bg-white dark:bg-slate-950 border-slate-200/80 dark:border-white/[0.08] text-slate-500 hover:text-slate-900'
              }`}
            title="Toggle word wrap"
          >
            <WrapText className="w-3.5 h-3.5" />
            <span>Wrap</span>
          </button>

          {filters && onFilterChange && (
            <button
              type="button"
              onClick={() => setShowFilterTray(!showFilterTray)}
              className={`flex items-center space-x-1.5 px-3 sm:px-3.5 py-1.5 rounded-full text-xs font-bold border transition-all duration-200 shrink-0 ${showFilterTray
                  ? 'bg-[#FF5E1E] text-white border-transparent shadow-xs scale-105'
                  : activeFilterCount > 0
                    ? 'bg-[#FF5E1E]/10 text-[#FF5E1E] border-[#FF5E1E]/30 shadow-xs'
                    : 'bg-white dark:bg-slate-950 border-slate-200/80 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 hover:text-slate-900 shadow-xs'
                }`}
              title="Toggle Smart Noise Filters"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>Filters ({activeFilterCount})</span>
            </button>
          )}
        </div>

        {/* Right: Search, Export & Copy */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:flex-initial flex items-center">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (e.shiftKey) handlePrevMatch();
                  else handleNextMatch();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  setSearchQuery('');
                }
              }}
              placeholder="Search in diff (Enter = next)..."
              className="pl-8 pr-20 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/[0.08] rounded-full text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#FF5E1E]/30 w-full sm:w-60 shadow-sm font-mono"
            />
            {searchQuery.trim() && (
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center space-x-0.5">
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold">
                  {searchMatches.length > 0 ? `${currentMatchIndex + 1}/${searchMatches.length}` : '0'}
                </span>
                <button
                  type="button"
                  onClick={handlePrevMatch}
                  disabled={searchMatches.length === 0}
                  className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white disabled:opacity-30 transition"
                  title="Previous match (Shift+Enter)"
                >
                  <ChevronUp className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={handleNextMatch}
                  disabled={searchMatches.length === 0}
                  className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white disabled:opacity-30 transition"
                  title="Next match (Enter)"
                >
                  <ChevronDown className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-white transition"
                  title="Clear search (Esc)"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center space-x-1.5 px-3 sm:px-3.5 py-1.5 rounded-full bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 border border-slate-200 dark:border-white/[0.08] text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm hover:scale-105 active:scale-95 transition"
            title="Copy diff to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            <span className="hidden xs:inline">{copied ? 'Copied' : 'Copy'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportReport}
            className="flex items-center space-x-1.5 px-3 sm:px-3.5 py-1.5 rounded-full bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 border border-slate-200 dark:border-white/[0.08] text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm hover:scale-105 active:scale-95 transition"
            title={currentUser ? "Export JSON report" : "Sign in to export JSON report"}
          >
            {currentUser ? <Download className="w-3.5 h-3.5 text-slate-400" /> : <Lock className="w-3.5 h-3.5 text-slate-400" />}
            <span className="hidden xs:inline">{currentUser ? 'Export' : 'Export (Sign In)'}</span>
          </button>

          {onExportPdf && (
            <button
              type="button"
              onClick={() => {
                if (!currentUser && onRequestAuth) {
                  onRequestAuth('signup', 'Create a free account or sign in to export agency-grade PDF Audit Reports.');
                  return;
                }
                onExportPdf();
              }}
              className="flex items-center space-x-1.5 px-3 sm:px-3.5 py-1.5 rounded-full bg-[#FF5E1E]/10 hover:bg-[#FF5E1E]/20 text-[#FF5E1E] border border-[#FF5E1E]/30 text-xs font-bold shadow-sm hover:scale-105 active:scale-95 transition"
              title={currentUser ? "1-Click Download Executive PDF Audit Report" : "Sign in to download PDF report"}
            >
              {currentUser ? <Download className="w-3.5 h-3.5" /> : <Lock className="w-3.5 h-3.5" />}
              <span>{currentUser ? 'PDF Report' : 'PDF (Sign In)'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportRedlineWord}
            disabled={isExportingWord}
            className="flex items-center space-x-1.5 px-3 sm:px-3.5 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-xs font-bold shadow-sm hover:scale-105 active:scale-95 transition disabled:opacity-50"
            title={currentUser ? "Download Legal Redline Word Document (.docx)" : "Sign in to download Redline Word (.docx)"}
          >
            {currentUser ? <FileEdit className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" /> : <Lock className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />}
            <span className="hidden xs:inline">{isExportingWord ? 'Exporting...' : (currentUser ? 'Redline Word' : 'Word (Sign In)')}</span>
            <span className="xs:hidden">{isExportingWord ? '...' : (currentUser ? 'Word' : 'Word 🔒')}</span>
          </button>

          {/* Sound Feedback Toggle */}
          <button
            type="button"
            onClick={toggleSound}
            className={`p-2 rounded-full border transition hover:scale-105 active:scale-95 shadow-xs ${
              soundEnabled
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400'
                : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-white/[0.08] text-slate-400'
            }`}
            title={soundEnabled ? 'Audio Chimes Enabled [M] (Click to Mute)' : 'Audio Chimes Muted [M] (Click to Enable)'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* Keyboard Shortcuts Trigger */}
          <button
            type="button"
            onClick={() => setIsKeyboardModalOpen(true)}
            className="p-2 rounded-full bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 border border-slate-200 dark:border-white/[0.08] text-slate-500 hover:text-[#FF5E1E] transition hover:scale-105 active:scale-95 shadow-xs"
            title="Keyboard Shortcuts Cheat Sheet [?]"
          >
            <Keyboard className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Friendly Plain-English Color Guide Legend Banner */}
      <div className="px-6 py-2.5 bg-[#FFF9F6] dark:bg-slate-900/40 border-b border-[#FFD6C4]/60 dark:border-white/[0.06] flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3 sm:gap-5">
          <span className="font-extrabold text-slate-700 dark:text-slate-300 flex items-center space-x-1.5">
            <Info className="w-3.5 h-3.5 text-[#FF5E1E]" />
            <span>Color Guide:</span>
          </span>
          <span className="inline-flex items-center space-x-1.5 text-rose-600 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-950/40 px-2.5 py-0.5 rounded-full border border-rose-200 dark:border-rose-900/50">
            <span className="w-2 h-2 rounded-full bg-rose-500" />
            <span className="line-through">Red text</span>
            <span className="text-[11px] font-normal text-rose-500/80">= Deleted from old version</span>
          </span>
          <span className="inline-flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-900/50">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="underline">Green text</span>
            <span className="text-[11px] font-normal text-emerald-600/80">= Added in new version</span>
          </span>
          <span className="hidden lg:inline-flex items-center space-x-1.5 text-slate-500 dark:text-slate-400 text-[11px]">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span>Black text = Kept unchanged</span>
          </span>
        </div>
        <span className="text-[11px] text-slate-400 font-medium hidden md:inline">
          💡 Tip: Hover any word or click "Track Changes" to approve edits
        </span>
      </div>

      {/* Expandable Smart Noise Filters Tray */}
      {showFilterTray && filters && onFilterChange && (
        <div className="p-4 bg-slate-50 dark:bg-slate-900/90 border-b border-slate-200/80 dark:border-white/[0.08] animate-in fade-in duration-200">
          <NoiseFiltersBar
            filters={filters}
            onFilterChange={onFilterChange}
            onApply={onApplyFilters}
            isComparing={isComparing}
            showApplyButton={true}
            compact={true}
          />
        </div>
      )}

      {/* Quick In-Line Resolver & Jump Navigation Bar */}
      {viewMode !== 'merge' && viewMode !== 'spreadsheet' && viewMode !== 'curtain' && totalChanges > 0 && (
        <div className="px-6 py-2.5 bg-slate-50/90 dark:bg-slate-900/80 border-b border-slate-100 dark:border-white/[0.04] flex flex-wrap items-center justify-between gap-3 text-xs">
          {/* Left: Progress info */}
          <div className="flex items-center space-x-3">
            <span className="flex items-center space-x-1.5 font-bold text-slate-800 dark:text-slate-200">
              <span className="w-2 h-2 rounded-full bg-[#FF5E1E] animate-pulse" />
              <span>In-Line Resolver:</span>
            </span>
            <span className="text-slate-500 font-mono text-[11px]">
              <strong className="text-[#FF5E1E]">{resolvedCount}</strong> of <strong>{totalChanges}</strong> resolved ({percentResolved}%)
            </span>
            <div className="w-24 bg-slate-200 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden hidden sm:block">
              <div
                className="h-full bg-gradient-to-r from-[#FF5E1E] to-emerald-500 transition-all duration-300 rounded-full"
                style={{ width: `${percentResolved}%` }}
              />
            </div>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold hidden md:inline">
              ✓ {acceptedCount} accepted
            </span>
            <span className="text-[11px] text-rose-500 font-bold hidden md:inline">
              ✕ {rejectedCount} rejected
            </span>
          </div>

          {/* Right: Change Jump Navigation & Quick Bulk Actions */}
          <div className="flex items-center space-x-2">
            <div className="flex items-center bg-white dark:bg-slate-950 rounded-full border border-slate-200 dark:border-white/[0.08] p-0.5 shadow-xs">
              <button
                type="button"
                onClick={() => jumpToChange('prev')}
                className="px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:text-[#FF5E1E] transition flex items-center space-x-1"
                title="Jump to previous change"
              >
                <span>↑ Prev</span>
              </button>
              <span className="text-slate-300 dark:text-slate-700 font-mono text-[10px] px-1">
                {currentChangeIndex + 1}/{totalChanges}
              </span>
              <button
                type="button"
                onClick={() => jumpToChange('next')}
                className="px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:text-slate-300 hover:text-[#FF5E1E] transition flex items-center space-x-1"
                title="Jump to next change"
              >
                <span>Next ↓</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleAcceptAll}
              className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-100 transition shadow-xs"
              title="Accept all revisions"
            >
              Accept All
            </button>
            <button
              type="button"
              onClick={handleRejectAll}
              className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 hover:bg-rose-100 transition shadow-xs"
              title="Reject all revisions"
            >
              Reject All
            </button>
            <button
              type="button"
              onClick={handleResetAll}
              className="p-1 rounded-full bg-white dark:bg-slate-950 text-slate-400 hover:text-slate-700 dark:hover:text-white border border-slate-200 dark:border-white/[0.08] transition shadow-xs"
              title="Reset decisions"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}

      {/* Legend & Status */}
      {viewMode !== 'merge' && viewMode !== 'spreadsheet' && viewMode !== 'curtain' && (
        <div className="px-6 py-2.5 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-white/[0.04] flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-medium">
          <div className="flex items-center space-x-6">
            <span className="flex items-center space-x-2">
              <span className="w-3.5 h-2 rounded bg-rose-100 dark:bg-rose-950/60 border-b-2 border-rose-500 inline-block" />
              <span>Deleted text (Doc A)</span>
            </span>
            <span className="flex items-center space-x-2">
              <span className="w-3.5 h-2 rounded bg-emerald-100 dark:bg-emerald-950/60 border-b-2 border-emerald-500 inline-block" />
              <span>Added text (Doc B)</span>
            </span>
            <span className="hidden md:inline text-slate-400">
              Tip: Hover over any colored change to Accept or Reject in-line
            </span>
          </div>
          <div className="hidden sm:flex items-center space-x-1.5 text-slate-400 font-mono text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Synchronized scroll active</span>
          </div>
        </div>
      )}

      {/* Content Panes */}
      {viewMode === 'spreadsheet' && hasSpreadsheet ? (
        <div className="p-6 sm:p-8 bg-slate-50/40 dark:bg-transparent">
          <SpreadsheetGridDiff
            spreadsheetDiff={spreadsheetDiff}
            meta={meta}
            currentUser={currentUser}
            onRequestAuth={onRequestAuth}
          />
        </div>
      ) : viewMode === 'curtain' ? (
        <div className="p-6 sm:p-8 bg-slate-50/40 dark:bg-transparent">
          <CurtainSwipeDiff
            tokensDocA={tokensDocA}
            tokensDocB={tokensDocB}
            meta={meta}
            wrapText={wrapText}
          />
        </div>
      ) : viewMode === 'merge' ? (
        <div className="p-6 sm:p-8 bg-slate-50/40 dark:bg-transparent">
          <MergeResolver
            diffTokens={diffTokens}
            meta={meta}
            decisions={decisions}
            onDecision={handleInlineDecision}
            onAcceptAll={handleAcceptAll}
            onRejectAll={handleRejectAll}
            onResetAll={handleResetAll}
            currentUser={currentUser}
            onRequestAuth={onRequestAuth}
          />
        </div>
      ) : viewMode === 'images' && hasImages ? (
        <div className="p-6 sm:p-8 bg-slate-50/40 dark:bg-transparent space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-200/80 dark:border-white/[0.08] gap-3">
            <div>
              <h3 className="font-extrabold text-base text-slate-900 dark:text-white flex items-center gap-2">
                <Camera className="w-5 h-5 text-[#FF5E1E]" />
                <span>Embedded Photos &amp; Visual Media Studio</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider ${
                  imageDiff.status === 'REPLACED'
                    ? 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                    : imageDiff.status === 'MODIFIED'
                    ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                    : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                }`}>
                  {imageDiff.status}
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Side-by-side inspection of all embedded photos, diagrams, and portraits extracted from both documents.
              </p>
            </div>

            <div className="flex items-center space-x-3 text-xs font-mono font-bold text-slate-600 dark:text-slate-300">
              <span className="px-3 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/[0.08]">
                Doc A: {imageDiff.countA} visual(s)
              </span>
              <span className="px-3 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/[0.08]">
                Doc B: {imageDiff.countB} visual(s)
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {imageDiff.mismatches && imageDiff.mismatches.length > 0 ? (
              imageDiff.mismatches.map((mismatch, idx) => (
                <div
                  key={idx}
                  className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/[0.08] shadow-sm space-y-4"
                >
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-white/[0.06]">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                        mismatch.type === 'REPLACED'
                          ? 'bg-rose-600 text-white'
                          : mismatch.type === 'REMOVED'
                          ? 'bg-amber-600 text-white'
                          : 'bg-blue-600 text-white'
                      }`}>
                        {mismatch.type}
                      </span>
                      <h4 className="font-extrabold text-sm text-slate-900 dark:text-white">
                        {mismatch.title}
                      </h4>
                    </div>
                    <span className="text-xs font-bold text-slate-400">
                      Visual Asset #{mismatch.index}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                    {mismatch.description}
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                    {/* Doc A Image Card */}
                    <div className={`p-4 rounded-2xl border ${
                      mismatch.imgA ? 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-white/[0.08]' : 'bg-slate-100/50 dark:bg-slate-900/30 border-dashed border-slate-200 dark:border-white/[0.06]'
                    }`}>
                      <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-3">
                        <span className="uppercase tracking-wider">Document A Asset</span>
                        {mismatch.imgA && <span className="font-mono">{mismatch.imgA.sizeKb} KB</span>}
                      </div>

                      {mismatch.imgA ? (
                        <div className="flex flex-col items-center space-y-3">
                          <div className="w-full h-56 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-950 flex items-center justify-center overflow-hidden shadow-inner">
                            {mismatch.imgA.dataUri ? (
                              <img src={mismatch.imgA.dataUri} alt="Doc A" className="max-h-full max-w-full object-contain" />
                            ) : (
                              <ImageIcon className="w-12 h-12 text-slate-400" />
                            )}
                          </div>
                          <div className="w-full text-xs space-y-1 font-mono">
                            <div className="flex justify-between text-slate-600 dark:text-slate-400">
                              <span>Name:</span>
                              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">{mismatch.imgA.name}</span>
                            </div>
                            <div className="flex justify-between text-slate-500">
                              <span>SHA-256:</span>
                              <span className="truncate max-w-[180px] text-[10px]">{mismatch.imgA.hash}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="h-56 flex flex-col items-center justify-center text-slate-400 text-xs font-medium">
                          <ImageIcon className="w-8 h-8 opacity-40 mb-2" />
                          <span>No corresponding image in Document A</span>
                        </div>
                      )}
                    </div>

                    {/* Doc B Image Card */}
                    <div className={`p-4 rounded-2xl border ${
                      mismatch.imgB ? 'bg-slate-50 dark:bg-slate-950/60 border-slate-200 dark:border-white/[0.08]' : 'bg-slate-100/50 dark:bg-slate-900/30 border-dashed border-slate-200 dark:border-white/[0.06]'
                    }`}>
                      <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-3">
                        <span className="uppercase tracking-wider">Document B Asset</span>
                        {mismatch.imgB && <span className="font-mono">{mismatch.imgB.sizeKb} KB</span>}
                      </div>

                      {mismatch.imgB ? (
                        <div className="flex flex-col items-center space-y-3">
                          <div className="w-full h-56 rounded-xl border border-slate-200 dark:border-white/[0.1] bg-white dark:bg-slate-950 flex items-center justify-center overflow-hidden shadow-inner">
                            {mismatch.imgB.dataUri ? (
                              <img src={mismatch.imgB.dataUri} alt="Doc B" className="max-h-full max-w-full object-contain" />
                            ) : (
                              <ImageIcon className="w-12 h-12 text-[#FF5E1E]" />
                            )}
                          </div>
                          <div className="w-full text-xs space-y-1 font-mono">
                            <div className="flex justify-between text-slate-600 dark:text-slate-400">
                              <span>Name:</span>
                              <span className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[200px]">{mismatch.imgB.name}</span>
                            </div>
                            <div className="flex justify-between text-slate-500">
                              <span>SHA-256:</span>
                              <span className="truncate max-w-[180px] text-[10px]">{mismatch.imgB.hash}</span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="h-56 flex flex-col items-center justify-center text-slate-400 text-xs font-medium">
                          <ImageIcon className="w-8 h-8 opacity-40 mb-2" />
                          <span>Image was removed from Document B</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-white/[0.08] text-center space-y-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <h4 className="font-black text-slate-900 dark:text-white text-base">
                  All Embedded Images Are 100% Identical
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Every embedded image in Document A has a matching byte-for-byte counterpart in Document B with an identical SHA-256 fingerprint.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="relative flex">
          <div className="flex-1 min-w-0">
            {viewMode === 'sideBySide' ? (
              <div className="flex flex-col">
                {/* Sticky Side-by-Side Dual Header */}
                <div className="sticky top-0 z-10 grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-100 dark:divide-white/[0.08] bg-slate-100/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200/80 dark:border-white/[0.08]">
                  <div className="px-6 py-3.5 flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-800 dark:text-slate-200 truncate flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-[#FF5E1E] shrink-0" />
                      <span className="truncate">{meta?.docA?.filename}</span>
                    </span>
                    <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 font-bold border border-rose-200 dark:border-rose-900">
                      -{stats?.deletedWords || 0} words{stats?.deletedWhitespace > 0 ? ` · -${stats.deletedWhitespace} spaces` : ''}
                    </span>
                  </div>
                  <div className="px-6 py-3.5 flex items-center justify-between text-xs font-semibold">
                    <span className="text-slate-800 dark:text-slate-200 truncate flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="truncate">{meta?.docB?.filename}</span>
                    </span>
                    <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-200 dark:border-emerald-900">
                      +{stats?.addedWords || 0} words{stats?.addedWhitespace > 0 ? ` · +${stats.addedWhitespace} spaces` : ''}
                    </span>
                  </div>
                </div>

                {/* Aligned Dual-Pane Scroll Area with Spacer Padding */}
                <div
                  ref={leftPaneRef}
                  className={`max-h-[450px] sm:max-h-[600px] overflow-y-auto leading-relaxed text-xs sm:text-sm font-mono select-text divide-y divide-slate-100/70 dark:divide-white/[0.04]`}
                >
                  {alignedBlocks.map((block, bIdx) => (
                    <div
                      key={block.id || bIdx}
                      className={`grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-100 dark:divide-white/[0.06] transition-colors ${
                        block.type === 'change' ? 'bg-slate-50/40 dark:bg-slate-900/20' : 'hover:bg-slate-50/20 dark:hover:bg-slate-900/10'
                      }`}
                    >
                      {/* Left Column (Doc A) */}
                      <div className={`p-4 sm:p-6 text-slate-800 dark:text-slate-300 ${wrapText ? 'whitespace-pre-wrap break-words' : 'whitespace-pre overflow-x-auto'}`}>
                        {block.tokensDocA.length > 0 ? (
                          block.tokensDocA.map((token, tIdx) => renderToken(token, tIdx, 'left'))
                        ) : (
                          <div className="py-2 px-3 rounded-xl bg-slate-100/50 dark:bg-slate-900/30 border border-dashed border-slate-200 dark:border-white/[0.08] text-[11px] text-slate-400 font-mono select-none flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                            <span className="truncate font-sans italic">[No corresponding text in Doc A · Added in Doc B]</span>
                          </div>
                        )}
                      </div>

                      {/* Right Column (Doc B) */}
                      <div className={`p-4 sm:p-6 text-slate-800 dark:text-slate-300 ${wrapText ? 'whitespace-pre-wrap break-words' : 'whitespace-pre overflow-x-auto'}`}>
                        {block.tokensDocB.length > 0 ? (
                          block.tokensDocB.map((token, tIdx) => renderToken(token, tIdx, 'right'))
                        ) : (
                          <div className="py-2 px-3 rounded-xl bg-slate-100/50 dark:bg-slate-900/30 border border-dashed border-slate-200 dark:border-white/[0.08] text-[11px] text-slate-400 font-mono select-none flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                            <span className="truncate font-sans italic">[Deleted in Doc B · Retained in Doc A]</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* Unified View */
              <div className="p-8 max-h-[650px] overflow-y-auto leading-relaxed text-xs sm:text-sm font-mono whitespace-pre-wrap select-text text-slate-800 dark:text-slate-300 bg-white dark:bg-slate-900/40">
                {filteredTokens.map((token, idx) => renderToken(token, idx, 'unified'))}
              </div>
            )}
          </div>

          {/* Diff Mini-Map Change Radar Gutter */}
          {totalChanges > 0 && (
            <div className="hidden md:flex shrink-0 border-l border-slate-100 dark:border-white/[0.06] bg-slate-50/50 dark:bg-slate-900/40 items-center justify-center">
              <DiffMiniMap
                changeBlocks={changeBlocks}
                currentChangeIndex={currentChangeIndex}
                decisions={decisions}
                onJumpToChange={(idx) => {
                  setCurrentChangeIndex(idx);
                  const target = changeBlocks[idx];
                  if (target) {
                    setHoveredChangeId(target.id);
                    const el = document.getElementById(`diff-change-${target.id}`);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={isKeyboardModalOpen}
        onClose={() => setIsKeyboardModalOpen(false)}
      />
    </div>
  );
}
