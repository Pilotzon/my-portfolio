import { lazy, Suspense, useState } from 'react';
import Loader from '../../../../components/shared/Loader/Loader.jsx';
import { heroConfig } from './constants/heroConfig.js';
import useImageSampler from './hooks/useImageSampler.js';
import useQualityTier from './hooks/useQualityTier.js';
import useReducedMotion from './hooks/useReducedMotion.js';
import { UnifiedTimelineProvider } from './hooks/useUnifiedTimeline.js';
import { supportsWebGL } from './utils/webgl.js';
import { makeFallbackDataUrl } from './components/fallbackImage.js';
import styles from './HeroSection.module.css';

const ParticleCanvas = lazy(() => import('./components/ParticleCanvas.jsx'));

function StaticHero({ source, onError }) {
  return (
    <div className={styles.staticHero}>
      <img
        className={styles.staticImage}
        src={source}
        alt=""
        aria-hidden="true"
        onError={onError}
      />
    </div>
  );
}

export default function HeroSection({ imageSource = heroConfig.imageSource }) {
  const quality = useQualityTier();
  const reducedMotion = useReducedMotion();
  const [webglAvailable] = useState(() => supportsWebGL());
  const [imageFailed, setImageFailed] = useState(false);
  const [contextStatus, setContextStatus] = useState('ready');
  const [canvasReady, setCanvasReady] = useState(false);
  const animationDisabled = reducedMotion || !webglAvailable;
  const source = imageFailed ? makeFallbackDataUrl() : imageSource;
  const imageResult = useImageSampler(imageSource, quality, !animationDisabled);
  const staticMode = animationDisabled || imageResult.status === 'error';

  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <h1 id="hero-title" className={staticMode ? styles.staticHeading : 'sr-only'}>
        {heroConfig.text.content}
      </h1>

      <div className={styles.stage}>
        {staticMode ? (
          <StaticHero source={source} onError={() => setImageFailed(true)} />
        ) : imageResult.status !== 'ready' ? (
          <Loader label="Preparing image field" />
        ) : (
          <UnifiedTimelineProvider ready={heroConfig.timeline.autoStart && canvasReady}>
            <Suspense fallback={<Loader label="Starting field" />}>
              <ParticleCanvas
                assets={imageResult.assets}
                quality={quality}
                onCanvasReady={() => setCanvasReady(true)}
                onContextStatus={setContextStatus}
              />
            </Suspense>
          </UnifiedTimelineProvider>
        )}
      </div>

      {contextStatus === 'lost' && !staticMode && (
        <p className={styles.contextNotice} role="status">
          Rendering paused — waiting for WebGL to recover.
        </p>
      )}

      <p className="sr-only" aria-live="polite">
        {staticMode
          ? 'Static hero image displayed.'
          : imageResult.status === 'ready'
            ? 'Animated hero ready.'
            : 'Preparing animated hero.'}
      </p>
    </section>
  );
}
