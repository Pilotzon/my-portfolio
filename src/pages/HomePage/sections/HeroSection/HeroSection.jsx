import { Component, useState } from 'react';
import Loader from '../../../../components/shared/Loader/Loader.jsx';
import { heroConfig } from './constants/heroConfig.js';
import useImageSampler from './hooks/useImageSampler.js';
import useQualityTier from './hooks/useQualityTier.js';
import useReducedMotion from './hooks/useReducedMotion.js';
import { UnifiedTimelineProvider } from './hooks/useUnifiedTimeline.js';
import { supportsWebGL } from './utils/webgl.js';
import { makeFallbackDataUrl } from './components/fallbackImage.js';
import ParticleCanvas from './components/ParticleCanvas.jsx';
import styles from './HeroSection.module.css';

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

class HeroCanvasBoundary extends Component {
  static getDerivedStateFromError() {
    return { hasError: true };
  }

  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  componentDidCatch(error) {
    console.error('Hero canvas failed; using the static image fallback.', error);
    this.props.onError?.(error);
  }

  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

export default function HeroSection({ imageSource = heroConfig.imageSource }) {
  const quality = useQualityTier();
  const reducedMotion = useReducedMotion();
  const [webglAvailable] = useState(() => supportsWebGL());
  const [imageFailed, setImageFailed] = useState(false);
  const [contextStatus, setContextStatus] = useState('ready');
  const [loaderComplete, setLoaderComplete] = useState(false);
  const [canvasFailed, setCanvasFailed] = useState(false);
  const animationDisabled = reducedMotion || !webglAvailable;
  const source = imageFailed ? makeFallbackDataUrl() : imageSource;
  const imageResult = useImageSampler(imageSource, quality, !animationDisabled);
  const staticMode = animationDisabled || imageResult.status === 'error' || canvasFailed;
  const showCanvas = !staticMode && loaderComplete && imageResult.status === 'ready';

  return (
    <section className={styles.hero} aria-labelledby="hero-title">
      <h1 id="hero-title" className={staticMode ? styles.staticHeading : 'sr-only'}>
        {heroConfig.text.content}
      </h1>

      <div className={styles.stage}>
        {staticMode ? (
          <StaticHero source={source} onError={() => setImageFailed(true)} />
        ) : showCanvas ? (
          <HeroCanvasBoundary
            fallback={<StaticHero source={source} onError={() => setImageFailed(true)} />}
            onError={() => setCanvasFailed(true)}
          >
            <UnifiedTimelineProvider ready={heroConfig.timeline.autoStart}>
              <ParticleCanvas
                assets={imageResult.assets}
                quality={quality}
                onContextStatus={setContextStatus}
                onCanvasError={() => setCanvasFailed(true)}
              />
            </UnifiedTimelineProvider>
          </HeroCanvasBoundary>
        ) : (
          <StaticHero source={source} onError={() => setImageFailed(true)} />
        )}
      </div>

      {!staticMode && !loaderComplete && (
        <Loader onComplete={() => setLoaderComplete(true)} />
      )}

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
