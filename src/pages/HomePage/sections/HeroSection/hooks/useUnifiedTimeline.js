import { createContext, createElement, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { heroConfig } from '../constants/heroConfig.js';
import { customWeightedBezier, remapProgress, smoothRemap } from '../utils/easing.js';

const TimelineContext = createContext(null);

export function UnifiedTimelineProvider({ children, ready = false }) {
  const progressRef = useRef(0);
  const rawProgressRef = useRef(0);
  const elapsedRef = useRef(0);
  const frameRef = useRef(null);
  const lastFrameRef = useRef(0);
  const pausedRef = useRef(false);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!ready) return undefined;

    let active = true;
    lastFrameRef.current = performance.now();
    elapsedRef.current = 0;
    rawProgressRef.current = 0;
    progressRef.current = 0;
    setIsComplete(false);

    const tick = (now) => {
      if (!active) return;
      const delta = Math.min(heroConfig.timeline.totalDurationMs / 12, now - lastFrameRef.current);
      lastFrameRef.current = now;

      if (!pausedRef.current) {
        elapsedRef.current = Math.min(heroConfig.timeline.totalDurationMs, elapsedRef.current + delta);
        const raw = elapsedRef.current / heroConfig.timeline.totalDurationMs;
        rawProgressRef.current = raw;
        progressRef.current = customWeightedBezier(raw);
        if (raw >= 1) setIsComplete(true);
      }

      frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);

    const handleVisibility = () => {
      pausedRef.current = document.visibilityState === 'hidden';
      lastFrameRef.current = performance.now();
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      active = false;
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [ready]);

  const value = useMemo(() => ({
    progressRef,
    rawProgressRef,
    isComplete,
    start: () => {
      elapsedRef.current = 0;
      rawProgressRef.current = 0;
      progressRef.current = 0;
      pausedRef.current = false;
    },
    pause: () => {
      pausedRef.current = true;
    },
    resume: () => {
      pausedRef.current = false;
      lastFrameRef.current = performance.now();
    },
    remap: (window) => remapProgress(progressRef.current, window),
    smoothRemap: (window) => smoothRemap(progressRef.current, window),
  }), [isComplete]);

  return createElement(TimelineContext.Provider, { value }, children);
}

export function useUnifiedTimeline() {
  const timeline = useContext(TimelineContext);
  if (!timeline) throw new Error('useUnifiedTimeline must be used inside UnifiedTimelineProvider');
  return timeline;
}
