import React, { useState } from 'react';
import { Check, X, RotateCcw, ArrowRight } from 'lucide-react';

/**
 * InlineChangeAction:
 * Micro floating pill / popover rendered alongside or above diff tokens in Side-by-Side & Unified views.
 * Enables one-click Accept/Reject without leaving the visual diff reading view.
 */
export default function InlineChangeAction({
  changeId,
  changeNum,
  changeType = 'replacement',
  originalText = '',
  newText = '',
  decision = 'pending', // 'accepted' | 'rejected' | 'pending'
  onDecision,
  pane = 'unified', // 'left' | 'right' | 'unified'
  isHovered: externalHovered,
  children
}) {
  const [internalHovered, setInternalHovered] = useState(false);
  const isHovered = externalHovered !== undefined ? externalHovered : internalHovered;

  const isAccepted = decision === 'accepted';
  const isRejected = decision === 'rejected';
  const isPending = decision === 'pending';

  return (
    <span
      id={`diff-change-${changeId}`}
      onMouseEnter={() => setInternalHovered(true)}
      onMouseLeave={() => setInternalHovered(false)}
      className="relative inline-block group/change"
    >
      {/* Floating Action Pill on Hover or when Decided */}
      <span
        className={`absolute -top-7 left-0 z-30 transition-all duration-200 pointer-events-auto ${
          isHovered || !isPending
            ? 'opacity-100 translate-y-0 visible scale-100'
            : 'opacity-0 translate-y-1 invisible scale-95 pointer-events-none'
        }`}
      >
        <span className="flex items-center space-x-1 px-2.5 py-0.5 rounded-full shadow-lg bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-md text-white text-[10px] font-sans font-bold border border-slate-700/80 dark:border-slate-600/80 whitespace-nowrap select-none">
          <span className="opacity-75 font-mono text-[9px] text-[#FF5E1E] mr-0.5">#{changeNum}</span>

          {isPending ? (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDecision(changeId, 'accepted');
                }}
                className="flex items-center space-x-0.5 px-2 py-0.5 rounded-full hover:bg-emerald-600 text-emerald-400 hover:text-white transition active:scale-95"
                title="Accept revision (adopt Doc B)"
              >
                <Check className="w-2.5 h-2.5 stroke-[2.5]" />
                <span>Accept</span>
              </button>
              <span className="text-slate-600 text-[10px]">|</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDecision(changeId, 'rejected');
                }}
                className="flex items-center space-x-0.5 px-2 py-0.5 rounded-full hover:bg-rose-600 text-rose-400 hover:text-white transition active:scale-95"
                title="Reject revision (keep Doc A)"
              >
                <X className="w-2.5 h-2.5 stroke-[2.5]" />
                <span>Reject</span>
              </button>
            </>
          ) : isAccepted ? (
            <span className="flex items-center space-x-1 text-emerald-400">
              <Check className="w-2.5 h-2.5 stroke-[2.5]" />
              <span>Accepted (Doc B)</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDecision(changeId, 'pending');
                }}
                className="ml-1 p-0.5 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white transition"
                title="Reset decision to pending"
              >
                <RotateCcw className="w-2.5 h-2.5" />
              </button>
            </span>
          ) : (
            <span className="flex items-center space-x-1 text-rose-400">
              <X className="w-2.5 h-2.5 stroke-[2.5]" />
              <span>Rejected (Doc A kept)</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDecision(changeId, 'pending');
                }}
                className="ml-1 p-0.5 rounded-full hover:bg-slate-700 text-slate-400 hover:text-white transition"
                title="Reset decision to pending"
              >
                <RotateCcw className="w-2.5 h-2.5" />
              </button>
            </span>
          )}
        </span>
      </span>

      {/* The Actual Token Content with In-Line Visual Status */}
      {children}
    </span>
  );
}
