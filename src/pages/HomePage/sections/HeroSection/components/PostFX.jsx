import { useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Bloom, DepthOfField, EffectComposer, Noise, Vignette } from '@react-three/postprocessing';
import { heroConfig } from '../constants/heroConfig.js';
import { useUnifiedTimeline } from '../hooks/useUnifiedTimeline.js';
import { remapProgress } from '../utils/easing.js';

export default function PostFX({ quality }) {
  const { progressRef } = useUnifiedTimeline();
  const bloomRef = useRef(null);
  const vignetteRef = useRef(null);
  const noiseRef = useRef(null);
  const dofRef = useRef(null);
  const fxConfig = heroConfig.postProcessing;

  useFrame(() => {
    const progress = progressRef.current;
    const resolution = remapProgress(progress, heroConfig.finalResolution.activeWindow);
    const earlyPhase = 1 - progress;

    if (bloomRef.current) bloomRef.current.intensity = fxConfig.bloomIntensity * (0.22 + (earlyPhase * 0.78)) * (1 - (resolution * 0.82));
    if (vignetteRef.current) vignetteRef.current.darkness = fxConfig.vignetteStrength * (0.72 + (earlyPhase * 0.28));
    if (noiseRef.current) noiseRef.current.opacity = fxConfig.grainOpacity * (1 - resolution);
    if (dofRef.current) dofRef.current.bokehScale = fxConfig.dofBokehScale * (0.55 + (earlyPhase * 0.45));
  });

  return (
    <EffectComposer
      multisampling={quality.tier === 'high' ? 4 : 0}
      enableNormalPass={quality.depthOfField}
    >
      {quality.bloom && (
        <Bloom
          ref={bloomRef}
          luminanceThreshold={fxConfig.bloomThreshold}
          intensity={fxConfig.bloomIntensity}
          radius={fxConfig.bloomRadius}
          mipmapBlur
        />
      )}
      {quality.depthOfField && (
        <DepthOfField
          ref={dofRef}
          focusDistance={fxConfig.dofFocusDistance}
          focalLength={fxConfig.dofFocalLength}
          bokehScale={fxConfig.dofBokehScale}
        />
      )}
      <Vignette ref={vignetteRef} eskil={false} offset={fxConfig.vignetteOffset} darkness={fxConfig.vignetteStrength} />
      {quality.grain && <Noise ref={noiseRef} opacity={fxConfig.grainOpacity} premultiply />}
    </EffectComposer>
  );
}
