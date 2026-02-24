import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from 'react';
import * as Tone from 'tone';
import type { AudioState, AudioAction } from '../types/audio';
import type { EffectType, EffectChainResult } from '../types/effects';
import { getEffect } from '../effects';

interface AudioContextValue {
  state: AudioState;
  player: Tone.Player | null;
  loadFile: (file: File) => Promise<void>;
  loadBuffer: (buffer: Tone.ToneAudioBuffer, name: string) => Promise<void>;
  play: () => void;
  pause: () => void;
  stop: () => void;
  seek: (time: number) => void;
  setVolume: (value: number) => void;
  startAudioContext: () => Promise<void>;
  // Effect management
  activeEffect: EffectType | null;
  effectParams: Record<string, number>;
  setEffect: (effectId: EffectType | null) => void;
  updateEffectParam: (key: string, value: number) => void;
}

const AudioContextState = createContext<AudioContextValue | null>(null);

const initialState: AudioState = {
  file: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  isLoading: false,
  error: null,
  isAudioContextStarted: false,
};

function audioReducer(state: AudioState, action: AudioAction): AudioState {
  switch (action.type) {
    case 'LOAD_START':
      return {
        ...state,
        isLoading: true,
        error: null,
        file: {
          name: action.payload.name,
          size: action.payload.size,
          type: action.payload.type,
          duration: 0,
          buffer: null,
        },
      };
    case 'LOAD_SUCCESS':
      return {
        ...state,
        isLoading: false,
        duration: action.payload.duration,
        file: state.file
          ? { ...state.file, buffer: action.payload.buffer, duration: action.payload.duration }
          : null,
      };
    case 'LOAD_ERROR':
      return {
        ...state,
        isLoading: false,
        error: action.payload,
        file: null,
      };
    case 'PLAY':
      return { ...state, isPlaying: true };
    case 'PAUSE':
      return { ...state, isPlaying: false };
    case 'STOP':
      return { ...state, isPlaying: false, currentTime: 0 };
    case 'SEEK':
      return { ...state, currentTime: action.payload };
    case 'SET_VOLUME':
      return { ...state, volume: action.payload };
    case 'TIME_UPDATE':
      return { ...state, currentTime: action.payload };
    case 'AUDIO_CONTEXT_STARTED':
      return { ...state, isAudioContextStarted: true };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

interface AudioProviderProps {
  children: ReactNode;
}

export function AudioProvider({ children }: AudioProviderProps) {
  const [state, dispatch] = useReducer(audioReducer, initialState);
  const playerRef = useRef<Tone.Player | null>(null);
  const gainRef = useRef<Tone.Gain | null>(null);
  const effectChainRef = useRef<EffectChainResult | null>(null);
  const activeEffectRef = useRef<EffectType | null>(null);
  const effectParamsRef = useRef<Record<string, number>>({});
  const animationFrameRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedAtRef = useRef<number>(0);

  // Effect state (using refs to avoid re-renders on every param change)
  const [activeEffect, setActiveEffectState] = React.useState<EffectType | null>(null);
  const [effectParams, setEffectParamsState] = React.useState<Record<string, number>>({});

  const startAudioContext = useCallback(async () => {
    if (Tone.getContext().state !== 'running') {
      await Tone.start();
    }
    dispatch({ type: 'AUDIO_CONTEXT_STARTED' });
  }, []);

  const updateTimeDisplay = useCallback(() => {
    if (playerRef.current && state.isPlaying) {
      const elapsed = (Tone.now() - startTimeRef.current) * (playerRef.current.playbackRate);
      const currentTime = pausedAtRef.current + elapsed;
      
      if (currentTime >= state.duration) {
        dispatch({ type: 'STOP' });
        pausedAtRef.current = 0;
        return;
      }
      
      dispatch({ type: 'TIME_UPDATE', payload: currentTime });
      animationFrameRef.current = requestAnimationFrame(updateTimeDisplay);
    }
  }, [state.isPlaying, state.duration]);

  useEffect(() => {
    if (state.isPlaying) {
      animationFrameRef.current = requestAnimationFrame(updateTimeDisplay);
    } else if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [state.isPlaying, updateTimeDisplay]);

  const setupPlayer = useCallback((buffer: Tone.ToneAudioBuffer) => {
    // Clean up previous player
    if (playerRef.current) {
      playerRef.current.stop();
      playerRef.current.dispose();
    }
    if (gainRef.current) {
      gainRef.current.dispose();
    }
    if (effectChainRef.current) {
      effectChainRef.current.dispose();
      effectChainRef.current = null;
    }

    // Create new player
    const player = new Tone.Player(buffer);
    const gain = new Tone.Gain(state.volume);

    player.connect(gain);
    gain.toDestination();

    playerRef.current = player;
    gainRef.current = gain;
    pausedAtRef.current = 0;

    // Re-apply effect if one was active
    if (activeEffectRef.current) {
      applyEffect(activeEffectRef.current);
    }

    return { player, gain, buffer };
  }, [state.volume]);

  const loadFile = useCallback(async (file: File) => {
    dispatch({
      type: 'LOAD_START',
      payload: { name: file.name, size: file.size, type: file.type },
    });

    try {
      // Ensure audio context is started
      await startAudioContext();

      // Create URL from file
      const url = URL.createObjectURL(file);

      // Load audio buffer
      const buffer = await Tone.Buffer.fromUrl(url);

      // Setup player
      setupPlayer(buffer);

      dispatch({
        type: 'LOAD_SUCCESS',
        payload: { buffer: buffer, duration: buffer.duration },
      });

      // Clean up URL
      URL.revokeObjectURL(url);
    } catch (error) {
      dispatch({
        type: 'LOAD_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to load audio file',
      });
    }
  }, [startAudioContext, setupPlayer]);

  const loadBuffer = useCallback(async (buffer: Tone.ToneAudioBuffer, name: string) => {
    dispatch({
      type: 'LOAD_START',
      payload: { name, size: 0, type: 'audio/generated' },
    });

    try {
      // Ensure audio context is started
      await startAudioContext();

      // Setup player with the provided buffer
      setupPlayer(buffer);

      dispatch({
        type: 'LOAD_SUCCESS',
        payload: { buffer: buffer, duration: buffer.duration },
      });
    } catch (error) {
      dispatch({
        type: 'LOAD_ERROR',
        payload: error instanceof Error ? error.message : 'Failed to load audio buffer',
      });
    }
  }, [startAudioContext, setupPlayer]);

  const applyEffect = useCallback((effectId: EffectType | null) => {
    if (!playerRef.current || !gainRef.current) return;

    // Disconnect player from current chain
    playerRef.current.disconnect();

    // Dispose previous effect chain
    if (effectChainRef.current) {
      effectChainRef.current.dispose();
      effectChainRef.current = null;
    }

    if (!effectId) {
      // No effect - direct connection
      playerRef.current.connect(gainRef.current);
      playerRef.current.playbackRate = 1;
      return;
    }

    const effectModule = getEffect(effectId);
    if (!effectModule) {
      playerRef.current.connect(gainRef.current);
      return;
    }

    // Create effect chain with current params or defaults
    const params = Object.keys(effectParamsRef.current).length > 0
      ? { ...effectModule.defaults, ...effectParamsRef.current }
      : effectModule.defaults;

    const chain = effectModule.createChain(params as any);
    effectChainRef.current = chain;

    // Connect: Player -> Effect Input -> Effect Output -> Gain -> Destination
    playerRef.current.connect(chain.input);
    chain.output.connect(gainRef.current);

    // Configure player (playback rate, etc.)
    if (effectModule.configurePlayer) {
      effectModule.configurePlayer(playerRef.current, params as any);
    }
  }, []);

  const setEffect = useCallback((effectId: EffectType | null) => {
    activeEffectRef.current = effectId;
    setActiveEffectState(effectId);

    if (effectId) {
      const effectModule = getEffect(effectId);
      if (effectModule) {
        const defaultParams: Record<string, number> = {};
        effectModule.parameters.forEach(p => {
          defaultParams[p.id] = p.default;
        });
        effectParamsRef.current = defaultParams;
        setEffectParamsState(defaultParams);
      }
    } else {
      effectParamsRef.current = {};
      setEffectParamsState({});
    }

    applyEffect(effectId);
  }, [applyEffect]);

  const updateEffectParam = useCallback((key: string, value: number) => {
    effectParamsRef.current = { ...effectParamsRef.current, [key]: value };
    setEffectParamsState(prev => ({ ...prev, [key]: value }));

    // Update the effect chain if it exists
    if (effectChainRef.current) {
      effectChainRef.current.update({ [key]: value });
    }

    // Handle speed changes that affect the player
    if (key === 'speed' && playerRef.current && activeEffectRef.current) {
      const effectModule = getEffect(activeEffectRef.current);
      if (effectModule?.configurePlayer) {
        effectModule.configurePlayer(playerRef.current, {
          ...effectParamsRef.current,
          bypass: false,
        } as any);
      }
    }
  }, []);

  const play = useCallback(() => {
    if (playerRef.current && state.file?.buffer) {
      startTimeRef.current = Tone.now();
      playerRef.current.start(undefined, pausedAtRef.current);
      dispatch({ type: 'PLAY' });
    }
  }, [state.file]);

  const pause = useCallback(() => {
    if (playerRef.current && state.isPlaying) {
      const elapsed = (Tone.now() - startTimeRef.current) * (playerRef.current.playbackRate);
      pausedAtRef.current += elapsed;
      playerRef.current.stop();
      dispatch({ type: 'PAUSE' });
    }
  }, [state.isPlaying]);

  const stop = useCallback(() => {
    if (playerRef.current) {
      playerRef.current.stop();
      pausedAtRef.current = 0;
      dispatch({ type: 'STOP' });
    }
  }, []);

  const seek = useCallback((time: number) => {
    pausedAtRef.current = time;
    dispatch({ type: 'SEEK', payload: time });
    
    if (state.isPlaying && playerRef.current) {
      playerRef.current.stop();
      startTimeRef.current = Tone.now();
      playerRef.current.start(undefined, time);
    }
  }, [state.isPlaying]);

  const setVolume = useCallback((value: number) => {
    dispatch({ type: 'SET_VOLUME', payload: value });
    if (gainRef.current) {
      gainRef.current.gain.value = value;
    }
  }, []);

  const value: AudioContextValue = {
    state,
    player: playerRef.current,
    loadFile,
    loadBuffer,
    play,
    pause,
    stop,
    seek,
    setVolume,
    startAudioContext,
    activeEffect,
    effectParams,
    setEffect,
    updateEffectParam,
  };

  return (
    <AudioContextState.Provider value={value}>
      {children}
    </AudioContextState.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContextState);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}

// Need to import React for useState
import * as React from 'react';
