import { useCallback, useState, useRef } from 'react';
import { useAudio } from '../../context/AudioContext';
import { isValidAudioFormat } from '../../types/audio';
import styles from './AudioUploader.module.css';

export function AudioUploader() {
  const { loadFile, startAudioContext, state } = useAudio();
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    await startAudioContext();
    await loadFile(file);
  }, [loadFile, startAudioContext]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    const audioFile = files.find(f => isValidAudioFormat(f.type) || f.name.match(/\.(mp3|wav|ogg|flac|m4a|aac|webm)$/i));
    
    if (audioFile) {
      handleFile(audioFile);
    }
  }, [handleFile]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile]);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={styles.container}>
      <div
        className={`${styles.dropzone} ${isDragging ? styles.dragging : ''} ${state.isLoading ? styles.loading : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        aria-label="Upload audio file"
        onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*,.mp3,.wav,.ogg,.flac,.m4a,.aac,.webm"
          onChange={handleFileChange}
          className={styles.hiddenInput}
        />
        
        <div className={styles.content}>
          <div className={styles.iconContainer}>
            <div className={styles.icon}>
              {state.isLoading ? (
                <div className={styles.spinner} />
              ) : (
                <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M24 4L24 32M24 4L16 12M24 4L32 12"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M8 28V38C8 40.2091 9.79086 42 12 42H36C38.2091 42 40 40.2091 40 38V28"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
          </div>
          
          <div className={styles.text}>
            <h2 className={styles.title}>
              {state.isLoading ? 'Loading...' : 'Drop your audio here'}
            </h2>
            <p className={styles.subtitle}>
              {state.isLoading 
                ? 'Processing your track' 
                : 'or click to browse files'}
            </p>
          </div>
          
          <div className={styles.formats}>
            <span>MP3</span>
            <span>WAV</span>
            <span>OGG</span>
            <span>FLAC</span>
            <span>M4A</span>
          </div>
        </div>
        
        <div className={styles.borderGlow} />
      </div>

      {state.error && (
        <div className={styles.error}>
          <span className={styles.errorIcon}>⚠️</span>
          {state.error}
        </div>
      )}
    </div>
  );
}

