import { lazy, Suspense } from 'react';
import Loader from '../../components/shared/Loader/Loader.jsx';
import SectionTwoPlaceholder from './sections/SectionTwoPlaceholder/SectionTwoPlaceholder.jsx';
import styles from './HomePage.module.css';

const HeroSection = lazy(() => import('./sections/HeroSection/HeroSection.jsx'));

export default function HomePage() {
  return (
    <main className={styles.home}>
      <Suspense fallback={<Loader />}>
        <HeroSection />
      </Suspense>
      <SectionTwoPlaceholder />
    </main>
  );
}
