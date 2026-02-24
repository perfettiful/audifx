import { useAudio } from '../../context/AudioContext';
import { formatTime } from '../../utils/timeFormatting';
import styles from './TransportControls.module.css';

export function TransportControls() {
  const { state, play, pause, stop, seek, setVolume } = useAudio();

  const progress = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = (parseFloat(e.target.value) / 100) * state.duration;
    seek(time);
  };

  return (
    <div className={styles.container}>
      {/* File info */}
      {state.file && (
        <div className={styles.fileInfo}>
          <span className={styles.fileName}>{state.file.name}</span>
        </div>
      )}

      {/* Progress bar */}
      <div className={styles.progressContainer}>
        <span className={styles.time}>{formatTime(state.currentTime)}</span>
        <div className={styles.progressWrapper}>
          <input
            type="range"
            min="0"
            max="100"
            step="0.1"
            value={progress}
            onChange={handleSeek}
            className={styles.progressSlider}
            aria-label="Seek position"
          />
          <div className={styles.progressTrack}>
            <div 
              className={styles.progressFill} 
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <span className={styles.time}>{formatTime(state.duration)}</span>
      </div>

      {/* Playback controls */}
      <div className={styles.controls}>
        <div className={styles.mainControls}>
          <button
            className={styles.stopButton}
            onClick={stop}
            aria-label="Stop"
          >
            <svg viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="1" />
            </svg>
          </button>

          <button
            className={styles.playButton}
            onClick={state.isPlaying ? pause : play}
            aria-label={state.isPlaying ? 'Pause' : 'Play'}
          >
            {state.isPlaying ? (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="5" width="4" height="14" rx="1" />
                <rect x="14" y="5" width="4" height="14" rx="1" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5.14v14.72a1 1 0 001.5.86l11-7.36a1 1 0 000-1.72l-11-7.36a1 1 0 00-1.5.86z" />
              </svg>
            )}
          </button>
        </div>

        {/* Volume control */}
        <div className={styles.volumeControl}>
          <button 
            className={styles.volumeButton}
            onClick={() => setVolume(state.volume > 0 ? 0 : 0.8)}
            aria-label={state.volume > 0 ? 'Mute' : 'Unmute'}
          >
            {state.volume === 0 ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <line x1="23" y1="9" x2="17" y2="15" />
                <line x1="17" y1="9" x2="23" y2="15" />
              </svg>
            ) : state.volume < 0.5 ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <path d="M15.54 8.46a5 5 0 010 7.07" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 5L6 9H2v6h4l5 4V5z" />
                <path d="M19.07 4.93a10 10 0 010 14.14M15.54 8.46a5 5 0 010 7.07" />
              </svg>
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={state.volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className={styles.volumeSlider}
            aria-label="Volume"
          />
        </div>
      </div>
    </div>
  );
}

