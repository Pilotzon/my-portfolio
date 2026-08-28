import styles from './Loader.module.css';

export default function Loader({ label = 'Loading experience' }) {
  return (
    <div className={styles.loader} role="status" aria-live="polite">
      <span className={styles.mark} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
