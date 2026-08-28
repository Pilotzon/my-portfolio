import { useMemo } from 'react';
import * as THREE from 'three';
import { heroConfig } from '../constants/heroConfig.js';
import { lerpNumber } from '../utils/easing.js';

export default function useCameraPath(planeWidth) {
  return useMemo(() => {
    const startDistance = planeWidth * heroConfig.camera.initialDistanceFactor;
    const orbitArc = THREE.MathUtils.degToRad(heroConfig.camera.orbitArcDegrees);
    const target = new THREE.Vector3(0, 0, heroConfig.scene.imagePlaneZ);
    const position = new THREE.Vector3();

    return {
      startDistance,
      farDistance: (planeWidth * heroConfig.particles.depthScaleMultiplier) + heroConfig.scene.cameraFarPadding,
      update(camera, progress) {
        const distance = startDistance - (heroConfig.camera.dollyDistance * progress);
        const angle = orbitArc * progress;
        const vertical = Math.sin(angle * heroConfig.camera.verticalOrbitPhaseRatio)
          * distance
          * heroConfig.camera.verticalOrbitRatio;

        position.set(
          Math.sin(angle) * distance,
          vertical,
          heroConfig.scene.imagePlaneZ + (Math.cos(angle) * distance),
        );
        camera.position.copy(position);
        camera.fov = lerpNumber(heroConfig.camera.startFov, heroConfig.camera.endFov, progress);
        camera.lookAt(target);
        camera.updateProjectionMatrix();
      },
    };
  }, [planeWidth]);
}
