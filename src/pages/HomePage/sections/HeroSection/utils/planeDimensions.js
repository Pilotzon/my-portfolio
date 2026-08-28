export function getPlaneDimensions(imageWidth, imageHeight, planeWidth) {
  const imageAspect = imageWidth / Math.max(1, imageHeight);
  return {
    width: planeWidth,
    height: planeWidth / imageAspect,
    aspect: imageAspect,
  };
}
