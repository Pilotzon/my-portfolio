import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { sampleImageForInstancing } from '../../utils/imageSampler';
import { instancedVertexShader, instancedFragmentShader } from '../../utils/shaders';
import { createPostProcessing } from '../../utils/postProcessing';
import Text3D from '../Text3D/Text3D';
import './ParticleScene.css';

const IMAGE_URL = '/hero-bg.jpg';
const TOTAL_DURATION = 12000;

/**
 * Single smooth cinematic easing — one continuous curve.
 * Slow weighted start, smooth middle, gentle deceleration landing.
 * No segments, no transitions between phases.
 */
const cinematicEase = (t) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    // Quintic ease-in-out — extremely smooth, no visible phase boundaries
    return t < 0.5
        ? 16 * t * t * t * t * t
        : 1 - Math.pow(-2 * t + 2, 5) / 2;
};

const ParticleScene = ({ onReady }) => {
    const mountRef = useRef(null);
    const [progress, setProgress] = useState(0);
    const [sceneData, setSceneData] = useState(null);

    useEffect(() => {
        const mount = mountRef.current;
        if (!mount) return;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        mount.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x010102);

        const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 4000);

        let instancedMesh = null;
        let material = null;
        let bgMesh = null;
        let bgMaterial = null;
        let finalCameraZ = 150;
        let postFX = null;

        let disposed = false;
        let started = false;
        let startTime = 0;

        const computeFillDistance = (planeW, planeH) => {
            const vFov = (camera.fov * Math.PI) / 180;
            const aspect = window.innerWidth / window.innerHeight;
            const dH = planeH / 2 / Math.tan(vFov / 2);
            const dW = planeW / 2 / Math.tan(vFov / 2) / aspect;
            return Math.min(dH, dW) * 0.95;
        };

        sampleImageForInstancing(IMAGE_URL, 800).then((data) => {
            if (disposed) return;

            finalCameraZ = computeFillDistance(data.planeW, data.planeH);

            const baseGeom = new THREE.PlaneGeometry(1, 1);
            const geom = new THREE.InstancedBufferGeometry();
            geom.index = baseGeom.index;
            geom.attributes.position = baseGeom.attributes.position;
            geom.attributes.uv = baseGeom.attributes.uv;

            geom.setAttribute('aTargetXY', new THREE.InstancedBufferAttribute(data.targetXY, 2));
            geom.setAttribute('aZ', new THREE.InstancedBufferAttribute(data.instanceZ, 1));
            geom.setAttribute('aJitter', new THREE.InstancedBufferAttribute(data.instanceJitter, 3));
            geom.setAttribute('aUV', new THREE.InstancedBufferAttribute(data.instanceUV, 2));
            geom.setAttribute('aRadial', new THREE.InstancedBufferAttribute(data.radial, 1));

            const texLoader = new THREE.TextureLoader();
            const mainTex = texLoader.load(IMAGE_URL);
            mainTex.colorSpace = THREE.SRGBColorSpace;

            material = new THREE.ShaderMaterial({
                transparent: true,
                depthWrite: false,
                blending: THREE.AdditiveBlending,
                vertexShader: instancedVertexShader,
                fragmentShader: instancedFragmentShader,
                uniforms: {
                    uImage: { value: mainTex },
                    uFinalCameraZ: { value: finalCameraZ },
                    uProgress: { value: 0 },
                    uCols: { value: data.cols },
                    uRows: { value: data.rows },
                    uPlaneW: { value: data.planeW },
                    uPlaneH: { value: data.planeH },
                },
            });

            instancedMesh = new THREE.Mesh(geom, material);
            instancedMesh.frustumCulled = false;
            scene.add(instancedMesh);

            // Blurred background wash
            const bgGeom = new THREE.PlaneGeometry(data.planeW * 3, data.planeH * 3);
            bgMaterial = new THREE.MeshBasicMaterial({
                map: data.bgTex,
                transparent: true,
                opacity: 0,
                depthWrite: false,
            });
            bgMesh = new THREE.Mesh(bgGeom, bgMaterial);
            bgMesh.position.z = -500;
            scene.add(bgMesh);

            postFX = createPostProcessing(renderer, scene, camera);
            setSceneData({ scene, camera });

            console.log(`Particles: ${data.count}`);

            // Zero delay — start immediately
            started = true;
            startTime = performance.now();
            if (onReady) onReady();
        });

        const onResize = () => {
            renderer.setSize(window.innerWidth, window.innerHeight);
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            if (postFX) postFX.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', onResize);

        let raf;
        const tick = () => {
            if (!started) {
                renderer.render(scene, camera);
                raf = requestAnimationFrame(tick);
                return;
            }

            const elapsed = performance.now() - startTime;
            const rawT = Math.min(elapsed / TOTAL_DURATION, 1.0);
            const t = cinematicEase(rawT);
            setProgress(t);

            // ── SINGLE CONTINUOUS CAMERA MOTION ──
            // Slow orbit from upper-right, settling gently into final position
            const angle = (1 - t) * (-Math.PI * 0.2);
            const radius = finalCameraZ + (1 - t) * 10;
            const height = (1 - t) * 5;

            camera.position.x = Math.sin(angle) * radius;
            camera.position.y = height;
            camera.position.z = Math.cos(angle) * radius;

            camera.lookAt(0, 0, 0);

            if (material) material.uniforms.uProgress.value = t;
            if (bgMaterial) bgMaterial.opacity = t * 0.35;

            if (postFX) {
                postFX.update(t, elapsed * 0.001);
                postFX.render();
            } else {
                renderer.render(scene, camera);
            }

            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);

        return () => {
            disposed = true;
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', onResize);
            if (postFX) postFX.dispose();
            if (instancedMesh) {
                instancedMesh.geometry.dispose();
                material.dispose();
            }
            renderer.dispose();
            mount.removeChild(renderer.domElement);
        };
    }, [onReady]);

    return (
        <>
            <div ref={mountRef} className="particle-scene" />
            {sceneData && (
                <Text3D
                    scene={sceneData.scene}
                    camera={sceneData.camera}
                    progress={progress}
                />
            )}
        </>
    );
};

export default ParticleScene;
