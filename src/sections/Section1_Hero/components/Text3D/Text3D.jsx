import React from 'react';
import './Text3D.css';

const Text3D = ({ progress = 0 }) => {
    // Easing
    const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

    // Text animation starts at 0.3, ends at 0.85
    const t = Math.max(0, Math.min(1, (progress - 0.3) / 0.55));
    const eased = ease(t);
    const inv = 1 - eased;

    // Swoop in from front-right
    const tx = inv * 40;     // vw
    const ty = inv * -15;    // vh
    const tz = inv * 300;    // px depth
    const ry = inv * -45;    // deg rotate
    const rx = inv * 20;     // deg rotate
    const scale = 0.8 + eased * 0.2;

    return (
        <div className="text3d-wrapper">
            <div
                className="text3d-element"
                style={{
                    opacity: eased,
                    transform: `translate3d(${tx}vw, ${ty}vh, ${tz}px) rotateY(${ry}deg) rotateX(${rx}deg) scale(${scale})`,
                }}
            >
                <span className="text3d-light">Digital</span>
                <span className="text3d-bold">Everywhere</span>
            </div>
        </div>
    );
};

export default Text3D;