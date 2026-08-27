import * as THREE from 'three';

/**
 * Samples image pixels and generates GPU Instancing data.
 * No colors are stored! Colors are sampled directly from the texture in the shader.
 */
export async function sampleImageForInstancing(imageUrl, density = 400) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = imageUrl;

        img.onload = () => {
            const imgAspect = img.width / img.height;
            const cols = density;
            const rows = Math.floor(density / imgAspect);

            const c = document.createElement('canvas');
            c.width = cols;
            c.height = rows;
            const ctx = c.getContext('2d', { willReadFrequently: true });
            ctx.drawImage(img, 0, 0, cols, rows);
            const pixels = ctx.getImageData(0, 0, cols, rows).data;

            // ── Depth Map (Luminance + Edge) ──
            const depthMap = new Float32Array(cols * rows);
            for (let y = 0; y < rows; y++) {
                for (let x = 0; x < cols; x++) {
                    const idx = y * cols + x;
                    const r = pixels[idx * 4], g = pixels[idx * 4 + 1], b = pixels[idx * 4 + 2];
                    const lum = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
                    depthMap[idx] = lum; // Store raw luminance
                }
            }

            // Base World Dimensions
            const planeW = 160;
            const planeH = planeW / imgAspect;

            const targetXY = [];
            const instanceUV = [];
            const instanceZ = [];
            const instanceJitter = [];
            const radial = [];

            const maxR = Math.sqrt((planeW / 2) ** 2 + (planeH / 2) ** 2);

            // Depth Exaggeration Multiplier (Tweak this to make it deeper/flatter)
            const DEPTH_SCALE = 180.0;

            for (let y = 0; y < rows; y++) {
                for (let x = 0; x < cols; x++) {
                    const idx = y * cols + x;
                    const lum = depthMap[idx];

                    // Skip absolute black to save rendering
                    if (lum < 0.02) continue;

                    // X/Y target positions if Z were 0
                    const tx = (x / (cols - 1) - 0.5) * planeW;
                    const ty = -(y / (rows - 1) - 0.5) * planeH;

                    // Z displacement (bright pixels pop forward, dark recede)
                    const z = (lum - 0.5) * DEPTH_SCALE;

                    // Tiny tight jitter (will settle quickly)
                    const jx = (Math.random() - 0.5) * 8.0;
                    const jy = (Math.random() - 0.5) * 8.0;
                    const jz = (Math.random() - 0.5) * 8.0;

                    // Image UV center for this particle
                    const u = x / (cols - 1);
                    const v = 1.0 - (y / (rows - 1));

                    // Radial distance for wave
                    const dist = Math.sqrt(tx * tx + ty * ty) / maxR;

                    targetXY.push(tx, ty);
                    instanceZ.push(z);
                    instanceJitter.push(jx, jy, jz);
                    instanceUV.push(u, v);
                    radial.push(Math.min(dist, 1.0));
                }
            }

            // Generate a heavily blurred texture for the background wash
            const bgCanvas = document.createElement('canvas');
            bgCanvas.width = 128;
            bgCanvas.height = Math.floor(128 / imgAspect);
            const bgCtx = bgCanvas.getContext('2d');
            bgCtx.filter = 'blur(16px)';
            bgCtx.drawImage(img, 0, 0, bgCanvas.width, bgCanvas.height);
            const bgTex = new THREE.CanvasTexture(bgCanvas);
            bgTex.colorSpace = THREE.SRGBColorSpace;

            resolve({
                targetXY: new Float32Array(targetXY),
                instanceZ: new Float32Array(instanceZ),
                instanceJitter: new Float32Array(instanceJitter),
                instanceUV: new Float32Array(instanceUV),
                radial: new Float32Array(radial),
                count: targetXY.length / 2,
                planeW,
                planeH,
                cols,
                rows,
                bgTex,
            });
        };
        img.onerror = () => reject(new Error('Failed to load image'));
    });
}