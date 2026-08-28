function pixelIndex(x, y, width) {
  return (y * width) + x;
}

export function luminanceFromImageData(imageData) {
  const { data } = imageData;
  const luminance = new Float32Array(data.length / 4);

  for (let index = 0, pixel = 0; index < data.length; index += 4, pixel += 1) {
    luminance[pixel] = (0.2126 * data[index]) + (0.7152 * data[index + 1]) + (0.0722 * data[index + 2]);
  }

  return luminance;
}

export function sobelMagnitude(luminance, width, height) {
  const edge = new Float32Array(luminance.length);
  let maximum = 0;

  for (let y = 1; y < height - 1; y += 1) {
    for (let x = 1; x < width - 1; x += 1) {
      const topLeft = luminance[pixelIndex(x - 1, y - 1, width)];
      const top = luminance[pixelIndex(x, y - 1, width)];
      const topRight = luminance[pixelIndex(x + 1, y - 1, width)];
      const left = luminance[pixelIndex(x - 1, y, width)];
      const right = luminance[pixelIndex(x + 1, y, width)];
      const bottomLeft = luminance[pixelIndex(x - 1, y + 1, width)];
      const bottom = luminance[pixelIndex(x, y + 1, width)];
      const bottomRight = luminance[pixelIndex(x + 1, y + 1, width)];

      const horizontal = -topLeft + topRight - (2 * left) + (2 * right) - bottomLeft + bottomRight;
      const vertical = -topLeft - (2 * top) - topRight + bottomLeft + (2 * bottom) + bottomRight;
      const magnitude = Math.sqrt((horizontal * horizontal) + (vertical * vertical));
      const index = pixelIndex(x, y, width);
      edge[index] = magnitude;
      maximum = Math.max(maximum, magnitude);
    }
  }

  if (maximum === 0) return edge;
  for (let index = 0; index < edge.length; index += 1) edge[index] /= maximum;
  return edge;
}

export function localVariance(luminance, width, height, radius = 2) {
  const variance = new Float32Array(luminance.length);
  let maximum = 0;
  const diameter = (radius * 2) + 1;
  const sampleCount = diameter * diameter;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      let squaredSum = 0;

      for (let offsetY = -radius; offsetY <= radius; offsetY += 1) {
        const sampleY = Math.min(height - 1, Math.max(0, y + offsetY));
        for (let offsetX = -radius; offsetX <= radius; offsetX += 1) {
          const sampleX = Math.min(width - 1, Math.max(0, x + offsetX));
          const value = luminance[pixelIndex(sampleX, sampleY, width)];
          sum += value;
          squaredSum += value * value;
        }
      }

      const mean = sum / sampleCount;
      const value = Math.max(0, (squaredSum / sampleCount) - (mean * mean));
      const index = pixelIndex(x, y, width);
      variance[index] = value;
      maximum = Math.max(maximum, value);
    }
  }

  if (maximum === 0) return variance;
  for (let index = 0; index < variance.length; index += 1) variance[index] = Math.sqrt(variance[index] / maximum);
  return variance;
}

export function buildDetailImportance(edge, variance, options = {}) {
  const edgeWeight = options.edgeWeight ?? 0.72;
  const varianceWeight = options.varianceWeight ?? 0.28;
  const importance = new Float32Array(edge.length);

  for (let index = 0; index < importance.length; index += 1) {
    importance[index] = Math.min(1, Math.max(0, (edge[index] * edgeWeight) + (variance[index] * varianceWeight)));
  }

  return importance;
}
