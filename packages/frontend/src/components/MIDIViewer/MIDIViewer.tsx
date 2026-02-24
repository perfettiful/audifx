/**
 * MIDI Viewer Page
 * Integrates upload, visualization, and playback
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { MIDIUploader } from '../MIDIUploader';
import { MIDIVisualizer } from '../MIDIVisualizer';
import { Breadcrumb } from '../Breadcrumb';
import * as Tone from 'tone';
import styles from './MIDIViewer.module.css';

interface Timeline {
  mix: {
    url: string;
    duration: number;
  };
  voices: Array<{
    id: string;
    label: string;
    color: string;
    midiUrl?: string;  // URL to download MIDI file
    notes: Array<{
      time: number;
      duration: number;
      pitch: number;
      velocity: number;
    }>;
  }>;
  sections: Array<{
    t0: number;
    t1: number;
    name: string;
  }>;
  metadata?: any;
}

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

interface MIDIViewerProps {
  onBackToHome?: () => void;
  initialJobId?: string;
}

export function MIDIViewer({ onBackToHome: _onBackToHome, initialJobId }: MIDIViewerProps = {}) {
  const [timeline, setTimeline] = useState<Timeline | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadingJob, setLoadingJob] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentJobId, setCurrentJobId] = useState<string | null>(initialJobId || null);
  const playerRef = useRef<Tone.Player | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number>(0);
  const offsetRef = useRef<number>(0);

  // Load job from URL parameter on mount
  useEffect(() => {
    if (initialJobId && !timeline) {
      loadJobById(initialJobId);
    }
  }, [initialJobId]);

  const loadJobById = async (jobId: string) => {
    setLoadingJob(true);
    setLoadError(null);
    try {
      // Fetch timeline
      const timelineResponse = await fetch(`${BACKEND_URL}/jobs/${jobId}/timeline`);
      if (!timelineResponse.ok) {
        if (timelineResponse.status === 404) {
          throw new Error('Job not found or not yet complete');
        }
        throw new Error('Failed to load job');
      }
      const timelineData = await timelineResponse.json();
      setCurrentJobId(jobId);
      handleTimelineReady(timelineData);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Failed to load job');
    } finally {
      setLoadingJob(false);
    }
  };

  const handleTimelineReady = useCallback((newTimeline: Timeline) => {
    setTimeline(newTimeline);
    setIsLoaded(false);

    // Load audio - handle both old and new URL formats
    let audioPath = newTimeline.mix.url;
    // Fix old format: /jobs/{id}/preprocessed.wav → /jobs/{id}/audio
    if (audioPath.endsWith('/preprocessed.wav')) {
      audioPath = audioPath.replace('/preprocessed.wav', '/audio');
    }
    const audioUrl = `${BACKEND_URL}${audioPath}`;
    console.log('Loading audio from:', audioUrl);

    const player = new Tone.Player(audioUrl, () => {
      console.log('Audio loaded successfully');
      setIsLoaded(true);
    });

    player.toDestination();
    playerRef.current = player;
  }, []);

  const handlePlayPause = useCallback(async () => {
    if (!playerRef.current || !isLoaded) {
      console.log('Player not ready:', { player: !!playerRef.current, isLoaded });
      return;
    }

    await Tone.start();

    if (isPlaying) {
      // Pause: stop playback and save current position
      playerRef.current.stop();
      setIsPlaying(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      // Save the offset for when we resume
      offsetRef.current = currentTime;
    } else {
      // Play: start from current offset
      startTimeRef.current = Tone.now();
      playerRef.current.start(undefined, offsetRef.current);
      setIsPlaying(true);

      // Update current time based on actual elapsed time
      const updateTime = () => {
        if (playerRef.current?.state === 'started') {
          const elapsed = Tone.now() - startTimeRef.current + offsetRef.current;
          setCurrentTime(elapsed);
          animationFrameRef.current = requestAnimationFrame(updateTime);
        } else {
          // Playback ended
          setIsPlaying(false);
          offsetRef.current = 0;
          setCurrentTime(0);
        }
      };
      updateTime();
    }
  }, [isPlaying, isLoaded, currentTime]);

  const handleSeek = useCallback((time: number) => {
    setCurrentTime(time);
    offsetRef.current = time;

    if (playerRef.current && isPlaying) {
      // If playing, restart from new position
      playerRef.current.stop();
      startTimeRef.current = Tone.now();
      playerRef.current.start(undefined, time);
    }
  }, [isPlaying]);

  const handleReset = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.stop();
      playerRef.current.dispose();
    }
    setTimeline(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setCurrentJobId(null);
    setLoadError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (playerRef.current) {
        playerRef.current.stop();
        playerRef.current.dispose();
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Breadcrumb
          items={[{ label: 'AudiFX', href: '/', icon: '🎵' }]}
          currentPage="MIDI Visualizer"
          currentIcon="🎹"
        />
        <p className={styles.tagline}>Transform audio into 3D MIDI visualization</p>
      </header>

      <main className={styles.main}>
        {!timeline ? (
          <section className={styles.uploadSection}>
            {loadingJob ? (
              <div className={styles.loadingState}>
                <div className={styles.spinner} />
                <p>Loading job {initialJobId}...</p>
              </div>
            ) : loadError ? (
              <div className={styles.errorState}>
                <p className={styles.errorMessage}>⚠️ {loadError}</p>
                <p className={styles.errorHint}>Job ID: {initialJobId}</p>
                <button className={styles.retryButton} onClick={() => initialJobId && loadJobById(initialJobId)}>
                  Retry
                </button>
                <MIDIUploader onTimelineReady={handleTimelineReady} onJobCreated={setCurrentJobId} />
              </div>
            ) : (
              <MIDIUploader onTimelineReady={handleTimelineReady} onJobCreated={setCurrentJobId} />
            )}
          </section>
        ) : (
          <section className={styles.viewerSection}>
            {/* Controls */}
            <div className={styles.controls}>
              <button
                className={styles.playButton}
                onClick={handlePlayPause}
                disabled={!isLoaded}
                title={!isLoaded ? 'Loading audio...' : (isPlaying ? 'Pause' : 'Play')}
              >
                {!isLoaded ? '⏳' : (isPlaying ? '⏸' : '▶️')}
              </button>

              <div className={styles.timeline}>
                <input
                  type="range"
                  min={0}
                  max={timeline.mix.duration}
                  step={0.01}
                  value={currentTime}
                  onChange={(e) => handleSeek(parseFloat(e.target.value))}
                  className={styles.seekBar}
                />
                <div className={styles.timeDisplay}>
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(timeline.mix.duration)}</span>
                </div>
              </div>

              <button
                className={styles.resetButton}
                onClick={handleReset}
              >
                ↻ New File
              </button>
            </div>

            {/* Visualizer */}
            <MIDIVisualizer
              timeline={timeline}
              currentTime={currentTime}
              className={styles.visualizer}
            />

            {/* Track Info */}
            <div className={styles.trackInfo}>
              {currentJobId && (
                <div className={styles.jobIdDisplay}>
                  <span className={styles.jobIdLabel}>Job ID:</span>
                  <code className={styles.jobIdValue}>{currentJobId}</code>
                  <button
                    className={styles.copyButton}
                    onClick={() => {
                      navigator.clipboard.writeText(currentJobId);
                    }}
                    title="Copy job ID"
                  >
                    📋
                  </button>
                  <a
                    href={`/visualizer/${currentJobId}`}
                    className={styles.linkButton}
                    title="Shareable link"
                  >
                    🔗
                  </a>
                </div>
              )}
              <h3 className={styles.trackInfoTitle}>Voices</h3>
              <div className={styles.voiceList}>
                {timeline.voices.map(voice => (
                  <div key={voice.id} className={styles.voice}>
                    <div
                      className={styles.voiceColor}
                      style={{ backgroundColor: voice.color }}
                    />
                    <span className={styles.voiceLabel}>{voice.label}</span>
                    <span className={styles.voiceNotes}>
                      {voice.notes.length} notes
                    </span>
                    {voice.midiUrl && (
                      <a
                        href={`${BACKEND_URL}${voice.midiUrl}`}
                        download={`${voice.id}.mid`}
                        className={styles.midiDownload}
                        title={`Download ${voice.label} MIDI`}
                      >
                        ⬇ MIDI
                      </a>
                    )}
                  </div>
                ))}
              </div>

              {/* Download All MIDI button */}
              {timeline.voices.some(v => v.midiUrl) && (
                <div className={styles.downloadAllSection}>
                  <button
                    className={styles.downloadAllButton}
                    onClick={() => {
                      timeline.voices.forEach(voice => {
                        if (voice.midiUrl) {
                          const link = document.createElement('a');
                          link.href = `${BACKEND_URL}${voice.midiUrl}`;
                          link.download = `${voice.id}.mid`;
                          link.click();
                        }
                      });
                    }}
                  >
                    ⬇ Download All MIDI Files
                  </button>
                </div>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
