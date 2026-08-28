precision highp float;

varying vec2 vPlaneUv;
varying vec3 vPlaneWorldPosition;

void main() {
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vPlaneUv = uv;
  vPlaneWorldPosition = worldPosition.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
