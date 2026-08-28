import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { heroConfig } from '../constants/heroConfig.js';
import { generateDepthMap } from '../utils/depthMapGenerator.js';
import { extractPalette } from '../utils/paletteExtractor.js';
import { createParticleData } from '../utils/particlePositionGenerator.js';

function createFallbackCanvas() {
  const canvas = document.createElement('canvas');
  canvas.width = 1600;
  canvas.height = 1000;
  const context = canvas.getContext('2d');
  const sky = context.createLinearGradient(0, 0, 0, canvas.height);
  sky.addColorStop(0, '#071326');
  sky.addColorStop(0.44, '#163a64');
  sky.addColorStop(0.68, '#b36a44');
  sky.addColorStop(1, '#101b22');
  context.fillStyle = sky;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const glow = context.createRadialGradient(canvas.width * 0.68, canvas.height * 0.56, 0, canvas.width * 0.68, canvas.height * 0.56, canvas.width * 0.28);
  glow.addColorStop(0, 'rgba(255, 211, 126, 0.9)');
  glow.addColorStop(1, 'rgba(255, 157, 80, 0)');
  context.fillStyle = glow;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = '#071116';
  context.beginPath();
  context.moveTo(0, canvas.height * 0.7);
  context.bezierCurveTo(canvas.width * 0.2, canvas.height * 0.54, canvas.width * 0.35, canvas.height * 0.72, canvas.width * 0.55, canvas.height * 0.61);
  context.bezierCurveTo(canvas.width * 0.72, canvas.height * 0.48, canvas.width * 0.84, canvas.height * 0.66, canvas.width, canvas.height * 0.5);
  context.lineTo(canvas.width, canvas.height);
  context.lineTo(0, canvas.height);
  context.closePath();
  context.fill();

  context.fillStyle = 'rgba(237, 189, 111, 0.95)';
  context.fillRect(canvas.width * 0.69, canvas.height * 0.5, canvas.width * 0.022, canvas.height * 0.08);
  return canvas;
}

function loadImageCanvas(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext('2d', { willReadFrequently: true });
      context.drawImage(image, 0, 0);
      resolve(canvas);
    };
    image.onerror = reject;
    image.src = source;
  });
}

function createAnalysisCanvas(sourceCanvas) {
  const maxDimension = heroConfig.scene.analysisMaxDimension;
  const scale = Math.min(1, maxDimension / Math.max(sourceCanvas.width, sourceCanvas.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(2, Math.round(sourceCanvas.width * scale));
  canvas.height = Math.max(2, Math.round(sourceCanvas.height * scale));
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function makeTexture(sourceCanvas) {
  const texture = new THREE.CanvasTexture(sourceCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.flipY = false;
  texture.needsUpdate = true;
  return texture;
}

export default function useImageSampler(source, quality, enabled = true) {
  const [result, setResult] = useState({ status: enabled ? 'loading' : 'disabled', assets: null, error: null });

  useEffect(() => {
    let cancelled = false;
    let createdTexture = null;

    if (!enabled) {
      setResult({ status: 'disabled', assets: null, error: null });
      return undefined;
    }

    setResult({ status: 'loading', assets: null, error: null });

    const load = async () => {
      let sourceCanvas;
      let usedFallback = false;

      try {
        sourceCanvas = await loadImageCanvas(source);
      } catch {
        sourceCanvas = createFallbackCanvas();
        usedFallback = true;
      }

      if (cancelled) return;
      const sourceContext = sourceCanvas.getContext('2d', { willReadFrequently: true });
      const sourcePixels = sourceContext.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
      const analysisCanvas = createAnalysisCanvas(sourceCanvas);
      const analysisContext = analysisCanvas.getContext('2d', { willReadFrequently: true });
      const analysisPixels = analysisContext.getImageData(0, 0, analysisCanvas.width, analysisCanvas.height);
      const depthMap = generateDepthMap(analysisPixels, heroConfig.imageAnalysis);
      const palette = extractPalette(analysisPixels);
      const texture = makeTexture(sourceCanvas);
      createdTexture = texture;
      const planeWidth = heroConfig.scene.imagePlaneWidth;
      const basePlaneHeight = planeWidth / (sourceCanvas.width / sourceCanvas.height);
      // A slightly taller plane gives the settled frame a restrained vertical crop while
      // keeping the particle UVs and their final image fragments in the same space.
      const planeHeight = basePlaneHeight * (1 + (heroConfig.finalResolution.verticalCropPercent / 100));
      const particleData = createParticleData({
        analysis: depthMap,
        sourcePixels: sourcePixels.data,
        sourceWidth: sourceCanvas.width,
        sourceHeight: sourceCanvas.height,
        planeWidth,
        planeHeight,
        depthScaleMultiplier: heroConfig.particles.depthScaleMultiplier,
        count: quality.particleCount,
        detailWeightThreshold: heroConfig.particles.detailWeightThreshold,
        flatRegionWeight: heroConfig.particles.flatRegionWeight,
        detailExponent: heroConfig.particles.detailExponent,
        jitterRadius: heroConfig.particles.jitterRadius,
        startJitterScale: heroConfig.particles.startJitterScale,
        sizeRange: heroConfig.particles.sizeRange,
        sizeDetailBoost: heroConfig.particles.sizeDetailBoost,
        rotationSpeedRange: heroConfig.particles.twinkle.rotationSpeedRange,
        randomSeed: heroConfig.particles.randomSeed,
      });

      const assets = {
        texture,
        sourceCanvas,
        sourceWidth: sourceCanvas.width,
        sourceHeight: sourceCanvas.height,
        planeWidth,
        planeHeight,
        depthMap,
        palette,
        particles: particleData,
        usedFallback,
      };

      if (cancelled) {
        texture.dispose();
        return;
      }

      setResult({ status: 'ready', assets, error: null });
    };

    load().catch((error) => {
      if (!cancelled) setResult({ status: 'error', assets: null, error });
    });

    return () => {
      cancelled = true;
      if (createdTexture) createdTexture.dispose();
    };
  }, [source, quality.particleCount, enabled]);

  return result;
}
