import { genrePresets, type GenrePreset } from '../../presets';
import styles from './PresetGrid.module.css';

interface PresetGridProps {
  onSelectPreset: (preset: GenrePreset) => void;
  onViewDetails: (preset: GenrePreset) => void;
}

export function PresetGrid({ onSelectPreset, onViewDetails }: PresetGridProps) {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Genre Presets</h2>
        <p className={styles.subtitle}>Choose a style to transform your audio</p>
      </div>

      <div className={styles.grid}>
        {genrePresets.map((preset, index) => (
          <div
            key={preset.id}
            className={styles.card}
            style={{
              '--preset-color': preset.color,
              '--gradient-from': preset.gradientFrom,
              '--gradient-to': preset.gradientTo,
              '--animation-delay': `${index * 60}ms`,
            } as React.CSSProperties}
          >
            <div className={styles.cardBackground} />
            
            <div className={styles.cardContent}>
              <div className={styles.cardHeader}>
                <span className={styles.icon}>{preset.icon}</span>
                <div className={styles.titleGroup}>
                  <h3 className={styles.name}>{preset.name}</h3>
                  <span className={styles.subtitle2}>{preset.subtitle}</span>
                </div>
              </div>

              <p className={styles.description}>
                {preset.description.slice(0, 100)}...
              </p>

              <div className={styles.meta}>
                <span className={styles.era}>{preset.era}</span>
                <span className={styles.origin}>{preset.origin}</span>
              </div>

              <div className={styles.actions}>
                <button
                  className={styles.detailsButton}
                  onClick={() => onViewDetails(preset)}
                  aria-label={`Learn about ${preset.name}`}
                >
                  Learn More
                </button>
                <button
                  className={styles.applyButton}
                  onClick={() => onSelectPreset(preset)}
                  aria-label={`Apply ${preset.name} preset`}
                >
                  Apply
                </button>
              </div>
            </div>

            <div className={styles.cardGlow} />
          </div>
        ))}
      </div>
    </div>
  );
}

