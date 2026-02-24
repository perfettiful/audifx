/**
 * Stem Mixer / Remix Studio
 * Separate audio into stems and mix them with individual controls
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import * as Tone from 'tone';
import { Breadcrumb } from '../Breadcrumb';
import styles from './StemMixer.module.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

interface Stem {
  name: string;
  label: string;
  url: string;
  color: string;
  volume: number;
  pan: number;
  muted: boolean;
  solo: boolean;
}

interface StemMixerProps {
  onBackToHome?: () => void;
  initialJobId?: string;
}

const STEM_COLORS: Record<string, string> = {
  vocals: '#ff4d4d',
  bass: '#4dd2ff',
  drums: '#7dff4d',
  other: '#ffb84d',
  no_vocals: '#9d4dff'
};

const STEM_ICONS: Record<string, string> = {
  vocals: '🎤',
  bass: '🎸',
  drums: '🥁',
  other: '🎹',
  no_vocals: '🎵'
};

export function StemMixer({ onBackToHome, initialJobId }: StemMixerProps) {
  const [currentJobId, setCurrentJobId] = useState<string | null>(initialJobId || null);
  const [stems, setStems] = useState<Stem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingJob, setLoadingJob] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  const playersRef = useRef<Map<string, Tone.Player>>(new Map());
  const gainsRef = useRef<Map<string, Tone.Gain>>(new Map());
  const pannersRef = useRef<Map<string, Tone.Panner>>(new Map());
  const animationFrameRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number>(0);
  const offsetRef = useRef<number>(0);

  // Load job from URL parameter on mount
  useEffect(() => {
    if (initialJobId && stems.length === 0) {
      loadJobById(initialJobId);
    }
  }, [initialJobId]);

  const loadJobById = async (jobId: string) => {
    setLoadingJob(true);
    setError(null);
    try {
      // Check if job has stems
      const stemsResponse = await fetch(`${BACKEND_URL}/jobs/${jobId}/stems`);
      if (!stemsResponse.ok) {
        throw new Error('Job not found or stems not available');
      }
      const stemsData = await stemsResponse.json();

      if (stemsData.total === 0) {
        throw new Error('No stems found for this job. Process the audio first.');
      }

      // Get audio duration from the first stem
      const firstStemUrl = `${BACKEND_URL}${stemsData.stems[0].url}`;
      const tempPlayer = new Tone.Player(firstStemUrl);
      await Tone.loaded();
      const dur = tempPlayer.buffer.duration;
      tempPlayer.dispose();
      setDuration(dur);

      // Create stem objects
      const stemObjects: Stem[] = stemsData.stems.map((s: any) => ({
        name: s.name,
        label: s.label,
        url: `${BACKEND_URL}${s.url}`,
        color: STEM_COLORS[s.name] || '#888888',
        volume: 1.0,
        pan: 0,
        muted: false,
        solo: false
      }));

      setStems(stemObjects);
      setCurrentJobId(jobId);
      await loadStemPlayers(stemObjects);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load job');
    } finally {
      setLoadingJob(false);
    }
  };

  const loadStemPlayers = async (stemList: Stem[]) => {
    // Dispose existing players
    playersRef.current.forEach(p => p.dispose());
    gainsRef.current.forEach(g => g.dispose());
    pannersRef.current.forEach(p => p.dispose());
    playersRef.current.clear();
    gainsRef.current.clear();
    pannersRef.current.clear();

    // Create new players for each stem
    for (const stem of stemList) {
      const gain = new Tone.Gain(stem.volume);
      const panner = new Tone.Panner(stem.pan);
      const player = new Tone.Player(stem.url);

      player.chain(gain, panner, Tone.Destination);

      playersRef.current.set(stem.name, player);
      gainsRef.current.set(stem.name, gain);
      pannersRef.current.set(stem.name, panner);
    }

    await Tone.loaded();
  };

  // Handle file upload
  const handleFileUpload = useCallback(async (file: File) => {
    setIsUploading(true);
    setError(null);
    setProgress(0);
    setStatus('Uploading...');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${BACKEND_URL}/jobs`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const data = await response.json();
      setCurrentJobId(data.job_id);
      setIsUploading(false);
      setIsProcessing(true);
      pollJobStatus(data.job_id);
    } catch (err) {
      setError('Failed to upload file');
      setIsUploading(false);
    }
  }, []);

  // Poll job status
  const pollJobStatus = useCallback(async (id: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/jobs/${id}`);
      const data = await response.json();

      setProgress(data.progress);
      setStatus(data.message);

      if (data.status === 'completed') {
        setIsProcessing(false);
        await loadJobById(id);
      } else if (data.status === 'failed') {
        setError(data.error || 'Processing failed');
        setIsProcessing(false);
      } else {
        setTimeout(() => pollJobStatus(id), 1000);
      }
    } catch (err) {
      setError('Failed to check job status');
      setIsProcessing(false);
    }
  }, []);

  // Playback controls
  const handlePlayPause = useCallback(async () => {
    if (stems.length === 0) return;

    await Tone.start();

    if (isPlaying) {
      // Pause all players
      playersRef.current.forEach(player => player.stop());
      setIsPlaying(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      offsetRef.current = currentTime;
    } else {
      // Play all players from current offset
      startTimeRef.current = Tone.now();
      playersRef.current.forEach(player => {
        if (player.loaded) {
          player.start(undefined, offsetRef.current);
        }
      });
      setIsPlaying(true);

      // Update time
      const updateTime = () => {
        const elapsed = Tone.now() - startTimeRef.current + offsetRef.current;
        if (elapsed >= duration) {
          setCurrentTime(0);
          offsetRef.current = 0;
          setIsPlaying(false);
          playersRef.current.forEach(p => p.stop());
          return;
        }
        setCurrentTime(elapsed);
        animationFrameRef.current = requestAnimationFrame(updateTime);
      };
      updateTime();
    }
  }, [isPlaying, stems.length, currentTime, duration]);

  const handleSeek = useCallback((time: number) => {
    setCurrentTime(time);
    offsetRef.current = time;

    if (isPlaying) {
      playersRef.current.forEach(player => {
        player.stop();
        player.start(undefined, time);
      });
      startTimeRef.current = Tone.now();
    }
  }, [isPlaying]);

  // Stem controls
  const updateStemVolume = useCallback((stemName: string, volume: number) => {
    setStems(prev => prev.map(s =>
      s.name === stemName ? { ...s, volume } : s
    ));
    const gain = gainsRef.current.get(stemName);
    if (gain) {
      gain.gain.value = volume;
    }
  }, []);

  const updateStemPan = useCallback((stemName: string, pan: number) => {
    setStems(prev => prev.map(s =>
      s.name === stemName ? { ...s, pan } : s
    ));
    const panner = pannersRef.current.get(stemName);
    if (panner) {
      panner.pan.value = pan;
    }
  }, []);

  const toggleMute = useCallback((stemName: string) => {
    setStems(prev => {
      const newStems = prev.map(s =>
        s.name === stemName ? { ...s, muted: !s.muted } : s
      );
      // Apply mute
      const stem = newStems.find(s => s.name === stemName);
      const gain = gainsRef.current.get(stemName);
      if (gain && stem) {
        gain.gain.value = stem.muted ? 0 : stem.volume;
      }
      return newStems;
    });
  }, []);

  const toggleSolo = useCallback((stemName: string) => {
    setStems(prev => {
      const newStems = prev.map(s =>
        s.name === stemName ? { ...s, solo: !s.solo } : s
      );

      // Check if any stem is soloed
      const anySoloed = newStems.some(s => s.solo);

      // Apply solo logic
      newStems.forEach(stem => {
        const gain = gainsRef.current.get(stem.name);
        if (gain) {
          if (anySoloed) {
            gain.gain.value = stem.solo ? stem.volume : 0;
          } else {
            gain.gain.value = stem.muted ? 0 : stem.volume;
          }
        }
      });

      return newStems;
    });
  }, []);

  // Export remix
  const handleExport = useCallback(async (format: string) => {
    if (!currentJobId) return;

    setIsExporting(true);
    try {
      const settings = {
        vocals: stems.find(s => s.name === 'vocals')?.muted ? 0 : (stems.find(s => s.name === 'vocals')?.volume || 1),
        bass: stems.find(s => s.name === 'bass')?.muted ? 0 : (stems.find(s => s.name === 'bass')?.volume || 1),
        drums: stems.find(s => s.name === 'drums')?.muted ? 0 : (stems.find(s => s.name === 'drums')?.volume || 1),
        other: stems.find(s => s.name === 'other')?.muted ? 0 : (stems.find(s => s.name === 'other')?.volume || 1),
        format
      };

      const response = await fetch(`${BACKEND_URL}/jobs/${currentJobId}/remix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `remix_${currentJobId}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError('Export failed');
    } finally {
      setIsExporting(false);
    }
  }, [currentJobId, stems]);

  // Reset
  const handleReset = useCallback(() => {
    playersRef.current.forEach(p => {
      p.stop();
      p.dispose();
    });
    gainsRef.current.forEach(g => g.dispose());
    pannersRef.current.forEach(p => p.dispose());
    playersRef.current.clear();
    gainsRef.current.clear();
    pannersRef.current.clear();

    setStems([]);
    setCurrentJobId(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setError(null);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      playersRef.current.forEach(p => {
        p.stop();
        p.dispose();
      });
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Breadcrumb
          items={[{ label: 'AudiFX', href: '/', icon: '🎵' }]}
          currentPage="Stem Mixer"
          currentIcon="🎚️"
        />
        <p className={styles.tagline}>Separate and remix individual audio stems</p>
      </header>

      <main className={styles.main}>
        {stems.length === 0 ? (
          <section className={styles.uploadSection}>
            {loadingJob ? (
              <div className={styles.loadingState}>
                <div className={styles.spinner} />
                <p>Loading stems for job {initialJobId}...</p>
              </div>
            ) : error && initialJobId ? (
              <div className={styles.errorState}>
                <p className={styles.errorMessage}>{error}</p>
                <button className={styles.retryButton} onClick={() => loadJobById(initialJobId)}>
                  Retry
                </button>
              </div>
            ) : null}

            {!loadingJob && (
              <div
                className={styles.dropzone}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const file = e.dataTransfer.files[0];
                  if (file) handleFileUpload(file);
                }}
              >
                <input
                  type="file"
                  accept="audio/*"
                  className={styles.fileInput}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                  disabled={isUploading || isProcessing}
                />

                {isUploading || isProcessing ? (
                  <div className={styles.processing}>
                    <div className={styles.spinner} />
                    <p className={styles.processingStatus}>{status}</p>
                    <div className={styles.progressBar}>
                      <div
                        className={styles.progressFill}
                        style={{ width: `${progress * 100}%` }}
                      />
                    </div>
                    <p className={styles.progressText}>{(progress * 100).toFixed(0)}%</p>
                  </div>
                ) : !error ? (
                  <>
                    <div className={styles.dropzoneIcon}>🎚️</div>
                    <p className={styles.dropzoneText}>
                      Drop an audio file to separate into stems
                    </p>
                    <p className={styles.dropzoneHint}>
                      AI will separate vocals, drums, bass, and other instruments
                    </p>
                  </>
                ) : null}
              </div>
            )}

            {error && !initialJobId && (
              <div className={styles.error}>
                <span>⚠️</span> {error}
                <button onClick={() => setError(null)}>Try Again</button>
              </div>
            )}
          </section>
        ) : (
          <section className={styles.mixerSection}>
            {/* Transport Controls */}
            <div className={styles.transport}>
              <button
                className={styles.playButton}
                onClick={handlePlayPause}
              >
                {isPlaying ? '⏸' : '▶️'}
              </button>

              <div className={styles.timeline}>
                <input
                  type="range"
                  min={0}
                  max={duration}
                  step={0.01}
                  value={currentTime}
                  onChange={(e) => handleSeek(parseFloat(e.target.value))}
                  className={styles.seekBar}
                />
                <div className={styles.timeDisplay}>
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              <button className={styles.resetButton} onClick={handleReset}>
                ↻ New File
              </button>
            </div>

            {/* Stem Tracks */}
            <div className={styles.tracks}>
              {stems.map(stem => (
                <div
                  key={stem.name}
                  className={`${styles.track} ${stem.muted ? styles.trackMuted : ''} ${stem.solo ? styles.trackSolo : ''}`}
                >
                  <div className={styles.trackHeader}>
                    <span
                      className={styles.trackColor}
                      style={{ backgroundColor: stem.color }}
                    />
                    <span className={styles.trackIcon}>{STEM_ICONS[stem.name] || '🎵'}</span>
                    <span className={styles.trackName}>{stem.label}</span>
                  </div>

                  <div className={styles.trackControls}>
                    {/* Volume */}
                    <div className={styles.controlGroup}>
                      <label>Vol</label>
                      <input
                        type="range"
                        min={0}
                        max={2}
                        step={0.01}
                        value={stem.volume}
                        onChange={(e) => updateStemVolume(stem.name, parseFloat(e.target.value))}
                        className={styles.volumeSlider}
                      />
                      <span className={styles.controlValue}>{Math.round(stem.volume * 100)}%</span>
                    </div>

                    {/* Pan */}
                    <div className={styles.controlGroup}>
                      <label>Pan</label>
                      <input
                        type="range"
                        min={-1}
                        max={1}
                        step={0.01}
                        value={stem.pan}
                        onChange={(e) => updateStemPan(stem.name, parseFloat(e.target.value))}
                        className={styles.panSlider}
                      />
                      <span className={styles.controlValue}>
                        {stem.pan === 0 ? 'C' : stem.pan < 0 ? `L${Math.round(Math.abs(stem.pan) * 100)}` : `R${Math.round(stem.pan * 100)}`}
                      </span>
                    </div>

                    {/* Solo/Mute */}
                    <div className={styles.trackButtons}>
                      <button
                        className={`${styles.soloButton} ${stem.solo ? styles.active : ''}`}
                        onClick={() => toggleSolo(stem.name)}
                      >
                        S
                      </button>
                      <button
                        className={`${styles.muteButton} ${stem.muted ? styles.active : ''}`}
                        onClick={() => toggleMute(stem.name)}
                      >
                        M
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Export Section */}
            <div className={styles.exportSection}>
              <h3 className={styles.exportTitle}>Export Remix</h3>
              <div className={styles.exportButtons}>
                <button
                  className={styles.exportButton}
                  onClick={() => handleExport('wav')}
                  disabled={isExporting}
                >
                  {isExporting ? 'Exporting...' : '💾 Export WAV'}
                </button>
                <button
                  className={styles.exportButton}
                  onClick={() => handleExport('flac')}
                  disabled={isExporting}
                >
                  {isExporting ? 'Exporting...' : '💾 Export FLAC'}
                </button>
              </div>

              {/* Job ID Display */}
              {currentJobId && (
                <div className={styles.jobIdDisplay}>
                  <span className={styles.jobIdLabel}>Job ID:</span>
                  <code className={styles.jobIdValue}>{currentJobId}</code>
                  <button
                    className={styles.copyButton}
                    onClick={() => navigator.clipboard.writeText(currentJobId)}
                    title="Copy job ID"
                  >
                    📋
                  </button>
                  <a
                    href={`/remix/${currentJobId}`}
                    className={styles.linkButton}
                    title="Shareable link"
                  >
                    🔗
                  </a>
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
