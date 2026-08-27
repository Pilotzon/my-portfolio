import React, { useState, useCallback } from 'react';
import Loader from './components/Loader/Loader';
import ParticleScene from './components/ParticleScene/ParticleScene';
import HeroNavbar from './components/HeroNavbar/HeroNavbar';
import './Hero.css';

const Hero = () => {
    const [loaderDone, setLoaderDone] = useState(false);
    const [sceneReady, setSceneReady] = useState(false);

    const handleLoaderComplete = useCallback(() => setLoaderDone(true), []);
    const handleSceneReady = useCallback(() => {
        setTimeout(() => setSceneReady(true), 3500);
    }, []);

    return (
        <section className="hero">
            {!loaderDone && <Loader onComplete={handleLoaderComplete} />}
            {loaderDone && <ParticleScene onReady={handleSceneReady} />}
            <HeroNavbar visible={sceneReady} />
        </section>
    );
};

export default Hero;