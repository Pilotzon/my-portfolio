import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { heroConfig } from '../constants/heroConfig.js';
import { useUnifiedTimeline } from '../hooks/useUnifiedTimeline.js';
import particleVertexShader from './shaders/particle.vert.glsl?raw';
import particleFragmentShader from './shaders/particle.frag.glsl?raw';

function makeParticleGeometry(data) {
  const geometry = new THREE.PlaneGeometry(1, 1, 1, 1);
  geometry.setAttribute('aBasePosition', new THREE.InstancedBufferAttribute(data.basePosition, 3));
  geometry.setAttribute('aTargetPosition', new THREE.InstancedBufferAttribute(data.targetPosition, 3));
  geometry.setAttribute('aParticleColor', new THREE.InstancedBufferAttribute(data.color, 3));
  geometry.setAttribute('aParticleUv', new THREE.InstancedBufferAttribute(data.uv, 2));
  geometry.setAttribute('aRotationAxis', new THREE.InstancedBufferAttribute(data.axis, 3));
  geometry.setAttribute('aSeed', new THREE.InstancedBufferAttribute(data.seed, 4));
  geometry.setAttribute('aParticleSize', new THREE.InstancedBufferAttribute(data.size, 1));
  return geometry;
}

function getWaveRadius(planeWidth, planeHeight, depthSpan) {
  return Math.sqrt(
    ((planeWidth * planeWidth) / 4)
      + ((planeHeight * planeHeight) / 4)
      + (depthSpan * depthSpan),
  );
}

export default function ParticleField({ assets, quality }) {
  const meshRef = useRef(null);
  const { progressRef } = useUnifiedTimeline();
  const { particles } = assets;
  const phase = heroConfig.colorWave.phaseBreakpoints;
  const twinkle = heroConfig.particles.twinkle;

  const geometry = useMemo(() => makeParticleGeometry(particles), [particles]);
  const material = useMemo(() => new THREE.ShaderMaterial({
    uniforms: {
      uSourceImage: { value: assets.texture },
      uProgress: { value: 0 },
      uTime: { value: 0 },
      uDepthSpan: { value: particles.depthSpan },
      uFocusDepth: { value: -particles.depthSpan * heroConfig.camera.focusDepthRatio },
      uDepthScaleFalloff: { value: heroConfig.particles.depthScaleFalloff },
      uBackgroundParticleScale: { value: heroConfig.particles.backgroundParticleScale },
      uSettleEnd: { value: heroConfig.particles.settleWindow[1] },
      uWaveMaxRadius: { value: getWaveRadius(assets.planeWidth, assets.planeHeight, particles.depthSpan) * heroConfig.colorWave.maxFrontRatio },
      uWaveFalloff: { value: heroConfig.colorWave.falloffWidth },
      uDarkUntil: { value: phase.darkUntil },
      uPartialUntil: { value: phase.partialUntil },
      uFullBy: { value: phase.fullBy },
      uPartialSaturation: { value: heroConfig.colorWave.partialSaturation },
      uPartialBrightness: { value: heroConfig.colorWave.partialBrightness },
      uDarkColor: { value: new THREE.Color(...heroConfig.colorWave.darkColor) },
      uResolveStart: { value: heroConfig.finalResolution.activeWindow[0] },
      uResolveEnd: { value: heroConfig.finalResolution.activeWindow[1] },
      uParticleFadeStart: { value: heroConfig.finalResolution.particleFadeWindow[0] },
      uParticleFadeEnd: { value: heroConfig.finalResolution.particleFadeWindow[1] },
      uFlareDuty: { value: twinkle.flareDutyCycle },
      uPhaseRandomness: { value: twinkle.phaseRandomness },
      uEdgeFadeRange: { value: new THREE.Vector2(...twinkle.edgeFadeRange) },
    },
    vertexShader: particleVertexShader,
    fragmentShader: particleFragmentShader,
    transparent: true,
    depthTest: true,
    depthWrite: true,
    side: THREE.DoubleSide,
    blending: THREE.NormalBlending,
  }), [assets.planeHeight, assets.planeWidth, assets.texture, particles, phase.darkUntil, phase.fullBy, phase.partialUntil, quality.tier, twinkle]);

  useEffect(() => () => {
    geometry.dispose();
    material.dispose();
  }, [geometry, material]);

  useFrame((state) => {
    material.uniforms.uProgress.value = progressRef.current;
    material.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[geometry, material, particles.count]}
      frustumCulled={false}
      renderOrder={1}
    />
  );
}
