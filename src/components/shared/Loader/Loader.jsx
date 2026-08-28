import { useEffect, useRef, useState } from 'react';
import styles from './Loader.module.css';

const MINIMUM_DURATION_MS = 2500;
const FADE_COMPLETION_DELAY_MS = 600;

export default function Loader({ onComplete, ready = true }) {
  const canvasRef = useRef(null);
  const readyRef = useRef(ready);
  const onCompleteRef = useRef(onComplete);
  const completionScheduledRef = useRef(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    readyRef.current = ready;
    onCompleteRef.current = onComplete;
  }, [onComplete, ready]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d', { alpha: false });
    let animationFrame;
    let completionTimer;
    let active = true;
    const particles = [];
    const startTime = Date.now();

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const finish = () => {
      if (!active || completionScheduledRef.current) return;
      completionScheduledRef.current = true;
      setFadeOut(true);
      completionTimer = window.setTimeout(() => {
        if (active) onCompleteRef.current?.();
      }, FADE_COMPLETION_DELAY_MS);
    };

    const animate = () => {
      if (!active) return;
      const now = Date.now();
      const elapsed = now - startTime;
      const width = canvas.width;
      const height = canvas.height;
      const spawnY = (height / 2) + 50;
      const spawnX = width / 2;
      const spawnWidth = 350;

      context.fillStyle = '#000000';
      context.fillRect(0, 0, width, height);

      if (Math.random() > 0.6) {
        const shade = 180 + Math.floor(Math.random() * 75);
        particles.push({
          x: spawnX + ((Math.random() - 0.5) * spawnWidth),
          y: spawnY + ((Math.random() - 0.5) * 15),
          vx: (Math.random() - 0.5) * 0.15,
          vy: -((Math.random() * 0.6) + 0.3),
          size: (Math.random() * 1.5) + 0.8,
          born: now,
          life: 1400 + (Math.random() * 600),
          shade,
        });
      }

      for (let index = particles.length - 1; index >= 0; index -= 1) {
        const particle = particles[index];
        const age = now - particle.born;

        if (age > particle.life) {
          particles.splice(index, 1);
          continue;
        }

        particle.x += particle.vx;
        particle.y += particle.vy;
        const alpha = Math.max(0, Math.min(1, age < 150
          ? age / 150
          : 1 - ((age - 150) / (particle.life - 150)))) * 0.9;

        context.globalAlpha = alpha;
        context.fillStyle = `rgb(${particle.shade},${particle.shade},${particle.shade})`;
        context.fillRect(particle.x | 0, particle.y | 0, particle.size, particle.size);
      }

      context.globalAlpha = 1;

      if (readyRef.current && elapsed > MINIMUM_DURATION_MS) finish();
      animationFrame = window.requestAnimationFrame(animate);
    };

    window.addEventListener('resize', resize);
    resize();
    animationFrame = window.requestAnimationFrame(animate);

    return () => {
      active = false;
      window.removeEventListener('resize', resize);
      window.cancelAnimationFrame(animationFrame);
      if (completionTimer) window.clearTimeout(completionTimer);
    };
  }, []);

  return (
    <div className={`${styles.loaderOverlay}${fadeOut ? ` ${styles.fadeOut}` : ''}`} aria-hidden="true">
      <canvas ref={canvasRef} className={styles.loaderCanvas} />
    </div>
  );
}
