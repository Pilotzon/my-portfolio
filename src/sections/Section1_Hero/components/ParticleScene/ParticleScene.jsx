import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { sampleImageForInstancing } from '../../utils/imageSampler';
import { instancedVertexShader, instancedFragmentShader } from '../../utils/shaders';
import Text3D from '../Text3D/Text3D';
import './ParticleScene.css';

const IMAGE_URL = '/hero-bg.jpg';
const TOTAL_DURATION = 9500;

const easeInOutQuint = (t) => t < 0.5 ? 16 * t * t * t * t * t : 1 - Math.pow(-2 * t + 2, 5) / 2;

const ParticleScene = ({ onReady }) => {
    const mountRef = useRef(null);
    const [progress, setProgress] = useState(0);
    const [imageSrc, setImageSrc] = useState(null);

    useEffect(() => {
        const mount = mountRef.current;
        if (!mount) return;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(window.innerWidth, window.innerHeight);
        mount.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x020203); // Start near black

        const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 4000);

        let instancedMesh = null;
        let material = null;
        let bgMesh = null;
        let bgMaterial = null;
        let finalCameraZ = 150;

        let disposed = false;
        let started = false;
        let startTime = 0;

        const computeFillDistance = (planeW, planeH) => {
            const vFov = (camera.fov * Math.PI) / 180;
            const aspect = window.innerWidth / window.innerHeight;
            const dH = planeH / 2 / Math.tan(vFov / 2);
            const dW = planeW / 2 / Math.tan(vFov / 2) / aspect;
            return Math.min(dH, dW) * 0.95; // 5% crop
        };

        // Load Image & Create GPU Instances
        sampleImageForInstancing(IMAGE_URL, 450).then((data) => {
            if (disposed) return;
            setImageSrc(IMAGE_URL);

            finalCameraZ = computeFillDistance(data.planeW, data.planeH);

            // Base Geometry (a simple 1x1 plane)
            const baseGeom = new THREE.PlaneGeometry(1, 1);

            const geom = new THREE.InstancedBufferGeometry();
            geom.index = baseGeom.index;
            geom.attributes.position = baseGeom.attributes.position;
            geom.attributes.uv = baseGeom.attributes.uv;

            // Instance Attributes
            geom.setAttribute('aTargetXY', new THREE.InstancedBufferAttribute(data.targetXY, 2));
            geom.setAttribute('aZ', new THREE.InstancedBufferAttribute(data.instanceZ, 1));
            geom.setAttribute('aJitter', new THREE.InstancedBufferAttribute(data.instanceJitter, 3));
            geom.setAttribute('aUV', new THREE.InstancedBufferAttribute(data.instanceUV, 2));
            geom.setAttribute('aRadial', new THREE.InstancedBufferAttribute(data.radial, 1));

            // Load main texture
            const texLoader = new THREE.TextureLoader();
            const mainTex = texLoader.load(IMAGE_URL);
            mainTex.colorSpace = THREE.SRGBColorSpace;

            material = new THREE.ShaderMaterial({
                transparent: true,
                depthWrite: true,
                vertexShader: instancedVertexShader,
                fragmentShader: instancedFragmentShader,
                uniforms: {
                    uImage: { value: mainTex },
                    uFinalCameraZ: { value: finalCameraZ },
                    uProgress: { value: 0 },
                    uCols: { value: data.cols },
                    uRows: { value: data.rows },
                    uPlaneW: { value: data.planeW },
                    uPlaneH: { value: data.planeH }
                }
            });

            instancedMesh = new THREE.Mesh(geom, material);
            instancedMesh.frustumCulled = false; // Important for instancing
            scene.add(instancedMesh);

            // Blurred Background Wash (Behind everything)
            const bgGeom = new THREE.PlaneGeometry(data.planeW * 3, data.planeH * 3);
            bgMaterial = new THREE.MeshBasicMaterial({
                map: data.bgTex,
                transparent: true,
                opacity: 0,
                depthWrite: false
            });
            bgMesh = new THREE.Mesh(bgGeom, bgMaterial);
            bgMesh.position.z = -500;
            scene.add(bgMesh);

            console.log(`Rendered Quads: ${data.count}`);

            started = true;
            startTime = performance.now();
            if (onReady) onReady();
        });

        const onResize = () => {
            renderer.setSize(window.innerWidth, window.innerHeight);
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            if (material) {
                // Recompute Z so image remains full screen
                // Note: uPlaneW/H would need to be in state/ref to recompute perfectly, 
                // but for safety we'll skip recalculating mid-animation.
            }
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

            // ── SINGLE MASTER EASING ──
            const t = easeInOutQuint(rawT);
            setProgress(t);

            // ── CAMERA ORBIT (Driven strictly by 't') ──
            // Angle: Starts at -45 deg (-PI/4), sweeps to 0.
            const angle = (1 - t) * (-Math.PI * 0.25);

            // Radius: Starts far, sweeps into the exact calculated finalCameraZ
            const radius = finalCameraZ + (1 - t) * 120;

            // Height: Starts high, swoops down
            const height = (1 - t) * 60;

            camera.position.x = Math.sin(angle) * radius;
            camera.position.y = height;
            camera.position.z = Math.cos(angle) * radius;

            // Look slightly off center initially, resolve to center
            camera.lookAt(
                (1 - t) * -20,
                (1 - t) * -10,
                0
            );

            // ── UPDATE UNIFORMS ──
            if (material) {
                material.uniforms.uProgress.value = t;
            }

            // Fade in the blurred color wash in the background
            if (bgMaterial) {
                bgMaterial.opacity = t * 0.4; // Peaks at 40% opacity
            }

            renderer.render(scene, camera);
            raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);

        return () => {
            disposed = true;
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', onResize);
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
            <Text3D progress={progress} />
        </>
    );
};

export default ParticleScene;