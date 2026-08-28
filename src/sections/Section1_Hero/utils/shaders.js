/**
 * Particle shaders — fine grain, accurate color, true 3D radial wave,
 * depth-based sizing/atmosphere, circular soft-dot masking.
 */

export const instancedVertexShader = /* glsl */ `
  attribute vec2 aTargetXY;
  attribute float aZ;
  attribute vec3 aJitter;
  attribute vec2 aUV;
  attribute float aRadial;

  uniform float uFinalCameraZ;
  uniform float uProgress;
  uniform float uCols;
  uniform float uRows;
  uniform float uPlaneW;
  uniform float uPlaneH;

  varying vec2 vUv;
  varying vec2 vLocalUv;
  varying float vDepth;
  varying vec3 vWorldPos;
  varying float vDepthFade;

  void main() {
    vLocalUv = uv;
    vDepth = aZ;

    // 1. SETTLE — smooth ease-out (0.0 → 0.15)
    float settle = smoothstep(0.0, 0.15, uProgress);

    // 2. PERSPECTIVE UN-PROJECTION
    float s = (uFinalCameraZ - aZ) / uFinalCameraZ;
    vec3 finalPos = vec3(aTargetXY.x * s, aTargetXY.y * s, aZ);
    vec3 currentPos = mix(finalPos + aJitter, finalPos, settle);

    // 3. QUAD SCALING — tight tiles with slight overlap
    float quadW = (uPlaneW / uCols) * s * 1.04;
    float quadH = (uPlaneH / uRows) * s * 1.04;

    vec3 scaledPos = position * vec3(quadW, quadH, 1.0);
    vec3 worldPos = scaledPos + currentPos;

    vWorldPos = currentPos;

    // 4. UV MAPPING
    vUv = aUV + (uv - 0.5) * vec2(1.0 / uCols, 1.0 / uRows);

    // 5. DEPTH-BASED ATMOSPHERIC FADE
    // Particles farther from camera are hazier/softer (fog effect)
    float camDist = uFinalCameraZ - aZ;
    float normalizedDist = clamp(camDist / uFinalCameraZ, 0.0, 1.0);
    vDepthFade = mix(1.0, 0.55, normalizedDist * normalizedDist);

    vec4 mvPosition = modelViewMatrix * vec4(worldPos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const instancedFragmentShader = /* glsl */ `
  precision highp float;

  uniform sampler2D uImage;
  uniform float uProgress;

  varying vec2 vUv;
  varying vec2 vLocalUv;
  varying float vDepth;
  varying vec3 vWorldPos;
  varying float vDepthFade;

  void main() {
    // ── CIRCULAR SOFT PARTICLE MASK ──
    // Tight Gaussian-like falloff — reads as fine grain, not squares
    vec2 d = vLocalUv - 0.5;
    float r = length(d) * 2.0;
    float circle = exp(-r * r * 6.0);
    circle = smoothstep(0.02, 0.6, circle);

    // ── ACCURATE IMAGE COLOR ──
    vec3 texColor = texture2D(uImage, vUv).rgb;

    // ── TRUE 3D RADIAL COLOR WAVE ──
    float dist3D = length(vWorldPos);
    float maxDist = 120.0;
    float normDist = dist3D / maxDist;

    float waveFront = smoothstep(0.03, 0.92, uProgress) * 1.35;
    float falloff = 0.4;
    float waveHit = smoothstep(waveFront - falloff, waveFront, normDist);
    float wp = (1.0 - waveHit) * smoothstep(0.0, 0.12, uProgress);

    // ── COLOR STAGES — accurate photographic color throughout ──
    // Dark base: image color at very low brightness (not tinted)
    vec3 dark = texColor * 0.035 + vec3(0.005, 0.005, 0.01);

    // Dim: slightly brighter, still desaturated, true-to-image luminance
    float luma = dot(texColor, vec3(0.299, 0.587, 0.114));
    vec3 dim = mix(dark, vec3(luma * 0.25), 0.5);

    // Lit: desaturated warm version of real image color
    vec3 lit = mix(dim, texColor * 0.7, 0.6);

    // Full: pure image color — zero tinting, zero color shift
    vec3 full = texColor;

    float s1 = smoothstep(0.0, 0.35, wp);
    float s2 = smoothstep(0.25, 0.65, wp);
    float s3 = smoothstep(0.55, 1.0, wp);

    vec3 color = mix(dark, dim, s1);
    color = mix(color, lit, s2);
    color = mix(color, full, s3);

    // ── DEPTH-BASED ATMOSPHERE ──
    // Far particles: hazier, lower contrast, slightly desaturated
    float depthAtmos = vDepthFade;
    vec3 atmosColor = mix(vec3(luma) * 0.3, color, depthAtmos);
    color = mix(atmosColor, color, smoothstep(0.3, 0.9, wp));

    // ── FINAL ALPHA ──
    float baseAlpha = smoothstep(0.0, 0.06, uProgress) * vDepthFade;
    float alpha = circle * baseAlpha;

    gl_FragColor = vec4(color * alpha, alpha);
  }
`;
