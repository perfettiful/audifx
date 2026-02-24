/**
 * MIDI Upload Component
 * Handles file upload to backend and job polling
 */

import { useState, useCallback } from 'react';
import styles from './MIDIUploader.module.css';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

interface JobStatus {
  job_id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  message: string;
  error?: string;
  result?: {
    timeline_url: string;
    duration: number;
    tracks: number;
    total_notes: number;
  };
}

interface Timeline {
  mix: {
    url: string;
    duration: number;
  };
  voices: Array<{
    id: string;
    label: string;
    color: string;
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
  metadata?: {
    job_id: string;
    total_voices: number;
    total_notes: number;
  };
}

interface MIDIUploaderProps {
  onTimelineReady: (timeline: Timeline) => void;
  onJobCreated?: (jobId: string) => void;
  className?: string;
}

export function MIDIUploader({ onTimelineReady, onJobCreated, className }: MIDIUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pollJobStatus = useCallback(async (jobId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/jobs/${jobId}`);
        if (!response.ok) throw new Error('Failed to fetch job status');

        const status: JobStatus = await response.json();
        setJobStatus(status);

        if (status.status === 'completed') {
          clearInterval(pollInterval);
          setProcessing(false);

          // Fetch timeline
          const timelineResponse = await fetch(`${BACKEND_URL}/jobs/${jobId}/timeline`);
          if (!timelineResponse.ok) throw new Error('Failed to fetch timeline');

          const timeline: Timeline = await timelineResponse.json();
          onTimelineReady(timeline);
        } else if (status.status === 'failed') {
          clearInterval(pollInterval);
          setProcessing(false);
          setError(status.error || 'Processing failed');
        }
      } catch (err) {
        clearInterval(pollInterval);
        setProcessing(false);
        setError(err instanceof Error ? err.message : 'Unknown error');
      }
    }, 1000); // Poll every second

    // Cleanup after 10 minutes
    setTimeout(() => clearInterval(pollInterval), 600000);
  }, [onTimelineReady]);

  const handleFileUpload = useCallback(async (file: File) => {
    setError(null);
    setUploading(true);
    setJobStatus(null);

    try {
      // Upload file
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${BACKEND_URL}/jobs`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Upload failed');
      }

      const { job_id } = await response.json();

      setUploading(false);
      setProcessing(true);

      // Notify parent of job creation
      onJobCreated?.(job_id);

      // Start polling
      pollJobStatus(job_id);
    } catch (err) {
      setUploading(false);
      setError(err instanceof Error ? err.message : 'Upload failed');
    }
  }, [pollJobStatus]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('audio/')) {
      handleFileUpload(file);
    } else {
      setError('Please upload an audio file');
    }
  }, [handleFileUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  const isActive = uploading || processing;

  return (
    <div className={`${styles.container} ${className || ''}`}>
      {!isActive && !error && (
        <div
          className={styles.dropzone}
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
        >
          <div className={styles.dropzoneIcon}>🎵</div>
          <h3 className={styles.dropzoneTitle}>Upload Audio for MIDI Analysis</h3>
          <p className={styles.dropzoneDescription}>
            Drag & drop an audio file or click to browse
          </p>
          <input
            type="file"
            accept="audio/*"
            onChange={handleFileSelect}
            className={styles.fileInput}
            id="midi-file-input"
          />
          <label htmlFor="midi-file-input" className={styles.browseButton}>
            Browse Files
          </label>
          <p className={styles.hint}>Supports MP3, WAV, FLAC, and more (max 100MB)</p>
        </div>
      )}

      {uploading && (
        <div className={styles.status}>
          <div className={styles.spinner} />
          <p className={styles.statusText}>Uploading audio file...</p>
        </div>
      )}

      {processing && jobStatus && (
        <div className={styles.status}>
          <div className={styles.progressBar}>
            <div
              className={styles.progressFill}
              style={{ width: `${jobStatus.progress * 100}%` }}
            />
          </div>
          <p className={styles.statusText}>{jobStatus.message}</p>
          <p className={styles.progressText}>
            {Math.round(jobStatus.progress * 100)}%
          </p>

          {jobStatus.status === 'running' && (
            <div className={styles.stages}>
              <div className={`${styles.stage} ${jobStatus.progress >= 0.20 ? styles.stageComplete : ''}`}>
                <span className={styles.stageIcon}>🎼</span>
                <span>Stem Separation</span>
              </div>
              <div className={`${styles.stage} ${jobStatus.progress >= 0.65 ? styles.stageComplete : ''}`}>
                <span className={styles.stageIcon}>🎹</span>
                <span>MIDI Transcription</span>
              </div>
              <div className={`${styles.stage} ${jobStatus.progress >= 0.95 ? styles.stageComplete : ''}`}>
                <span className={styles.stageIcon}>✨</span>
                <span>Finalizing</span>
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className={styles.error}>
          <div className={styles.errorIcon}>⚠️</div>
          <p className={styles.errorText}>{error}</p>
          <button className={styles.retryButton} onClick={() => setError(null)}>
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
