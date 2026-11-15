import React, { useState } from 'react';
import { soundEffects } from '../utils/audioFeedback';

/**
 * DiffMiniMap:
 * High-precision vertical Change Radar / Mini-Map inspired by modern code editors (VS Code/Linear).
 * Displays discrete visual pips for every change across the entire document length.
 * Hovering shows an instant micro-preview tooltip; clicking glides directly to that change.
 */
export default function DiffMiniMap({
  changeBlocks = [],
  currentChangeIndex = 0,
  decisions = {},
  onJumpToChange
}) {
  const [hoveredChange, setHoveredChange] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ top: 0 });

  if (!changeBlocks || changeBlocks.length === 0) return null;

  const totalChanges = changeBlocks.length;

  const handlePipClick = (idx, change) => {
    soundEffects.playTick();
    if (onJumpToChange) {
      onJumpToChange(idx);
    }
  };

  const handleMouseEnter = (e, change) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setHoveredChange(change);
    setTooltipPos({ top: rect.top });
  };

  return (
    <div className="relative flex flex-col items-center py-4 px-1.5 select-none z-20">
      {/* Radar Rail Background */}
      <div className="relative w-2.5 h-[420px] bg-slate-200/80 dark:bg-slate-800/80 rounded-full flex flex-col justify-between py-1 px-0.5 shadow-inner backdrop-blur-xs">
        
        {/* Change Pips on Rail */}
        {changeBlocks.map((change, idx) => {
          const decision = decisions[change.id] || 'pending';
          const isCurrent = currentChangeIndex === idx;

          let pipColor = 'bg-[#FF5E1E]'; // pending replacement
          if (decision === 'accepted') pipColor = 'bg-emerald-500';
          else if (decision === 'rejected') pipColor = 'bg-slate-400 dark:bg-slate-600 opacity-60';
          else if (change.changeType === 'addition') pipColor = 'bg-emerald-400';
          else if (change.changeType === 'deletion') pipColor = 'bg-rose-500';

          // Position proportionally along rail
          const topPercent = totalChanges > 1 ? (idx / (totalChanges - 1)) * 92 + 4 : 50;

          return (
            <button
              key={change.id}
              type="button"
              onClick={() => handlePipClick(idx, change)}
              onMouseEnter={(e) => handleMouseEnter(e, change)}
              onMouseLeave={() => setHoveredChange(null)}
              style={{ top: `${topPercent}%` }}
              className={`absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-200 cursor-pointer ${
                isCurrent
                  ? 'w-4 h-4 ring-2 ring-[#FF5E1E] ring-offset-2 ring-offset-white dark:ring-offset-slate-900 z-10 scale-125 shadow-md ' + pipColor
                  : 'w-2 h-2 hover:scale-150 hover:w-3 hover:h-3 ' + pipColor
              }`}
              title={`Jump to Change #${idx + 1}`}
            />
          );
        })}
      </div>

      {/* Floating Micro-Preview Tooltip on Pip Hover */}
      {hoveredChange && (
        <div
          style={{ top: tooltipPos.top }}
          className="fixed right-16 z-50 w-64 p-3 bg-white/95 dark:bg-[#0F172A]/95 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-white/[0.1] shadow-xl text-left pointer-events-none animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 dark:border-white/[0.06] mb-2">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              Change #{hoveredChange.changeNum} · {hoveredChange.changeType}
            </span>
            <span
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                decisions[hoveredChange.id] === 'accepted'
                  ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300'
                  : decisions[hoveredChange.id] === 'rejected'
                  ? 'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300'
                  : 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300'
              }`}
            >
              {decisions[hoveredChange.id] || 'pending'}
            </span>
          </div>

          <div className="space-y-1 text-xs font-mono">
            {hoveredChange.originalText && (
              <div className="text-rose-600 dark:text-rose-400 line-through opacity-80 truncate text-[11px]">
                -{hoveredChange.originalText.trim()}
              </div>
            )}
            {hoveredChange.newText && (
              <div className="text-emerald-600 dark:text-emerald-400 font-bold truncate text-[11px]">
                +{hoveredChange.newText.trim()}
              </div>
            )}
          </div>
          <div className="mt-2 pt-1 border-t border-slate-100 dark:border-white/[0.04] text-[9px] text-slate-400 text-center font-sans">
            Click pip to jump directly
          </div>
        </div>
      )}
    </div>
  );
}
