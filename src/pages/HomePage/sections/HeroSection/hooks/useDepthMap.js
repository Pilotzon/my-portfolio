import { useMemo } from 'react';
import { generateDepthMap } from '../utils/depthMapGenerator.js';

export default function useDepthMap(imageData, options) {
  return useMemo(() => {
    if (!imageData) return null;
    return generateDepthMap(imageData, options);
  }, [imageData, options]);
}
