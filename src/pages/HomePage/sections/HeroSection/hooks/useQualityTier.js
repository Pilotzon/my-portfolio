import { useEffect, useState } from 'react';
import { heroConfig } from '../constants/heroConfig.js';

function detectTier() {
  if (typeof window === 'undefined') return 'medium';

  const concurrency = navigator.hardwareConcurrency || heroConfig.quality.mediumMaxConcurrency;
  const isMobile = /Android|iPhone|iPad|iPod|Mobi/i.test(navigator.userAgent);

  if (isMobile) return heroConfig.quality.mobileParticleTier;
  if (concurrency <= heroConfig.quality.lowMaxConcurrency) return 'low';
  if (concurrency <= heroConfig.quality.mediumMaxConcurrency) return 'medium';
  return 'high';
}

export function getQualitySettings(tier) {
  const dpr = tier === 'low'
    ? heroConfig.quality.lowDpr
    : tier === 'medium'
      ? heroConfig.quality.mediumDpr
      : heroConfig.quality.highDpr;

  return {
    tier,
    particleCount: heroConfig.particles.countByTier[tier],
    dpr: Math.min(heroConfig.quality.maxDpr, dpr),
    bloom: tier !== 'low',
    grain: tier === 'high',
    depthOfField: tier === 'high',
  };
}

export default function useQualityTier() {
  const [tier, setTier] = useState('medium');

  useEffect(() => {
    setTier(detectTier());
  }, []);

  return getQualitySettings(tier);
}
