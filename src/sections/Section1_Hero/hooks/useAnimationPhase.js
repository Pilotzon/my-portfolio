import { useState, useEffect, useRef, useCallback } from 'react';

const PHASES = {
    LOADING: 0,
    MASK_REVEAL: 1,
    PARTICLES_BURST: 2,
    TEXT_SETTLE: 3,
    FINAL: 4,
};

// Loader is separate; these run once loaderDone mounts the scene
const PHASE_DURATIONS = {
    [PHASES.LOADING]: 0,          // skipped if scene mounts post-loader
    [PHASES.MASK_REVEAL]: 1800,   // feathered circle opens
    [PHASES.PARTICLES_BURST]: 3200, // camera pull-back + color wake + text in
    [PHASES.TEXT_SETTLE]: 2200,   // cloud settles into final image
    [PHASES.FINAL]: Infinity,
};

export default function useAnimationPhase() {
    const [phase, setPhase] = useState(PHASES.MASK_REVEAL); // start at reveal
    const [phaseProgress, setPhaseProgress] = useState(0);
    const startRef = useRef(Date.now());
    const phaseRef = useRef(PHASES.MASK_REVEAL);
    const rafRef = useRef(null);

    const tick = useCallback(() => {
        const now = Date.now();
        const current = phaseRef.current;
        const duration = PHASE_DURATIONS[current];

        if (duration === Infinity) {
            setPhaseProgress(1);
            rafRef.current = requestAnimationFrame(tick);
            return;
        }

        const progress = Math.min((now - startRef.current) / duration, 1);
        setPhaseProgress(progress);

        if (progress >= 1 && current < PHASES.FINAL) {
            startRef.current = now;
            phaseRef.current = current + 1;
            setPhase(current + 1);
        }

        rafRef.current = requestAnimationFrame(tick);
    }, []);

    useEffect(() => {
        startRef.current = Date.now();
        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
    }, [tick]);

    return { phase, phaseProgress, PHASES };
}