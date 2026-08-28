export const heroConfig = {
  imageSource: '/assets/hero/hero-source.jpg',

  scene: {
    imagePlaneWidth: 14,
    imagePlaneZ: 0,
    analysisMaxDimension: 256,
    cameraNear: 0.1,
    cameraFarPadding: 24,
    backgroundColor: '#050608',
    cameraTargetDepthRatio: 0,
  },

  timeline: {
    totalDurationMs: 5500,
    easing: 'customWeightedBezier',
    // One deliberately weighted curve carries the entire camera, wave, type, and FX motion.
    bezier: [0.12, 0.02, 0.18, 1],
    autoStart: true,
  },

  camera: {
    orbitArcDegrees: 35,
    dollyDistance: 4.5,
    initialDistanceFactor: 1,
    startFov: 50,
    endFov: 42,
    verticalOrbitRatio: 0.055,
    verticalOrbitPhaseRatio: 0.82,
    focusDepthRatio: 0.1,
  },

  particles: {
    countByTier: { low: 12000, medium: 35000, high: 70000 },
    depthScaleMultiplier: 4.5,
    jitterRadius: 0.08,
    startJitterScale: 0.35,
    detailWeightThreshold: 0.15,
    flatRegionWeight: 0.025,
    detailExponent: 1.35,
    randomSeed: 42026,
    sizeRange: [0.012, 0.034],
    sizeDetailBoost: 0.65,
    depthScaleFalloff: 0.46,
    backgroundParticleScale: 0.68,
    settleWindow: [0, 0.24],
    rotationCycles: 2.35,
    twinkle: {
      rotationSpeedRange: [0.4, 1.2],
      flareDutyCycle: 0.12,
      phaseRandomness: 1,
      edgeFadeRange: [0.035, 0.24],
    },
  },

  imageAnalysis: {
    edgeWeight: 0.72,
    varianceWeight: 0.28,
    depthLuminanceWeight: 0.58,
    depthEdgeWeight: 0.42,
    varianceRadius: 2,
  },

  colorWave: {
    origin: 'center',
    falloffWidth: 1.2,
    phaseBreakpoints: { darkUntil: 0.15, partialUntil: 0.55, fullBy: 0.85 },
    maxFrontRatio: 1,
    darkColor: [0.008, 0.01, 0.014],
    partialSaturation: 0.32,
    partialBrightness: 0.3,
    paletteWashWindow: [0.1, 0.82],
    paletteWashStrength: 0.58,
  },

  text: {
    content: 'Everywhere',
    fontFamily: '/fonts/space-grotesk-latin-wght-normal.woff2',
    fontSize: 1.06,
    fontWeight: 500,
    sdfGlyphSize: 64,
    circularPathRadius: 2.2,
    pathHeight: 0.55,
    characterSpacing: 0.57,
    perCharacterRotationRange: [-25, 25],
    entryArcDegrees: 151,
    entryTravelDegrees: 52,
    entryLateralOffset: 0.18,
    entryDepthOffset: 0.16,
    verticalTumbleDegrees: 8,
    asynchronousOffset: 0.18,
    phaseFrequency: 12.7,
    phaseOffset: 0.42,
    phaseOpacityLead: 0.08,
    activeWindow: [0.15, 0.75],
    finalOpacity: 0.98,
    color: '#f4f0e6',
  },

  finalResolution: {
    activeWindow: [0.7, 1],
    verticalCropPercent: 6,
    particleFadeWindow: [0.83, 1],
    finalRevealFeather: 0.08,
  },

  postProcessing: {
    bloomIntensity: 0.9,
    bloomThreshold: 0.72,
    bloomRadius: 0.72,
    vignetteStrength: 0.35,
    vignetteOffset: 0.24,
    grainOpacity: 0.05,
    dofFocusDistance: 0.012,
    dofFocalLength: 0.035,
    dofBokehScale: 2.2,
  },

  quality: {
    maxDpr: 2,
    lowDpr: 1,
    mediumDpr: 1.5,
    highDpr: 2,
    lowMaxConcurrency: 4,
    mediumMaxConcurrency: 8,
    mobileParticleTier: 'low',
  },
};

export const HERO_TEXT = heroConfig.text.content;
