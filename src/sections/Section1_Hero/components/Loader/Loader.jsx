import React, { useRef, useEffect, useState } from 'react';
import './Loader.css';

const Loader = ({ onComplete }) => {
    const canvasRef = useRef(null);
    const [fadeOut, setFadeOut] = useState(false);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { alpha: false });
        let animationFrame;
        let particles = [];

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        window.addEventListener('resize', resize);
        resize();

        const startTime = Date.now();

        const animate = () => {
            const now = Date.now();
            const elapsed = now - startTime;
            const w = canvas.width;
            const h = canvas.height;

            // Spawn lower and much wider
            const spawnY = h / 2 + 50;
            const spawnX = w / 2;
            const spawnWidth = 350;

            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, w, h);

            // Slower spawn rate
            if (Math.random() > 0.6) {
                // Strict Silver colors
                const shade = 180 + Math.floor(Math.random() * 75);
                particles.push({
                    x: spawnX + (Math.random() - 0.5) * spawnWidth,
                    y: spawnY + (Math.random() - 0.5) * 15,
                    vx: (Math.random() - 0.5) * 0.15,
                    vy: -(Math.random() * 0.6 + 0.3), // Very slow float up
                    size: Math.random() * 1.5 + 0.8,
                    born: now,
                    life: 1400 + Math.random() * 600, // Long life
                    shade,
                });
            }

            for (let i = particles.length - 1; i >= 0; i--) {
                const p = particles[i];
                const age = now - p.born;

                if (age > p.life) {
                    particles.splice(i, 1);
                    continue;
                }

                p.x += p.vx;
                p.y += p.vy;

                // 0.1s in, 0.5s out
                let alpha;
                if (age < 150) {
                    alpha = age / 150;
                } else {
                    alpha = 1 - (age - 150) / (p.life - 150);
                }
                alpha = Math.max(0, Math.min(1, alpha)) * 0.9;

                ctx.globalAlpha = alpha;
                ctx.fillStyle = `rgb(${p.shade},${p.shade},${p.shade})`;
                ctx.fillRect(p.x | 0, p.y | 0, p.size, p.size);
            }

            ctx.globalAlpha = 1;

            // Ensure loader plays for at least 2.5s before signaling complete
            if (elapsed > 2500 && !fadeOut) {
                setFadeOut(true);
                setTimeout(() => onComplete && onComplete(), 600);
            }

            animationFrame = requestAnimationFrame(animate);
        };

        animationFrame = requestAnimationFrame(animate);
        return () => {
            window.removeEventListener('resize', resize);
            cancelAnimationFrame(animationFrame);
        };
    }, [onComplete]);

    return (
        <div className={`loader-overlay ${fadeOut ? 'fade-out' : ''}`}>
            <canvas ref={canvasRef} className="loader-canvas" />
        </div>
    );
};

export default Loader;