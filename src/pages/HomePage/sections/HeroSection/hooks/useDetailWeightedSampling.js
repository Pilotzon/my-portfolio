import { useMemo } from 'react';
import { createParticleData } from '../utils/particlePositionGenerator.js';

export default function useDetailWeightedSampling({ analysis, sourcePixels, options }) {
  return useMemo(() => {
    if (!analysis || !sourcePixels || !options) return null;
    return createParticleData({ analysis, sourcePixels, ...options });
  }, [analysis, sourcePixels, options]);
}
