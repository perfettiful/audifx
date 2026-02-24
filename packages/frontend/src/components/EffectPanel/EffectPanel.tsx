import { useAudio } from '../../context/AudioContext';
import { effectList } from '../../effects';
import type { EffectType } from '../../types/effects';
import styles from './EffectPanel.module.css';

export function EffectPanel() {
  const { activeEffect, effectParams, setEffect, updateEffectParam } = useAudio();
  
  const currentEffect = effectList.find(e => e.id === activeEffect);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>Effects</h2>
        {activeEffect && (
          <button
            className={styles.clearButton}
            onClick={() => setEffect(null)}
            aria-label="Clear effect"
          >
            Clear
          </button>
        )}
      </div>

      <div className={styles.grid}>
        {effectList.map((effect, index) => (
          <button
            key={effect.id}
            className={`${styles.effectCard} ${activeEffect === effect.id ? styles.active : ''}`}
            onClick={() => setEffect(effect.id as EffectType)}
            style={{
              '--effect-color': effect.color,
              '--animation-delay': `${index * 50}ms`,
            } as React.CSSProperties}
          >
            <span className={styles.effectIcon}>{effect.icon}</span>
            <span className={styles.effectName}>{effect.name}</span>
            <div className={styles.effectGlow} />
          </button>
        ))}
      </div>

      {currentEffect && (
        <div className={styles.parameters}>
          <h3 className={styles.parametersTitle}>{currentEffect.name} Settings</h3>
          <p className={styles.parametersDescription}>{currentEffect.description}</p>
          
          <div className={styles.parametersList}>
            {currentEffect.parameters.map(param => (
              <div key={param.id} className={styles.parameter}>
                <div className={styles.parameterHeader}>
                  <label htmlFor={param.id} className={styles.parameterLabel}>
                    {param.name}
                  </label>
                  <span className={styles.parameterValue}>
                    {effectParams[param.id]?.toFixed(param.step && param.step < 1 ? 2 : 0)}
                    {param.unit && <span className={styles.parameterUnit}>{param.unit}</span>}
                  </span>
                </div>
                <input
                  id={param.id}
                  type="range"
                  min={param.min}
                  max={param.max}
                  step={param.step || 0.01}
                  value={effectParams[param.id] ?? param.default}
                  onChange={(e) => updateEffectParam(param.id, parseFloat(e.target.value))}
                  className={styles.slider}
                  style={{ '--effect-color': currentEffect.color } as React.CSSProperties}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

