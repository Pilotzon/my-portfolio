import {
  buildDetailImportance,
  localVariance,
  luminanceFromImageData,
  sobelMagnitude,
} from './edgeDetection.js';

export function generateDepthMap(imageData, options = {}) {
  const width = imageData.width;
  const height = imageData.height;
  const luminanceBytes = luminanceFromImageData(imageData);
  const luminance = new Float32Array(luminanceBytes.length);

  for (let index = 0; index < luminanceBytes.length; index += 1) {
    luminance[index] = luminanceBytes[index] / 255;
  }

  const edge = sobelMagnitude(luminance, width, height);
  const variance = localVariance(luminance, width, height, options.varianceRadius ?? 2);
  const importance = buildDetailImportance(edge, variance, options);
  const depth = new Float32Array(luminance.length);
  const luminanceWeight = options.depthLuminanceWeight ?? 0.58;
  const edgeWeight = options.depthEdgeWeight ?? 0.42;

  for (let index = 0; index < depth.length; index += 1) {
    // Luminance gives the broad form; edges keep the subject boundaries from flattening.
    depth[index] = Math.min(1, Math.max(0, (luminance[index] * luminanceWeight) + (edge[index] * edgeWeight)));
  }

  return { width, height, luminance, edge, variance, importance, depth };
}
