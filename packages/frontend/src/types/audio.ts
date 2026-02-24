import type * as Tone from 'tone';

export interface AudioFile {
  name: string;
  size: number;
  type: string;
  duration: number;
  buffer: Tone.ToneAudioBuffer | null;
}

export interface AudioState {
  file: AudioFile | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isLoading: boolean;
  error: string | null;
  isAudioContextStarted: boolean;
}

export type AudioAction =
  | { type: 'LOAD_START'; payload: { name: string; size: number; type: string } }
  | { type: 'LOAD_SUCCESS'; payload: { buffer: Tone.ToneAudioBuffer; duration: number } }
  | { type: 'LOAD_ERROR'; payload: string }
  | { type: 'PLAY' }
  | { type: 'PAUSE' }
  | { type: 'STOP' }
  | { type: 'SEEK'; payload: number }
  | { type: 'SET_VOLUME'; payload: number }
  | { type: 'TIME_UPDATE'; payload: number }
  | { type: 'AUDIO_CONTEXT_STARTED' }
  | { type: 'RESET' };

export const SUPPORTED_FORMATS = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/wave',
  'audio/ogg',
  'audio/flac',
  'audio/aac',
  'audio/m4a',
  'audio/webm',
] as const;

export type SupportedAudioFormat = typeof SUPPORTED_FORMATS[number];

export function isValidAudioFormat(type: string): type is SupportedAudioFormat {
  return SUPPORTED_FORMATS.includes(type as SupportedAudioFormat);
}

