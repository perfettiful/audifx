import { demoSamples, type DemoSample } from '../../utils/demoSamples';
import styles from './DemoSamples.module.css';

interface DemoSamplesProps {
  onSelectSample: (sample: DemoSample) => void;
  isLoading: boolean;
  loadingSampleId: string | null;
}

export function DemoSamples({ onSelectSample, isLoading, loadingSampleId }: DemoSamplesProps) {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>🎵 Try Demo Samples</h3>
        <p className={styles.subtitle}>Free royalty-free tracks to test effects</p>
      </div>

      <div className={styles.grid}>
        {demoSamples.map((sample) => (
          <button
            key={sample.id}
            className={`${styles.sampleCard} ${loadingSampleId === sample.id ? styles.loading : ''}`}
            onClick={() => onSelectSample(sample)}
            disabled={isLoading}
          >
            <span className={styles.icon}>{sample.icon}</span>
            <div className={styles.info}>
              <span className={styles.name}>{sample.name}</span>
              <span className={styles.description}>{sample.description}</span>
              <span className={styles.artist}>by {sample.artist}</span>
            </div>
            
            {loadingSampleId === sample.id && (
              <div className={styles.loadingOverlay}>
                <div className={styles.spinner} />
                <span>Loading...</span>
              </div>
            )}
          </button>
        ))}
      </div>

      <p className={styles.credits}>
        Music licensed under Creative Commons
      </p>
    </div>
  );
}
