import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, Play, Pause, RotateCcw, Columns, Layers } from 'lucide-react';

/**
 * CurtainSwipeDiff:
 * Interactive visual split slider ("curtain swipe") allowing users to drag a vertical divider
 * across Document A (baseline) and Document B (revision) in the exact same coordinate plane.
 * Includes hands-free auto-wipe animation and quick split presets.
 */
export default function CurtainSwipeDiff({
  tokensDocA = [],
  tokensDocB = [],
  meta = {},
  wrapText = true
}) {
  const [sliderPos, setSliderPos] = useState(50); // percentage 0 - 100
  const [isDragging, setIsDragging] = useState(false);
  const [isAutoWiping, setIsAutoWiping] = useState(false);
  const containerRef = useRef(null);
  const autoWipeRef = useRef({ dir: 1, timer: null });

  // Handle dragging
  const handlePointerMove = useCallback((clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const clampedPct = Math.max(5, Math.min(95, (x / rect.width) * 100));
    setSliderPos(clampedPct);
  }, []);

  const onMouseDown = () => setIsDragging(true);

  useEffect(() => {
    const onMouseUp = () => setIsDragging(false);
    const onMouseMove = (e) => {
      if (isDragging) handlePointerMove(e.clientX);
    };
    const onTouchMove = (e) => {
      if (isDragging && e.touches[0]) handlePointerMove(e.touches[0].clientX);
    };

    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('touchmove', onTouchMove);
      window.addEventListener('touchend', onMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onMouseUp);
    };
  }, [isDragging, handlePointerMove]);

  // Hands-free auto-wipe animation
  useEffect(() => {
    if (isAutoWiping) {
      autoWipeRef.current.timer = setInterval(() => {
        setSliderPos((prev) => {
          let next = prev + autoWipeRef.current.dir * 0.5;
          if (next >= 90) {
            autoWipeRef.current.dir = -1;
            next = 90;
          } else if (next <= 10) {
            autoWipeRef.current.dir = 1;
            next = 10;
          }
          return next;
        });
      }, 25);
    } else {
      if (autoWipeRef.current.timer) clearInterval(autoWipeRef.current.timer);
    }

    return () => {
      if (autoWipeRef.current.timer) clearInterval(autoWipeRef.current.timer);
    };
  }, [isAutoWiping]);

  return (
    <div className="space-y-4 select-none">
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 bg-slate-50/90 dark:bg-slate-900/80 border-b border-slate-100 dark:border-white/[0.06] rounded-t-3xl text-xs font-semibold">
        <div className="flex items-center space-x-3">
          <span className="flex items-center space-x-1.5 text-slate-800 dark:text-slate-200 font-bold">
            <Sparkles className="w-3.5 h-3.5 text-[#FF5E1E]" />
            <span>Curtain Swipe Lens:</span>
          </span>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
            {Math.round(sliderPos)}% Doc A | {Math.round(100 - sliderPos)}% Doc B
          </span>
        </div>

        <div className="flex items-center space-x-2">
          {/* Preset Buttons */}
          <button
            type="button"
            onClick={() => { setIsAutoWiping(false); setSliderPos(25); }}
            className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/[0.08] hover:border-[#FF5E1E] transition text-[11px]"
          >
            25% Split
          </button>
          <button
            type="button"
            onClick={() => { setIsAutoWiping(false); setSliderPos(50); }}
            className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/[0.08] hover:border-[#FF5E1E] transition text-[11px]"
          >
            50% Center
          </button>
          <button
            type="button"
            onClick={() => { setIsAutoWiping(false); setSliderPos(75); }}
            className="px-2.5 py-1 rounded-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/[0.08] hover:border-[#FF5E1E] transition text-[11px]"
          >
            75% Split
          </button>

          {/* Auto-Wipe Toggle */}
          <button
            type="button"
            onClick={() => setIsAutoWiping(!isAutoWiping)}
            className={`flex items-center space-x-1 px-3 py-1 rounded-full text-[11px] font-bold border transition ${
              isAutoWiping
                ? 'bg-[#FF5E1E] text-white border-transparent shadow-xs'
                : 'bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-white/[0.08] hover:border-[#FF5E1E]'
            }`}
            title="Auto-scan back and forth"
          >
            {isAutoWiping ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 fill-current" />}
            <span>{isAutoWiping ? 'Pause Scan' : 'Auto Scan'}</span>
          </button>
        </div>
      </div>

      {/* Interactive Swipe Viewport */}
      <div
        ref={containerRef}
        className="relative w-full h-[580px] overflow-hidden bg-slate-50/40 dark:bg-[#0B0F19] rounded-b-3xl border border-slate-200/80 dark:border-white/[0.08] shadow-inner cursor-ew-resize select-text"
        onMouseDown={onMouseDown}
        onTouchStart={onMouseDown}
      >
        {/* Under Layer: Document B (Right Side / Full Base) */}
        <div className="absolute inset-0 p-8 overflow-y-auto leading-relaxed text-xs sm:text-sm font-mono text-slate-800 dark:text-slate-300">
          <div className="mb-4 pb-2 border-b border-slate-200/60 dark:border-white/[0.06] flex items-center justify-between text-xs font-bold text-emerald-600 dark:text-emerald-400">
            <span>REVISION: {meta?.docB?.filename || 'Document B'}</span>
            <span className="text-[10px] uppercase tracking-wider bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
              Active Layer
            </span>
          </div>
          <div className={wrapText ? 'whitespace-pre-wrap' : 'whitespace-pre'}>
            {tokensDocB.map((t, idx) => (
              <span
                key={idx}
                className={
                  t.type === 'added'
                    ? 'bg-emerald-100/80 dark:bg-emerald-950/70 text-emerald-800 dark:text-emerald-300 font-bold px-1 py-0.5 rounded'
                    : ''
                }
              >
                {t.value}
              </span>
            ))}
          </div>
        </div>

        {/* Over Layer: Document A (Left Side, clipped by sliderPos) */}
        <div
          style={{ clipPath: `polygon(0 0, ${sliderPos}% 0, ${sliderPos}% 100%, 0 100%)` }}
          className="absolute inset-0 p-8 overflow-y-auto leading-relaxed text-xs sm:text-sm font-mono bg-white dark:bg-[#0F172A] border-r border-slate-300 dark:border-slate-700 shadow-2xl text-slate-800 dark:text-slate-300"
        >
          <div className="mb-4 pb-2 border-b border-slate-200/60 dark:border-white/[0.06] flex items-center justify-between text-xs font-bold text-rose-600 dark:text-rose-400">
            <span>BASELINE: {meta?.docA?.filename || 'Document A'}</span>
            <span className="text-[10px] uppercase tracking-wider bg-rose-50 dark:bg-rose-950/40 px-2 py-0.5 rounded-full border border-rose-200 dark:border-rose-800">
              Baseline Layer
            </span>
          </div>
          <div className={wrapText ? 'whitespace-pre-wrap' : 'whitespace-pre'}>
            {tokensDocA.map((t, idx) => (
              <span
                key={idx}
                className={
                  t.type === 'removed'
                    ? 'bg-rose-100/80 dark:bg-rose-950/70 text-rose-800 dark:text-rose-300 line-through decoration-rose-500 px-1 py-0.5 rounded'
                    : ''
                }
              >
                {t.value}
              </span>
            ))}
          </div>
        </div>

        {/* Draggable Divider Handle Line */}
        <div
          style={{ left: `${sliderPos}%` }}
          className="absolute top-0 bottom-0 w-0.5 bg-gradient-to-b from-[#FF5E1E] via-amber-400 to-[#FF5E1E] shadow-[0_0_12px_rgba(255,94,30,0.8)] cursor-ew-resize pointer-events-none z-30"
        >
          {/* Glowing Center Handle Knob */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white dark:bg-slate-900 border-2 border-[#FF5E1E] shadow-xl flex items-center justify-center pointer-events-auto cursor-ew-resize hover:scale-110 active:scale-95 transition-transform">
            <div className="flex items-center space-x-0.5 text-[#FF5E1E]">
              <span className="text-[9px] font-black">◀</span>
              <span className="text-[9px] font-black">▶</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
