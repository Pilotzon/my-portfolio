function colorDistance(left, right) {
  const red = left[0] - right[0];
  const green = left[1] - right[1];
  const blue = left[2] - right[2];
  return Math.sqrt((red * red) + (green * green) + (blue * blue));
}

export function extractPalette(imageData, colorCount = 4) {
  const { data } = imageData;
  const buckets = new Map();
  const quantization = 24;

  for (let index = 0; index < data.length; index += 16) {
    const red = Math.floor(data[index] / quantization) * quantization;
    const green = Math.floor(data[index + 1] / quantization) * quantization;
    const blue = Math.floor(data[index + 2] / quantization) * quantization;
    const key = `${red}:${green}:${blue}`;
    const existing = buckets.get(key);

    if (existing) {
      existing.count += 1;
      existing.red += red;
      existing.green += green;
      existing.blue += blue;
    } else {
      buckets.set(key, { count: 1, red, green, blue });
    }
  }

  const candidates = [...buckets.values()]
    .sort((left, right) => right.count - left.count)
    .map((bucket) => [
      bucket.red / bucket.count,
      bucket.green / bucket.count,
      bucket.blue / bucket.count,
    ]);
  const palette = [];

  for (const candidate of candidates) {
    if (palette.every((color) => colorDistance(color, candidate) > 42) || palette.length === 0) {
      palette.push(candidate.map((value) => value / 255));
    }
    if (palette.length === colorCount) break;
  }

  while (palette.length < colorCount) palette.push(palette[palette.length - 1] ?? [0.04, 0.05, 0.07]);

  const weightedAverage = candidates.slice(0, Math.max(1, colorCount)).reduce(
    (average, color, index, selected) => {
      const weight = 1 / selected.length;
      average[0] += color[0] / 255 * weight;
      average[1] += color[1] / 255 * weight;
      average[2] += color[2] / 255 * weight;
      return average;
    },
    [0, 0, 0],
  );

  return {
    colors: palette,
    primary: palette[0],
    secondary: palette[1],
    average: weightedAverage,
  };
}
