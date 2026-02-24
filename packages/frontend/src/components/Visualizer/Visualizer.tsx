import { useRef, useEffect, useCallback } from 'react';
import * as Tone from 'tone';
import { useAudio } from '../../context/AudioContext';
import styles from './Visualizer.module.css';

export function Visualizer() {
  const { state, activeEffect } = useAudio();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);
  const analyzerRef = useRef<Tone.Analyser | null>(null);

  useEffect(() => {
    // Create analyzer
    if (!analyzerRef.current) {
      analyzerRef.current = new Tone.Analyser('waveform', 256);
      Tone.getDestination().connect(analyzerRef.current);
    }

    return () => {
      if (analyzerRef.current) {
        analyzerRef.current.dispose();
        analyzerRef.current = null;
      }
    };
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const analyzer = analyzerRef.current;
    if (!canvas || !analyzer) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get canvas dimensions
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Get waveform data
    const waveform = analyzer.getValue() as Float32Array;

    // Create gradient based on active effect
    const gradient = ctx.createLinearGradient(0, 0, width, 0);
    if (activeEffect) {
      gradient.addColorStop(0, 'rgba(255, 51, 102, 0.8)');
      gradient.addColorStop(0.5, 'rgba(124, 58, 237, 0.8)');
      gradient.addColorStop(1, 'rgba(0, 255, 204, 0.8)');
    } else {
      gradient.addColorStop(0, 'rgba(160, 160, 176, 0.5)');
      gradient.addColorStop(1, 'rgba(160, 160, 176, 0.5)');
    }

    // Draw waveform
    ctx.beginPath();
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    const sliceWidth = width / waveform.length;
    let x = 0;

    for (let i = 0; i < waveform.length; i++) {
      const v = (waveform[i] + 1) / 2;
      const y = v * height;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.stroke();

    // Add glow effect when playing
    if (state.isPlaying) {
      ctx.shadowColor = activeEffect ? 'rgba(255, 51, 102, 0.5)' : 'rgba(160, 160, 176, 0.3)';
      ctx.shadowBlur = 15;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    animationRef.current = requestAnimationFrame(draw);
  }, [state.isPlaying, activeEffect]);

  useEffect(() => {
    animationRef.current = requestAnimationFrame(draw);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [draw]);

  return (
    <div className={styles.container}>
      <canvas ref={canvasRef} className={styles.canvas} />
      <div className={styles.overlay} />
    </div>
  );
}

