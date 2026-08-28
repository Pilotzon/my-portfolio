import * as THREE from 'three';

/**
 * Samples image pixels and generates GPU Instancing data.
 * Colors are sampled from the texture in the shader — no per-instance color storage.
 *
 * Key design:
 * - High density (800) for fine grain appearance
 * - Low luminance threshold (0.003) to prevent gaps in dark regions
 * - Moderate jitter for organic initial cluster without scatter
 * - Depth map from luminance for volumetric Z displacement
 */
export async function sampleImageForInstancing(imageUrl, density = 800) {
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

            // ── Depth Map from Luminance ──
            const depthMap = new Float32Array(cols * rows);
            for (let y = 0; y < rows; y++) {
                for (let x = 0; x < cols; x++) {
                    const idx = y * cols + x;
                    const r = pixels[idx * 4], g = pixels[idx * 4 + 1], b = pixels[idx * 4 + 2];
                    depthMap[idx] = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
                }
            }

            const planeW = 160;
            const planeH = planeW / imgAspect;

            const targetXY = [];
            const instanceUV = [];
            const instanceZ = [];
            const instanceJitter = [];
            const radial = [];

            const maxR = Math.sqrt((planeW / 2) ** 2 + (planeH / 2) ** 2);
            const DEPTH_SCALE = 180.0;

            for (let y = 0; y < rows; y++) {
                for (let x = 0; x < cols; x++) {
                    const idx = y * cols + x;
                    const lum = depthMap[idx];

                    // Skip only truly empty pixels
                    if (lum < 0.003) continue;

                    const tx = (x / (cols - 1) - 0.5) * planeW;
                    const ty = -(y / (rows - 1) - 0.5) * planeH;
                    const z = (lum - 0.5) * DEPTH_SCALE;

                    // Moderate jitter — organic but not scattered
                    const jx = (Math.random() - 0.5) * 2.5;
                    const jy = (Math.random() - 0.5) * 2.5;
                    const jz = (Math.random() - 0.5) * 2.5;

                    const u = x / (cols - 1);
                    const v = 1.0 - (y / (rows - 1));
                    const dist = Math.sqrt(tx * tx + ty * ty) / maxR;

                    targetXY.push(tx, ty);
                    instanceZ.push(z);
                    instanceJitter.push(jx, jy, jz);
                    instanceUV.push(u, v);
                    radial.push(Math.min(dist, 1.0));
                }
            }

            // Blurred background wash texture
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
