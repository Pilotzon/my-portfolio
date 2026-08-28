import { useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { heroConfig } from '../constants/heroConfig.js';
import { useUnifiedTimeline } from '../hooks/useUnifiedTimeline.js';
import imagePlaneVertexShader from './shaders/imagePlane.vert.glsl?raw';
import imagePlaneFragmentShader from './shaders/imagePlane.frag.glsl?raw';

function getWaveRadius(planeWidth, planeHeight, depthSpan) {
  return Math.sqrt(
    ((planeWidth * planeWidth) / 4)
      + ((planeHeight * planeHeight) / 4)
      + (depthSpan * depthSpan),
  );
}

export default function ImagePlane({ assets }) {
  const { progressRef } = useUnifiedTimeline();
  const phase = heroConfig.colorWave.phaseBreakpoints;
  const geometry = useMemo(
    () => new THREE.PlaneGeometry(assets.planeWidth, assets.planeHeight, 1, 1),
    [assets.planeHeight, assets.planeWidth],
  );
  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uSourceImage: { value: assets.texture },
      uProgress: { value: 0 },
      uPlaneWidth: { value: assets.planeWidth },
      uPlaneHeight: { value: assets.planeHeight },
      uImagePlaneZ: { value: heroConfig.scene.imagePlaneZ },
      uWaveMaxRadius: { value: getWaveRadius(assets.planeWidth, assets.planeHeight, assets.particles.depthSpan) * heroConfig.colorWave.maxFrontRatio },
      uWaveFalloff: { value: heroConfig.colorWave.falloffWidth },
      uDarkUntil: { value: phase.darkUntil },
      uPartialUntil: { value: phase.partialUntil },
      uFullBy: { value: phase.fullBy },
      uPartialSaturation: { value: heroConfig.colorWave.partialSaturation },
      uPartialBrightness: { value: heroConfig.colorWave.partialBrightness },
      uDarkColor: { value: new THREE.Color(...heroConfig.colorWave.darkColor) },
      uPaletteColor: { value: new THREE.Color(...assets.palette.primary) },
      uPaletteWashStrength: { value: heroConfig.colorWave.paletteWashStrength },
      uFinalRevealFeather: { value: heroConfig.finalResolution.finalRevealFeather },
    },
    vertexShader: imagePlaneVertexShader,
    fragmentShader: imagePlaneFragmentShader,
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide,
  }), [assets]);

  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  useFrame(() => {
    material.uniforms.uProgress.value = progressRef.current;
  });

  return (
    <mesh geometry={geometry} material={material} position={[0, 0, heroConfig.scene.imagePlaneZ]} renderOrder={0} />
  );
}
