import { heroConfig } from '../constants/heroConfig.js';

function cubicBezierCoordinate(t, p1, p2) {
  const inverse = 1 - t;
  return (3 * inverse * inverse * t * p1) + (3 * inverse * t * t * p2) + (t * t * t);
}

function solveBezierX(x, p1x, p2x) {
  let guess = x;

  for (let iteration = 0; iteration < 7; iteration += 1) {
    const current = cubicBezierCoordinate(guess, p1x, p2x) - x;
    const slope = (3 * (1 - guess) * (1 - guess) * p1x)
      + (6 * (1 - guess) * guess * (p2x - p1x))
      + (3 * guess * guess * (1 - p2x));

    if (Math.abs(slope) < 0.0001) break;
    guess -= current / slope;
  }

  return Math.min(1, Math.max(0, guess));
}

/**
 * A weighted cubic-bezier with a patient opening and a long, soft arrival.
 * This is intentionally the only timeline easing used by the hero.
 */
export function customWeightedBezier(progress, controlPoints = heroConfig.timeline.bezier) {
  const [p1x, p1y, p2x, p2y] = controlPoints;
  const input = Math.min(1, Math.max(0, progress));
  const curveT = solveBezierX(input, p1x, p2x);
  return cubicBezierCoordinate(curveT, p1y, p2y);
}

export function remapProgress(progress, [start, end]) {
  if (end <= start) return progress >= end ? 1 : 0;
  return Math.min(1, Math.max(0, (progress - start) / (end - start)));
}

export function smoothRemap(progress, window) {
  const value = remapProgress(progress, window);
  return value * value * (3 - (2 * value));
}

export function lerpNumber(start, end, amount) {
  return start + ((end - start) * amount);
}
