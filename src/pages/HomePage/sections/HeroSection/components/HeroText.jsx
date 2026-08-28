import { useMemo, useRef } from 'react';
import { Text } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { heroConfig } from '../constants/heroConfig.js';
import { useUnifiedTimeline } from '../hooks/useUnifiedTimeline.js';
import { remapProgress, smoothRemap } from '../utils/easing.js';

function characterPhase(index, length) {
  const normalized = length <= 1 ? 0 : index / (length - 1);
  return (Math.sin((normalized * heroConfig.text.phaseFrequency) + heroConfig.text.phaseOffset) * 0.5) + 0.5;
}

export default function HeroText() {
  const { progressRef } = useUnifiedTimeline();
  const textRefs = useRef([]);
  const content = heroConfig.text.content;
  const characters = useMemo(() => [...content], [content]);
  const window = heroConfig.text.activeWindow;
  const rotationRange = heroConfig.text.perCharacterRotationRange;

  useFrame(() => {
    const active = remapProgress(progressRef.current, window);
    const arrival = smoothRemap(progressRef.current, window);

    textRefs.current.forEach((textMesh, index) => {
      if (!textMesh) return;
      const phase = characterPhase(index, characters.length);
      const centeredIndex = index - ((characters.length - 1) / 2);
      const asynchronousOffset = (phase - 0.5) * heroConfig.text.asynchronousOffset * arrival;
      const localProgress = THREE.MathUtils.clamp(arrival + asynchronousOffset, 0, 1);
      const angle = THREE.MathUtils.degToRad(heroConfig.text.entryArcDegrees)
        + (localProgress * THREE.MathUtils.degToRad(heroConfig.text.entryTravelDegrees));
      const radius = heroConfig.text.circularPathRadius;
      const finalX = centeredIndex * heroConfig.text.characterSpacing;
      const arcX = Math.cos(angle) * radius;
      const arcY = Math.sin(angle) * heroConfig.text.pathHeight;

      // Each glyph enters from the left on its own arc before resolving on one plane.
      textMesh.position.x = THREE.MathUtils.lerp(finalX - radius, finalX, localProgress)
        + (arcX * (1 - localProgress) * heroConfig.text.entryLateralOffset);
      textMesh.position.y = arcY * (1 - localProgress);
      textMesh.position.z = heroConfig.text.entryDepthOffset * Math.sin(angle) * (1 - localProgress);
      textMesh.rotation.x = (1 - localProgress)
        * THREE.MathUtils.degToRad(heroConfig.text.verticalTumbleDegrees)
        * (phase - 0.5);
      textMesh.rotation.y = (1 - localProgress) * Math.PI;
      textMesh.rotation.z = (1 - localProgress) * THREE.MathUtils.degToRad(
        THREE.MathUtils.lerp(rotationRange[0], rotationRange[1], phase),
      );
      if (textMesh.material) {
        textMesh.material.transparent = true;
        textMesh.material.opacity = heroConfig.text.finalOpacity * THREE.MathUtils.clamp(
          active * (1 + (phase * heroConfig.text.phaseOpacityLead)),
          0,
          1,
        );
        textMesh.material.depthTest = false;
        textMesh.material.depthWrite = false;
        textMesh.material.needsUpdate = true;
      }
    });
  });

  return (
    <group position={[0, -0.2, 0.4]} renderOrder={10}>
      {characters.map((character, index) => (
        <Text
          key={`${character}-${index}`}
          ref={(node) => {
            textRefs.current[index] = node;
          }}
          font={heroConfig.text.fontFamily}
          fontSize={heroConfig.text.fontSize}
          fontWeight={heroConfig.text.fontWeight}
          color={heroConfig.text.color}
          anchorX="center"
          anchorY="middle"
          characters={content}
          sdfGlyphSize={heroConfig.text.sdfGlyphSize}
          frustumCulled={false}
        >
          {character}
        </Text>
      ))}
    </group>
  );
}
