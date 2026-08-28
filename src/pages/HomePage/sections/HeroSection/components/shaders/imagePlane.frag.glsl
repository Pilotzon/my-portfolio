precision highp float;

uniform sampler2D uSourceImage;
uniform float uProgress;
uniform float uPlaneWidth;
uniform float uPlaneHeight;
uniform float uImagePlaneZ;
uniform float uWaveMaxRadius;
uniform float uWaveFalloff;
uniform float uDarkUntil;
uniform float uPartialUntil;
uniform float uFullBy;
uniform float uPartialSaturation;
uniform float uPartialBrightness;
uniform vec3 uDarkColor;
uniform vec3 uPaletteColor;
uniform float uPaletteWashStrength;
uniform float uFinalRevealFeather;

varying vec2 vPlaneUv;
varying vec3 vPlaneWorldPosition;

float waveSpatialReveal(float distanceFromOrigin) {
  float phaseLength = max(0.001, uFullBy - uDarkUntil);
  float frontProgress = clamp((uProgress - uDarkUntil) / phaseLength, 0.0, 1.0);
  float waveFront = frontProgress * uWaveMaxRadius;
  return 1.0 - smoothstep(waveFront - uWaveFalloff, waveFront, distanceFromOrigin);
}

void main() {
  // The source canvas is uploaded without a Y flip. Plane UVs run bottom to top,
  // so this mapping keeps the image plane and particle samples pixel-identical.
  vec2 sourceUv = vec2(vPlaneUv.x, 1.0 - vPlaneUv.y);
  vec3 sampledColor = texture2D(uSourceImage, sourceUv).rgb;
  float luminance = dot(sampledColor, vec3(0.2126, 0.7152, 0.0722));
  vec3 partialColor = mix(vec3(luminance), sampledColor, uPartialSaturation) * uPartialBrightness;
  vec3 waveColor = mix(uDarkColor, partialColor, waveSpatialReveal(length(vPlaneWorldPosition - vec3(0.0))) * smoothstep(uDarkUntil, uPartialUntil, uProgress));
  waveColor = mix(waveColor, sampledColor, waveSpatialReveal(length(vPlaneWorldPosition - vec3(0.0))) * smoothstep(uPartialUntil, uFullBy, uProgress));

  float paletteProgress = smoothstep(uDarkUntil, uFullBy, uProgress);
  waveColor = mix(waveColor, mix(waveColor, uPaletteColor, uPaletteWashStrength), paletteProgress * 0.32);
  float finalResolution = smoothstep(uFullBy - uFinalRevealFeather, uFullBy, uProgress);
  gl_FragColor = vec4(mix(waveColor, sampledColor, finalResolution), 1.0);
}
