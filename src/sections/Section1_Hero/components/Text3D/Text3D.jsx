import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';

/**
 * Per-character 3D text in the Three.js particle scene.
 * Tries TextGeometry with CDN font first; falls back to canvas-texture
 * planes so text ALWAYS renders regardless of network conditions.
 *
 * Animation: starts rotated 180° (back facing), 0% opacity.
 * Each letter tumbles independently along a rightward arc path.
 * Converges to flat, camera-facing, 100% opacity at end.
 */

const FONT_URL = 'https://cdn.jsdelivr.net/npm/three@0.185.1/examples/fonts/helvetiker_bold.typeface.json';

const Text3D = ({ scene, camera, progress = 0 }) => {
    const groupRef = useRef(null);
    const charsRef = useRef([]);
    const rafRef = useRef(null);
    const progressRef = useRef(progress);

    progressRef.current = progress;

    useEffect(() => {
        if (!scene) return;

        let disposed = false;
        const group = new THREE.Group();
        groupRef.current = group;

        // Try loading font — if it fails or times out, use canvas fallback
        let fontLoaded = false;
        const fontLoader = new FontLoader();

        const fontTimeout = setTimeout(() => {
            if (!fontLoaded && !disposed) {
                console.log('Font load timed out, using canvas fallback');
                buildCanvasText();
            }
        }, 3000);

        fontLoader.load(
            FONT_URL,
            (font) => {
                fontLoaded = true;
                clearTimeout(fontTimeout);
                if (!disposed) buildGeometryText(font);
            },
            undefined,
            () => {
                fontLoaded = true;
                clearTimeout(fontTimeout);
                if (!disposed) buildCanvasText();
            }
        );

        function buildGeometryText(font) {
            const chars = [];
            let cursorX = 0;

            const lines = [
                { text: 'Digital', size: 4.0, height: 0.5, yOff: 3 },
                { text: 'Everywhere', size: 7.0, height: 0.7, yOff: -5 },
            ];

            lines.forEach((line) => {
                cursorX = 0;
                for (let i = 0; i < line.text.length; i++) {
                    const ch = line.text[i];
                    if (ch === ' ') { cursorX += line.size * 0.35; continue; }

                    const geom = new TextGeometry(ch, {
                        font,
                        size: line.size,
                        depth: line.height,
                        curveSegments: 6,
                        bevelEnabled: false,
                    });
                    geom.computeBoundingBox();
                    const w = geom.boundingBox.max.x - geom.boundingBox.min.x;
                    const midY = (geom.boundingBox.max.y + geom.boundingBox.min.y) / 2;

                    const mat = new THREE.MeshBasicMaterial({
                        color: 0xffffff,
                        transparent: true,
                        opacity: 0,
                        depthWrite: false,
                    });

                    const mesh = new THREE.Mesh(geom, mat);
                    mesh.position.set(cursorX, line.yOff - midY, 0);
                    group.add(mesh);

                    chars.push({
                        mesh, material: mat,
                        baseX: cursorX + w / 2,
                        baseY: line.yOff,
                        charIndex: chars.length,
                    });
                    cursorX += w + line.size * 0.04;
                }
            });

            finalize(chars);
        }

        function buildCanvasText() {
            const chars = [];
            const lines = [
                { text: 'Digital', fontSize: 48, yOff: 3, scale: 0.08 },
                { text: 'Everywhere', fontSize: 72, yOff: -5, scale: 0.09 },
            ];

            lines.forEach((line) => {
                let cursorX = 0;
                for (let i = 0; i < line.text.length; i++) {
                    const ch = line.text[i];
                    if (ch === ' ') { cursorX += line.fontSize * 0.3 * line.scale; continue; }

                    // Create canvas texture for this character
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = 128;
                    canvas.height = 128;
                    ctx.fillStyle = '#000000';
                    ctx.fillRect(0, 0, 128, 128);
                    ctx.fillStyle = '#ffffff';
                    ctx.font = `bold ${line.fontSize}px Helvetica, Arial, sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(ch, 64, 64);

                    const tex = new THREE.CanvasTexture(canvas);
                    tex.colorSpace = THREE.SRGBColorSpace;

                    const planeW = line.fontSize * line.scale;
                    const planeH = line.fontSize * line.scale;
                    const geom = new THREE.PlaneGeometry(planeW, planeH);
                    const mat = new THREE.MeshBasicMaterial({
                        map: tex,
                        transparent: true,
                        opacity: 0,
                        depthWrite: false,
                        side: THREE.DoubleSide,
                    });

                    const mesh = new THREE.Mesh(geom, mat);
                    mesh.position.set(cursorX, line.yOff, 0);
                    group.add(mesh);

                    chars.push({
                        mesh, material: mat,
                        baseX: cursorX + planeW / 2,
                        baseY: line.yOff,
                        charIndex: chars.length,
                    });
                    cursorX += planeW * 1.05;
                }
            });

            finalize(chars);
        }

        function finalize(chars) {
            if (disposed || chars.length === 0) return;

            const total = chars.length;
            chars.forEach((c) => (c.totalChars = total));

            // Center the group
            const allX = chars.map((c) => c.baseX);
            const cx = (Math.min(...allX) + Math.max(...allX)) / 2;
            chars.forEach((c) => {
                c.baseX -= cx;
                c.mesh.position.x -= cx;
            });

            group.position.set(0, 0, 3);
            scene.add(group);
            charsRef.current = chars;
            animate();
        }

        function animate() {
            if (disposed) return;

            const p = progressRef.current;
            // Text window: 0.2 → 0.85
            const textT = Math.max(0, Math.min(1, (p - 0.2) / 0.65));
            const total = charsRef.current.length || 1;

            charsRef.current.forEach((ch) => {
                const { mesh, material, charIndex } = ch;

                // Per-character stagger
                const stagger = charIndex / total;
                const ct = Math.max(0, Math.min(1, (textT - stagger * 0.12) / (1 - stagger * 0.12)));
                const eased = ct < 0.5
                    ? 4 * ct * ct * ct
                    : 1 - Math.pow(-2 * ct + 2, 3) / 2;
                const inv = 1 - eased;

                // Opacity synced to motion
                material.opacity = eased;

                // Rightward arc path
                mesh.position.x = ch.baseX + inv * 40;
                mesh.position.y = ch.baseY + inv * -6 + Math.sin(inv * Math.PI) * 10;
                mesh.position.z = inv * 60;

                // Per-character tumble → converge to flat
                mesh.rotation.y = inv * Math.PI + Math.sin(charIndex * 1.7 + 0.3) * inv * 0.7;
                mesh.rotation.x = Math.cos(charIndex * 2.1 + 0.7) * inv * 0.4;
                mesh.rotation.z = Math.sin(charIndex * 1.3) * inv * 0.25;

                mesh.scale.setScalar(0.88 + eased * 0.12);
            });

            rafRef.current = requestAnimationFrame(animate);
        }

        return () => {
            disposed = true;
            clearTimeout(fontTimeout);
            if (rafRef.current) cancelAnimationFrame(rafRef.current);
            charsRef.current.forEach((ch) => {
                ch.mesh.geometry.dispose();
                ch.material.dispose();
                if (ch.material.map) ch.material.map.dispose();
            });
            charsRef.current = [];
            if (groupRef.current && scene) scene.remove(groupRef.current);
        };
    }, [scene, camera]);

    return null;
};

export default Text3D;
