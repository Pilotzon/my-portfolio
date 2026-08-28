/**
 * Post-processing: Bloom, Vignette, Film Grain.
 * Subtle — enhances mood without washing out image color accuracy.
 */
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    uIntensity: { value: 0.4 },
    uSmoothness: { value: 0.45 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    precision highp float;
    uniform sampler2D tDiffuse;
    uniform float uIntensity;
    uniform float uSmoothness;
    varying vec2 vUv;
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      vec2 center = vUv - 0.5;
      float dist = length(center) * 1.4142;
      float v = smoothstep(0.35, 0.35 + uSmoothness, dist);
      color.rgb *= 1.0 - v * uIntensity;
      gl_FragColor = color;
    }
  `,
};

const GrainShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uIntensity: { value: 0.06 },
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    precision highp float;
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uIntensity;
    varying vec2 vUv;
    float rand(vec2 co) {
      return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
    }
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      float noise = rand(vUv + fract(uTime)) * 2.0 - 1.0;
      color.rgb += noise * uIntensity;
      gl_FragColor = color;
    }
  `,
};

export function createPostProcessing(renderer, scene, camera) {
  const size = renderer.getSize(new THREE.Vector2());
  const composer = new EffectComposer(renderer);

  composer.addPass(new RenderPass(scene, camera));

  // Bloom — very subtle, only catches bright highlights
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(size.x, size.y),
    0.25,  // low strength — don't wash out colors
    0.6,   // medium radius
    0.4    // high threshold — only brightest particles glow
  );
  composer.addPass(bloomPass);

  const vignettePass = new ShaderPass(VignetteShader);
  composer.addPass(vignettePass);

  const grainPass = new ShaderPass(GrainShader);
  composer.addPass(grainPass);

  return {
    composer,
    setSize(w, h) { composer.setSize(w, h); },
    update(progress, time) {
      // Bloom tapers as image resolves
      bloomPass.strength = 0.15 + (1.0 - progress) * 0.2;
      // Vignette constant
      vignettePass.uniforms.uIntensity.value = 0.35;
      // Grain fades as image resolves
      grainPass.uniforms.uTime.value = time;
      grainPass.uniforms.uIntensity.value = (1.0 - progress) * 0.05;
    },
    render() { composer.render(); },
    dispose() { composer.dispose(); },
  };
}
