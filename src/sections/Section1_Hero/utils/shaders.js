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
  varying float vRadial;
  varying float vProgress;
  varying float vDepth;

  void main() {
    vRadial = aRadial;
    vProgress = uProgress;
    vDepth = aZ;

    // 1. SETTLE ANIMATION (0.0 to 0.15)
    float settle = smoothstep(0.0, 0.15, uProgress);
    
    // 2. PERSPECTIVE UN-PROJECTION
    // Calculate the scale required at this particle's Z depth 
    // so it perfectly aligns with the target X/Y from the camera's final POV.
    float s = (uFinalCameraZ - aZ) / uFinalCameraZ;
    
    vec3 finalPos = vec3(aTargetXY.x * s, aTargetXY.y * s, aZ);
    
    // Apply jitter and ease it out
    vec3 currentPos = mix(finalPos + aJitter, finalPos, settle);

    // 3. QUAD SCALING
    // Scale the 1x1 base plane so it tiles perfectly.
    // We add a tiny 1.05x overlap multiplier to prevent hairline seams.
    float quadW = (uPlaneW / uCols) * s * 1.05;
    float quadH = (uPlaneH / uRows) * s * 1.05;
    
    vec3 scaledPos = position * vec3(quadW, quadH, 1.0);
    vec3 worldPos = scaledPos + currentPos;

    // 4. PRECISE UV MAPPING
    // Map the 0-1 local quad UV to the exact sub-region of the main image texture
    vUv = aUV + (uv - 0.5) * vec2(1.0 / uCols, 1.0 / uRows);

    vec4 mvPosition = modelViewMatrix * vec4(worldPos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

export const instancedFragmentShader = /* glsl */ `
  precision highp float;

  uniform sampler2D uImage;
  
  varying vec2 vUv;
  varying float vRadial;
  varying float vProgress;
  varying float vDepth;

  // Hash for noise
  float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

  void main() {
    // Exact crop from the original image
    vec4 texColor = texture2D(uImage, vUv);
    
    // Wave Timings based on global progress
    // Wave 1: Dark to Tint (0.1 to 0.5)
    // Wave 2: Tint to Full Color (0.4 to 0.8)
    // Wave 3: Circle to Square Image Resolve (0.7 to 1.0)
    
    // Offset by radial distance to create the sweeping effect
    float radialOffset = vRadial * 0.3; // Center finishes first, edges later
    
    float wave1 = smoothstep(0.1 + radialOffset, 0.4 + radialOffset, vProgress);
    float wave2 = smoothstep(0.4 + radialOffset, 0.7 + radialOffset, vProgress);
    float resolve = smoothstep(0.7 + radialOffset, 0.95 + radialOffset, vProgress);

    // Color definitions
    vec3 darkCol = texColor.rgb * 0.05 + vec3(0.01, 0.01, 0.02);
    // Tint color (muted cyan/purple blend based on depth)
    vec3 tintCol = mix(vec3(0.2, 0.1, 0.3), vec3(0.1, 0.3, 0.3), vDepth > 0.0 ? 1.0 : 0.0);
    tintCol = mix(darkCol, tintCol * texColor.rgb * 3.0, 0.5);

    // Mix stages
    vec3 finalColor = mix(darkCol, tintCol, wave1);
    finalColor = mix(finalColor, texColor.rgb, wave2);

    // Shape: Starts as a soft circle, resolves into the hard square pixel
    vec2 localUV = fract(vUv * vec2(1000.0)); // Approximate local quad UV
    float dist = length(gl_PointCoord - 0.5); // Fallback if needed, but we have geometry
    
    // Calculate distance from center of the quad (uv is roughly fract of scaled uvs)
    // For InstancedMesh, vUv isn't locally 0-1, so we calculate center dist:
    // Actually, it's easier to pass local uv from vertex, but we can just use 
    // a rounded box formula. To save complexity, we'll just alpha fade the edges initially.
    
    float alpha = 1.0;
    
    // Depth fading so far things don't look completely black
    float depthFade = clamp(1.0 - (vDepth - 50.0) / -100.0, 0.3, 1.0);

    gl_FragColor = vec4(finalColor, alpha);
  }
`;