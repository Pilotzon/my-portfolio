function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6D2B79F5;
    let result = Math.imul(state ^ (state >>> 15), 1 | state);
    result ^= result + Math.imul(result ^ (result >>> 7), 61 | result);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

function lowerBound(values, target) {
  let low = 0;
  let high = values.length - 1;

  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (values[middle] < target) low = middle + 1;
    else high = middle;
  }

  return low;
}

function makeDistribution(importance, threshold, flatWeight, exponent) {
  const cdf = new Float32Array(importance.length);
  let total = 0;

  for (let index = 0; index < importance.length; index += 1) {
    const score = importance[index];
    const weight = score < threshold
      ? score * flatWeight
      : Math.pow(score, exponent);
    total += weight;
    cdf[index] = total;
  }

  return { cdf, total };
}

function randomDirection(random) {
  const z = (random() * 2) - 1;
  const angle = random() * Math.PI * 2;
  const radius = Math.sqrt(Math.max(0, 1 - (z * z)));
  return [radius * Math.cos(angle), radius * Math.sin(angle), z];
}

export function createParticleData({
  analysis,
  sourcePixels,
  sourceWidth = analysis.width,
  sourceHeight = analysis.height,
  planeWidth,
  planeHeight,
  depthScaleMultiplier,
  count,
  detailWeightThreshold,
  flatRegionWeight,
  detailExponent,
  jitterRadius,
  startJitterScale,
  sizeRange,
  sizeDetailBoost,
  rotationSpeedRange,
  randomSeed,
}) {
  const { width, height, importance, depth } = analysis;
  const random = createRandom(randomSeed);
  const { cdf, total } = makeDistribution(
    importance,
    detailWeightThreshold,
    flatRegionWeight,
    detailExponent,
  );
  const particleCount = total > 0 ? count : 0;
  const basePosition = new Float32Array(particleCount * 3);
  const targetPosition = new Float32Array(particleCount * 3);
  const color = new Float32Array(particleCount * 3);
  const uv = new Float32Array(particleCount * 2);
  const axis = new Float32Array(particleCount * 3);
  const seed = new Float32Array(particleCount * 4);
  const size = new Float32Array(particleCount);
  const depthSpan = planeWidth * depthScaleMultiplier;
  const pixelWidth = planeWidth / width;
  const pixelHeight = planeHeight / height;

  for (let particle = 0; particle < particleCount; particle += 1) {
    const distributionTarget = random() * (total || 1);
    const pixel = lowerBound(cdf, distributionTarget);
    const pixelX = pixel % width;
    const pixelY = Math.floor(pixel / width);
    const localImportance = importance[pixel];
    const particleU = Math.min(1, Math.max(0, (pixelX + random()) / width));
    const particleV = Math.min(1, Math.max(0, (pixelY + random()) / height));
    const x = (particleU - 0.5) * planeWidth;
    const y = (0.5 - particleV) * planeHeight;
    const z = -depth[pixel] * depthSpan;
    const direction = randomDirection(random);
    const positionIndex = particle * 3;
    const seedIndex = particle * 4;
    const startJitterX = pixelWidth * jitterRadius * startJitterScale * direction[0];
    const startJitterY = pixelHeight * jitterRadius * startJitterScale * direction[1];
    const startJitterZ = depthSpan * jitterRadius * startJitterScale * direction[2];

    targetPosition[positionIndex] = x;
    targetPosition[positionIndex + 1] = y;
    targetPosition[positionIndex + 2] = z;
    basePosition[positionIndex] = x + startJitterX;
    basePosition[positionIndex + 1] = y + startJitterY;
    basePosition[positionIndex + 2] = z + startJitterZ;

    const sourceX = Math.min(sourceWidth - 1, Math.floor(particleU * sourceWidth));
    const sourceY = Math.min(sourceHeight - 1, Math.floor(particleV * sourceHeight));
    const sourceIndex = ((sourceY * sourceWidth) + sourceX) * 4;
    color[positionIndex] = sourcePixels[sourceIndex] / 255;
    color[positionIndex + 1] = sourcePixels[sourceIndex + 1] / 255;
    color[positionIndex + 2] = sourcePixels[sourceIndex + 2] / 255;
    uv[particle * 2] = particleU;
    uv[(particle * 2) + 1] = particleV;

    axis[positionIndex] = direction[0];
    axis[positionIndex + 1] = direction[1];
    axis[positionIndex + 2] = direction[2];
    seed[seedIndex] = random();
    seed[seedIndex + 1] = rotationSpeedRange[0] + (random() * (rotationSpeedRange[1] - rotationSpeedRange[0]));
    seed[seedIndex + 2] = random();
    seed[seedIndex + 3] = random();

    const sizeFactor = 0.68 + (localImportance * sizeDetailBoost) + (random() * 0.22);
    size[particle] = (sizeRange[0] + (random() * (sizeRange[1] - sizeRange[0]))) * sizeFactor;
  }

  return {
    count: particleCount,
    basePosition,
    targetPosition,
    color,
    uv,
    axis,
    seed,
    size,
    depthSpan,
  };
}
