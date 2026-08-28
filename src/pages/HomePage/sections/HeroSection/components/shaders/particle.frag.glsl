precision highp float;

uniform sampler2D uSourceImage;
uniform float uProgress;
uniform float uTime;
uniform float uDepthSpan;
uniform float uWaveMaxRadius;
uniform float uWaveFalloff;
uniform float uDarkUntil;
uniform float uPartialUntil;
uniform float uFullBy;
uniform float uPartialSaturation;
uniform float uPartialBrightness;
uniform vec3 uDarkColor;
uniform float uResolveStart;
uniform float uResolveEnd;
uniform float uParticleFadeStart;
uniform float uParticleFadeEnd;
uniform float uFlareDuty;
uniform float uPhaseRandomness;
uniform vec2 uEdgeFadeRange;

varying vec3 vParticleColor;
varying vec2 vParticleUv;
varying vec3 vWorldPosition;
varying vec3 vWorldNormal;
varying vec4 vParticleSeed;

float waveSpatialReveal(float distanceFromOrigin) {
  float phaseLength = max(0.001, uFullBy - uDarkUntil);
  float frontProgress = clamp((uProgress - uDarkUntil) / phaseLength, 0.0, 1.0);
  float waveFront = frontProgress * uWaveMaxRadius;
  // The smoothstep is the outward edge of the front; invert it so the revealed
  // interior grows from the origin as the front travels through x, y, and z.
  return 1.0 - smoothstep(waveFront - uWaveFalloff, waveFront, distanceFromOrigin);
}

void main() {
  float distanceFromOrigin = length(vWorldPosition - vec3(0.0));
  float spatialReveal = waveSpatialReveal(distanceFromOrigin);
  float partialPhase = smoothstep(uDarkUntil, uPartialUntil, uProgress);
  float fullPhase = smoothstep(uPartialUntil, uFullBy, uProgress);
  vec3 sampledColor = texture2D(uSourceImage, vParticleUv).rgb;
  float sampledLuminance = dot(sampledColor, vec3(0.2126, 0.7152, 0.0722));
  vec3 desaturatedColor = mix(vec3(sampledLuminance), sampledColor, uPartialSaturation) * uPartialBrightness;
  vec3 waveColor = mix(uDarkColor, desaturatedColor, spatialReveal * partialPhase);
  waveColor = mix(waveColor, sampledColor, spatialReveal * fullPhase);

  float resolvePhase = smoothstep(uResolveStart, uResolveEnd, uProgress);
  vec3 finalColor = mix(waveColor, sampledColor, resolvePhase);
  float faceToCamera = abs(dot(normalize(vWorldNormal), normalize(cameraPosition - vWorldPosition)));
  float edgeFade = smoothstep(uEdgeFadeRange.x, uEdgeFadeRange.y, faceToCamera);
  float flareSignal = 0.5 + (0.5 * sin((uTime * vParticleSeed.y * 2.0) + (vParticleSeed.z * 6.28318530718)));
  float flare = smoothstep(1.0 - uFlareDuty, 1.0, flareSignal);
  float brightness = mix(0.82, 1.16, flare);
  float fadeOut = 1.0 - smoothstep(uParticleFadeStart, uParticleFadeEnd, uProgress);
  float alpha = edgeFade * fadeOut * mix(0.72, 1.0, flare);

  if (alpha < 0.012) discard;
  gl_FragColor = vec4(finalColor * brightness, alpha);
}
