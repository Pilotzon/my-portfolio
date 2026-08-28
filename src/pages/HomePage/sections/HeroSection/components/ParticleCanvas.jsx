import { useEffect, useMemo, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { heroConfig } from '../constants/heroConfig.js';
import { useUnifiedTimeline } from '../hooks/useUnifiedTimeline.js';
import useCameraPath from '../hooks/useCameraPath.js';
import { smoothRemap } from '../utils/easing.js';
import ImagePlane from './ImagePlane.jsx';
import ParticleField from './ParticleField.jsx';
import HeroText from './HeroText.jsx';
import PostFX from './PostFX.jsx';

function Scene({ assets, quality }) {
  const { camera, scene } = useThree();
  const { progressRef } = useUnifiedTimeline();
  const cameraPath = useCameraPath(assets.planeWidth);
  const background = useRef(new THREE.Color(heroConfig.scene.backgroundColor));
  const darkColor = useMemo(() => new THREE.Color(heroConfig.scene.backgroundColor), []);
  const palette = useMemo(() => new THREE.Color(...assets.palette.primary), [assets.palette.primary]);

  useFrame(() => {
    const progress = progressRef.current;
    cameraPath.update(camera, progress);
    const washProgress = smoothRemap(progress, heroConfig.colorWave.paletteWashWindow) * heroConfig.colorWave.paletteWashStrength;
    background.current.copy(darkColor).lerp(palette, washProgress);
    scene.background = background.current;
  });

  return (
    <>
      <ImagePlane assets={assets} />
      <ParticleField assets={assets} quality={quality} />
      <HeroText />
      <PostFX quality={quality} />
    </>
  );
}

function WebGLLifecycle({ onContextStatus }) {
  const { gl } = useThree();
  const { pause, resume } = useUnifiedTimeline();

  useEffect(() => {
    const canvas = gl.domElement;
    const handleLost = (event) => {
      event.preventDefault();
      pause();
      onContextStatus?.('lost');
    };
    const handleRestored = () => {
      resume();
      onContextStatus?.('restored');
    };

    canvas.addEventListener('webglcontextlost', handleLost, false);
    canvas.addEventListener('webglcontextrestored', handleRestored, false);
    return () => {
      canvas.removeEventListener('webglcontextlost', handleLost, false);
      canvas.removeEventListener('webglcontextrestored', handleRestored, false);
    };
  }, [gl, onContextStatus, pause, resume]);

  return null;
}

export default function ParticleCanvas({ assets, quality, onContextStatus }) {
  const cameraPathDistance = assets.planeWidth * heroConfig.camera.initialDistanceFactor;
  const depthSpan = assets.particles.depthSpan;

  return (
    <Canvas
      className="hero-canvas"
      dpr={quality.dpr}
      camera={{
        position: [0, 0, cameraPathDistance],
        fov: heroConfig.camera.startFov,
        near: heroConfig.scene.cameraNear,
        far: cameraPathDistance + depthSpan + heroConfig.scene.cameraFarPadding,
      }}
      gl={{
        antialias: quality.tier !== 'low',
        alpha: false,
        powerPreference: 'high-performance',
      }}
      onCreated={({ gl }) => {
        gl.outputColorSpace = THREE.SRGBColorSpace;
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1;
      }}
    >
      <WebGLLifecycle onContextStatus={onContextStatus} />
      <Scene assets={assets} quality={quality} />
    </Canvas>
  );
}
