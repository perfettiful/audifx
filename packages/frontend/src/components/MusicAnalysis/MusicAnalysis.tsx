/**
 * Music Analysis Page
 * Comprehensive music statistics with 3D visualizations
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import * as Tone from 'tone';
import { TonnetzTorus } from './TonnetzTorus';
import { PCAVisualization } from './PCAVisualization';
import { FeatureDashboard } from './FeatureDashboard';
import { Breadcrumb } from '../Breadcrumb';
import styles from './MusicAnalysis.module.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

interface MusicAnalysisProps {
  onBackToHome?: () => void;
  initialJobId?: string;
}

type ViewMode = 'dashboard' | 'tonnetz' | 'pca';

export function MusicAnalysis({ onBackToHome: _onBackToHome, initialJobId }: MusicAnalysisProps) {
  const [currentJobId, setCurrentJobId] = useState<string | null>(initialJobId || null);
  const [isUploading, setIsUploading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [loadingJob, setLoadingJob] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [analysisData, setAnalysisData] = useState<any>(null);
  const [timeline, setTimeline] = useState<any>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('dashboard');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isAudioLoaded, setIsAudioLoaded] = useState(false);

  const playerRef = useRef<Tone.Player | null>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number>(0);
  const offsetRef = useRef<number>(0);

  // Load job from URL parameter on mount
  useEffect(() => {
    if (initialJobId && !analysisData) {
      loadJobById(initialJobId);
    }
  }, [initialJobId]);

  const loadJobById = async (jobId: string) => {
    setLoadingJob(true);
    setError(null);
    try {
      setCurrentJobId(jobId);
      await loadAnalysis(jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load job');
    } finally {
      setLoadingJob(false);
    }
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
        setIsAnalyzing(true);
        setStatus('Running analysis...');
        await loadAnalysis(id);
      } else if (data.status === 'failed') {
        setError(data.error || 'Processing failed');
        setIsProcessing(false);
      } else {
        // Continue polling
        setTimeout(() => pollJobStatus(id), 1000);
      }
    } catch (err) {
      setError('Failed to check job status');
      setIsProcessing(false);
    }
  }, []);

  // Load analysis data
  const loadAnalysis = useCallback(async (id: string) => {
    try {
      // Fetch analysis
      const analysisResponse = await fetch(`${BACKEND_URL}/jobs/${id}/analysis`);
      if (!analysisResponse.ok) throw new Error('Analysis failed');
      const analysis = await analysisResponse.json();
      console.log('Analysis data received:', {
        hasData: !!analysis,
        hasTonnetz: !!analysis?.tonnetz,
        hasPca: !!analysis?.pca,
        pcaCoordinates: analysis?.pca?.coordinates?.length || 0,
        tonnetzTrajectory: analysis?.tonnetz?.trajectory?.length || 0
      });
      setAnalysisData(analysis);

      // Fetch timeline for audio playback
      const timelineResponse = await fetch(`${BACKEND_URL}/jobs/${id}/timeline`);
      if (timelineResponse.ok) {
        const timelineData = await timelineResponse.json();
        setTimeline(timelineData);

        // Load audio
        let audioPath = timelineData.mix.url;
        if (audioPath.endsWith('/preprocessed.wav')) {
          audioPath = audioPath.replace('/preprocessed.wav', '/audio');
        }
        const audioUrl = `${BACKEND_URL}${audioPath}`;

        const player = new Tone.Player(audioUrl, () => {
          console.log('Audio loaded');
          setIsAudioLoaded(true);
        });
        player.toDestination();
        playerRef.current = player;
      }

      setIsAnalyzing(false);
      setStatus('Analysis complete');
    } catch (err) {
      setError('Failed to load analysis');
      setIsAnalyzing(false);
    }
  }, []);

  // Playback controls
  const handlePlayPause = useCallback(async () => {
    if (!playerRef.current || !isAudioLoaded) return;

    await Tone.start();

    if (isPlaying) {
      playerRef.current.stop();
      setIsPlaying(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      offsetRef.current = currentTime;
    } else {
      startTimeRef.current = Tone.now();
      playerRef.current.start(undefined, offsetRef.current);
      setIsPlaying(true);

      const updateTime = () => {
        if (playerRef.current?.state === 'started') {
          const elapsed = Tone.now() - startTimeRef.current + offsetRef.current;
          setCurrentTime(elapsed);
          animationFrameRef.current = requestAnimationFrame(updateTime);
        } else {
          setIsPlaying(false);
          offsetRef.current = 0;
          setCurrentTime(0);
        }
      };
      updateTime();
    }
  }, [isPlaying, isAudioLoaded, currentTime]);

  const handleSeek = useCallback((time: number) => {
    setCurrentTime(time);
    offsetRef.current = time;

    if (playerRef.current && isPlaying) {
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
    setCurrentJobId(null);
    setAnalysisData(null);
    setTimeline(null);
    setIsPlaying(false);
    setCurrentTime(0);
    setIsAudioLoaded(false);
    setProgress(0);
    setStatus('');
    setError(null);
    setLoadingJob(false);
  }, []);

  // Cleanup
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

  // Build voice data for visualizations
  const voiceColors: Record<string, string> = {};
  const voiceLabels: Record<string, string> = {};
  if (timeline?.voices) {
    timeline.voices.forEach((v: any) => {
      voiceColors[v.id] = v.color;
      voiceLabels[v.id] = v.label;
    });
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Breadcrumb
          items={[{ label: 'AudiFX', href: '/', icon: '🎵' }]}
          currentPage="Music Analysis"
          currentIcon="📊"
        />
        <p className={styles.tagline}>Statistical analysis with PCA & Tonnetz visualization</p>
      </header>

      <main className={styles.main}>
        {!analysisData ? (
          <section className={styles.uploadSection}>
            {loadingJob ? (
              <div className={styles.loadingState}>
                <div className={styles.spinner} />
                <p>Loading job {initialJobId}...</p>
              </div>
            ) : error && initialJobId ? (
              <div className={styles.errorState}>
                <p className={styles.errorMessage}>⚠️ {error}</p>
                <p className={styles.errorHint}>Job ID: {initialJobId}</p>
                <button className={styles.retryButton} onClick={() => loadJobById(initialJobId)}>
                  Retry
                </button>
                <p className={styles.errorHint} style={{ marginTop: '20px' }}>Or upload a new file:</p>
              </div>
            ) : null}

            {/* Upload Area */}
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
                  disabled={isUploading || isProcessing || isAnalyzing}
                />

                {isUploading || isProcessing || isAnalyzing ? (
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
                    <div className={styles.dropzoneIcon}>🎵</div>
                    <p className={styles.dropzoneText}>
                      Drop an audio file here or click to upload
                    </p>
                    <p className={styles.dropzoneHint}>
                      Supports MP3, WAV, M4A, OGG (max 100MB)
                    </p>
                  </>
                ) : null}
              </div>
            )}

            {error && !initialJobId && (
              <div className={styles.error}>
                <span>⚠️</span> {error}
              </div>
            )}
          </section>
        ) : (
          <section className={styles.analysisSection}>
            {/* Playback Controls */}
            <div className={styles.controls}>
              <button
                className={styles.playButton}
                onClick={handlePlayPause}
                disabled={!isAudioLoaded}
              >
                {!isAudioLoaded ? '⏳' : (isPlaying ? '⏸' : '▶️')}
              </button>

              <div className={styles.timeline}>
                <input
                  type="range"
                  min={0}
                  max={timeline?.mix?.duration || 100}
                  step={0.01}
                  value={currentTime}
                  onChange={(e) => handleSeek(parseFloat(e.target.value))}
                  className={styles.seekBar}
                />
                <div className={styles.timeDisplay}>
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(timeline?.mix?.duration || 0)}</span>
                </div>
              </div>

              <button className={styles.resetButton} onClick={handleReset}>
                ↻ New File
              </button>
            </div>

            {/* View Mode Tabs */}
            <div className={styles.tabs}>
              <button
                className={`${styles.tab} ${viewMode === 'dashboard' ? styles.activeTab : ''}`}
                onClick={() => setViewMode('dashboard')}
              >
                📊 Dashboard
              </button>
              <button
                className={`${styles.tab} ${viewMode === 'tonnetz' ? styles.activeTab : ''}`}
                onClick={() => setViewMode('tonnetz')}
              >
                🍩 Tonnetz Torus
              </button>
              <button
                className={`${styles.tab} ${viewMode === 'pca' ? styles.activeTab : ''}`}
                onClick={() => setViewMode('pca')}
              >
                📈 PCA Space
              </button>
            </div>

            {/* Visualization Area */}
            <div className={styles.visualizationArea}>
              {viewMode === 'dashboard' && analysisData && (
                <FeatureDashboard
                  summary={analysisData.summary}
                  keyInfo={analysisData.key}
                  circleOfFifths={analysisData.circle_of_fifths}
                  histograms={analysisData.features?.combined?.histograms}
                />
              )}

              {viewMode === 'tonnetz' && (
                analysisData?.tonnetz ? (
                  <TonnetzTorus
                    data={analysisData.tonnetz}
                    currentTime={currentTime}
                    isPlaying={isPlaying}
                  />
                ) : (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
                    <p>Tonnetz data not available</p>
                    <p style={{ fontSize: '12px' }}>This may happen if no MIDI notes were detected</p>
                  </div>
                )
              )}

              {viewMode === 'pca' && (
                analysisData?.pca?.coordinates?.length > 0 ? (
                  <PCAVisualization
                    data={{
                      voices: analysisData.pca,
                      trajectory: analysisData.pca_trajectory || { trajectory: [], explained_variance: [] }
                    }}
                    currentTime={currentTime}
                    voiceColors={voiceColors}
                    voiceLabels={voiceLabels}
                  />
                ) : (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#888' }}>
                    <p>PCA data not available</p>
                    <p style={{ fontSize: '12px' }}>PCA requires at least 2 voices with notes</p>
                  </div>
                )
              )}
            </div>

            {/* Key Info Footer */}
            {analysisData?.key && (
              <div className={styles.keyFooter}>
                <span className={styles.keyLabel}>Detected Key:</span>
                <span className={styles.keyValue}>{analysisData.key.full_name}</span>
                <span className={styles.separator}>|</span>
                <span className={styles.keyLabel}>Notes:</span>
                <span className={styles.keyValue}>{analysisData.metadata?.total_notes?.toLocaleString()}</span>
                <span className={styles.separator}>|</span>
                <span className={styles.keyLabel}>Voices:</span>
                <span className={styles.keyValue}>{analysisData.metadata?.total_voices}</span>
              </div>
            )}

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
                  href={`/analysis/${currentJobId}`}
                  className={styles.linkButton}
                  title="Shareable link"
                >
                  🔗
                </a>
              </div>
            )}
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

export default MusicAnalysis;
