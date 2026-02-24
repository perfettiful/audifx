import { useState, useCallback } from 'react';
import * as Tone from 'tone';
import { useAudio } from '../../context/AudioContext';
import { AudioUploader } from '../AudioUploader';
import { TransportControls } from '../TransportControls';
import { EffectPanel } from '../EffectPanel';
import { Visualizer } from '../Visualizer';
import { PresetGrid } from '../PresetGrid';
import { GenreDetail } from '../GenreDetail';
import { DemoSamples } from '../DemoSamples';
import { Breadcrumb } from '../Breadcrumb';
import { type GenrePreset } from '../../presets';
import { type DemoSample } from '../../utils/demoSamples';
import type { EffectType } from '../../types/effects';
import styles from './AudioEffectsApp.module.css';

interface AudioEffectsAppProps {
  onBackToHome: () => void;
}

type View = 'upload' | 'presets' | 'editor';

export function AudioEffectsApp({ onBackToHome: _onBackToHome }: AudioEffectsAppProps) {
  const { state, setEffect, updateEffectParam, loadBuffer, startAudioContext } = useAudio();
  const [view, setView] = useState<View>('upload');
  const [selectedPreset, setSelectedPreset] = useState<GenrePreset | null>(null);
  const [showGenreDetail, setShowGenreDetail] = useState<GenrePreset | null>(null);
  const [loadingSampleId, setLoadingSampleId] = useState<string | null>(null);

  const hasFile = state.file !== null;

  const handleExplorePresets = () => {
    setView('presets');
  };

  const handleSelectPreset = (preset: GenrePreset) => {
    setSelectedPreset(preset);
    setShowGenreDetail(null);
    setView('upload');
  };

  const handleViewDetails = (preset: GenrePreset) => {
    setShowGenreDetail(preset);
  };

  const handleApplyPreset = useCallback(() => {
    if (!selectedPreset) return;

    setEffect(selectedPreset.effectId as EffectType);

    Object.entries(selectedPreset.parameters).forEach(([key, value]) => {
      updateEffectParam(key, value);
    });
  }, [selectedPreset, setEffect, updateEffectParam]);

  const handleStartEditor = useCallback(() => {
    if (selectedPreset) {
      handleApplyPreset();
    }
    setView('editor');
  }, [selectedPreset, handleApplyPreset]);

  const handleSelectDemoSample = useCallback(async (sample: DemoSample) => {
    setLoadingSampleId(sample.id);

    try {
      await startAudioContext();
      const buffer = await Tone.Buffer.fromUrl(sample.url);
      await loadBuffer(buffer, `${sample.name} - ${sample.artist}`);
      handleStartEditor();
    } catch (error) {
      console.error('Failed to load demo sample:', error);
    } finally {
      setLoadingSampleId(null);
    }
  }, [startAudioContext, loadBuffer, handleStartEditor]);

  // Auto-navigate to editor when file loads
  if (hasFile && view === 'upload' && !loadingSampleId) {
    handleStartEditor();
  }

  const handleReset = () => {
    setView('upload');
    setSelectedPreset(null);
    window.location.reload();
  };

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <Breadcrumb
          items={[{ label: 'AudiFX', href: '/', icon: '🎵' }]}
          currentPage="Audio Effects"
          currentIcon="🎛️"
        />
      </header>

      <main className={styles.main}>
        {view === 'upload' && !hasFile && (
          <section className={styles.uploadSection}>
            {selectedPreset && (
              <div className={styles.selectedPreset}>
                <div
                  className={styles.presetBadge}
                  style={{ '--preset-color': selectedPreset.color } as React.CSSProperties}
                >
                  <span className={styles.presetBadgeIcon}>{selectedPreset.icon}</span>
                  <span className={styles.presetBadgeName}>{selectedPreset.name}</span>
                  <button
                    className={styles.presetBadgeClear}
                    onClick={() => setSelectedPreset(null)}
                    aria-label="Clear preset"
                  >
                    ×
                  </button>
                </div>
                <p className={styles.presetHint}>Upload audio to apply this effect</p>
              </div>
            )}

            <AudioUploader />

            <div className={styles.orDivider}>
              <span>or</span>
            </div>

            <DemoSamples
              onSelectSample={handleSelectDemoSample}
              isLoading={loadingSampleId !== null}
              loadingSampleId={loadingSampleId}
            />

            <div className={styles.orDivider}>
              <span>or</span>
            </div>

            <button className={styles.exploreButton} onClick={handleExplorePresets}>
              <span className={styles.exploreIcon}>✨</span>
              Explore Genre Presets
            </button>
          </section>
        )}

        {view === 'presets' && (
          <section className={styles.presetsSection}>
            <button className={styles.backButtonInline} onClick={() => setView('upload')}>
              ← Back
            </button>
            <PresetGrid
              onSelectPreset={handleSelectPreset}
              onViewDetails={handleViewDetails}
            />
          </section>
        )}

        {view === 'editor' && hasFile && (
          <section className={styles.editorSection}>
            {selectedPreset && (
              <div className={styles.activePresetBanner} style={{ '--preset-color': selectedPreset.color } as React.CSSProperties}>
                <span className={styles.activePresetIcon}>{selectedPreset.icon}</span>
                <span className={styles.activePresetName}>{selectedPreset.name}</span>
                <button
                  className={styles.learnMoreButton}
                  onClick={() => setShowGenreDetail(selectedPreset)}
                >
                  Learn More
                </button>
              </div>
            )}

            <div className={styles.visualizerWrapper}>
              <Visualizer />
            </div>

            <div className={styles.transportWrapper}>
              <TransportControls />
            </div>

            <div className={styles.effectsWrapper}>
              <EffectPanel />
            </div>

            <div className={styles.actions}>
              <button
                className={styles.newFileButton}
                onClick={handleReset}
              >
                <span className={styles.newFileIcon}>+</span>
                Load New File
              </button>
              <button
                className={styles.presetsButton}
                onClick={() => setView('presets')}
              >
                <span>✨</span>
                Browse Presets
              </button>
            </div>
          </section>
        )}

        {showGenreDetail && (
          <GenreDetail
            preset={showGenreDetail}
            onClose={() => setShowGenreDetail(null)}
            onApply={() => {
              handleSelectPreset(showGenreDetail);
            }}
          />
        )}
      </main>
    </div>
  );
}
