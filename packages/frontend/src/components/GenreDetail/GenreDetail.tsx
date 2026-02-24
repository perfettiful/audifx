import { useEffect, useRef } from 'react';
import type { GenrePreset } from '../../presets';
import styles from './GenreDetail.module.css';

interface GenreDetailProps {
  preset: GenrePreset;
  onClose: () => void;
  onApply: () => void;
}

export function GenreDetail({ preset, onClose, onApply }: GenreDetailProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div className={styles.overlay} onClick={handleBackdropClick}>
      <div
        ref={modalRef}
        className={styles.modal}
        style={{
          '--preset-color': preset.color,
          '--gradient-from': preset.gradientFrom,
          '--gradient-to': preset.gradientTo,
        } as React.CSSProperties}
        role="dialog"
        aria-modal="true"
        aria-labelledby="genre-title"
      >
        <div className={styles.background} />
        
        <button className={styles.closeButton} onClick={onClose} aria-label="Close">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>

        <div className={styles.content}>
          {/* Header */}
          <header className={styles.header}>
            <span className={styles.icon}>{preset.icon}</span>
            <div>
              <h1 id="genre-title" className={styles.title}>{preset.name}</h1>
              <p className={styles.subtitle}>{preset.subtitle}</p>
            </div>
          </header>

          {/* Quick Info */}
          <div className={styles.quickInfo}>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Era</span>
              <span className={styles.infoValue}>{preset.era}</span>
            </div>
            <div className={styles.infoItem}>
              <span className={styles.infoLabel}>Origin</span>
              <span className={styles.infoValue}>{preset.origin}</span>
            </div>
          </div>

          {/* Description */}
          <section className={styles.section}>
            <p className={styles.description}>{preset.description}</p>
          </section>

          {/* History */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>📜</span>
              History & Origins
            </h2>
            <p className={styles.text}>{preset.history}</p>
          </section>

          {/* Characteristics */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>🎵</span>
              Sound Characteristics
            </h2>
            <ul className={styles.list}>
              {preset.characteristics.map((char, i) => (
                <li key={i} className={styles.listItem}>
                  <span className={styles.bullet} />
                  {char}
                </li>
              ))}
            </ul>
          </section>

          {/* Listen With */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>🎧</span>
              Best Enjoyed When...
            </h2>
            <p className={styles.text}>{preset.listensWith}</p>
          </section>

          {/* Tips */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>💡</span>
              Production Tips
            </h2>
            <ul className={styles.list}>
              {preset.tips.map((tip, i) => (
                <li key={i} className={styles.listItem}>
                  <span className={styles.bullet} />
                  {tip}
                </li>
              ))}
            </ul>
          </section>

          {/* Notable Artists */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>🎤</span>
              Notable Artists
            </h2>
            <div className={styles.tags}>
              {preset.notableArtists.map((artist, i) => (
                <span key={i} className={styles.tag}>{artist}</span>
              ))}
            </div>
          </section>

          {/* Related Genres */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <span className={styles.sectionIcon}>🔗</span>
              Related Genres
            </h2>
            <div className={styles.tags}>
              {preset.relatedGenres.map((genre, i) => (
                <span key={i} className={styles.tagOutline}>{genre}</span>
              ))}
            </div>
          </section>

          {/* Apply Button */}
          <div className={styles.footer}>
            <button className={styles.applyButton} onClick={onApply}>
              Apply {preset.name} Preset
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

