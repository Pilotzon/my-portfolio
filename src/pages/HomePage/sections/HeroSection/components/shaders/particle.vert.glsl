precision highp float;

attribute vec3 aBasePosition;
attribute vec3 aTargetPosition;
attribute vec3 aParticleColor;
attribute vec2 aParticleUv;
attribute vec3 aRotationAxis;
attribute vec4 aSeed;
attribute float aParticleSize;

uniform float uProgress;
uniform float uTime;
uniform float uDepthSpan;
uniform float uFocusDepth;
uniform float uDepthScaleFalloff;
uniform float uBackgroundParticleScale;
uniform float uSettleEnd;
uniform float uRotationCycles;

varying vec3 vParticleColor;
varying vec2 vParticleUv;
varying vec3 vWorldPosition;
varying vec3 vWorldNormal;
varying vec4 vParticleSeed;

mat3 axisRotation(vec3 axis, float angle) {
  float sine = sin(angle);
  float cosine = cos(angle);
  float oneMinusCosine = 1.0 - cosine;
  float x = axis.x;
  float y = axis.y;
  float z = axis.z;

  return mat3(
    cosine + x * x * oneMinusCosine,
    x * y * oneMinusCosine - z * sine,
    x * z * oneMinusCosine + y * sine,
    y * x * oneMinusCosine + z * sine,
    cosine + y * y * oneMinusCosine,
    y * z * oneMinusCosine - x * sine,
    z * x * oneMinusCosine - y * sine,
    z * y * oneMinusCosine + x * sine,
    cosine + z * z * oneMinusCosine
  );
}

void main() {
  float settle = smoothstep(0.0, uSettleEnd, uProgress);
  vec3 center = mix(aBasePosition, aTargetPosition, settle);
  vec3 axis = normalize(aRotationAxis);
  float angle = (uTime * aSeed.y * uRotationCycles) + (aSeed.x * 6.28318530718);
  mat3 rotation = axisRotation(axis, angle);
  float depthAmount = clamp(abs(center.z - uFocusDepth) / max(0.001, uDepthSpan), 0.0, 1.0);
  float depthScale = mix(1.0, uBackgroundParticleScale, depthAmount * uDepthScaleFalloff);
  vec3 localPosition = rotation * (position * aParticleSize * depthScale);
  vec3 localNormal = rotation * vec3(0.0, 0.0, 1.0);
  vec4 worldPosition = modelMatrix * vec4(center + localPosition, 1.0);

  vParticleColor = aParticleColor;
  vParticleUv = aParticleUv;
  vWorldPosition = worldPosition.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * localNormal);
  vParticleSeed = aSeed;
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
