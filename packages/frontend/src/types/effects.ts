import type * as Tone from 'tone';

export type EffectType =
  | 'slowed-reverb'
  | 'nightcore'
  | 'underwater'
  | 'lofi'
  | '8d-audio'
  | 'chopped-screwed'
  | 'vaporwave';

export interface ParameterDefinition {
  id: string;
  name: string;
  min: number;
  max: number;
  default: number;
  step?: number;
  unit?: string;
  curve?: 'linear' | 'exponential' | 'logarithmic';
}

export interface BaseEffectParams {
  bypass: boolean;
}

export interface SlowedReverbParams extends BaseEffectParams {
  speed: number;
  reverbWet: number;
  reverbDecay: number;
}

export interface NightcoreParams extends BaseEffectParams {
  speed: number;
  brightnessBoost: number;
}

export interface UnderwaterParams extends BaseEffectParams {
  cutoffFrequency: number;
  resonance: number;
}

export interface LofiParams extends BaseEffectParams {
  saturation: number;
  noiseLevel: number;
  highCut: number;
  lowCut: number;
}

export interface EightDAudioParams extends BaseEffectParams {
  rotationSpeed: number;
  depth: number;
  reverbMix: number;
}

export interface ChoppedScrewedParams extends BaseEffectParams {
  speed: number;
  chopDensity: number;
  chopLength: number;
  reverbWet: number;
}

export interface VaporwaveParams extends BaseEffectParams {
  speed: number;
  reverbWet: number;
  chorusDepth: number;
  chorusRate: number;
}

export type EffectParams =
  | SlowedReverbParams
  | NightcoreParams
  | UnderwaterParams
  | LofiParams
  | EightDAudioParams
  | ChoppedScrewedParams
  | VaporwaveParams;

export interface EffectChainResult {
  nodes: Tone.ToneAudioNode[];
  input: Tone.ToneAudioNode;
  output: Tone.ToneAudioNode;
  update: (params: Partial<EffectParams>) => void;
  dispose: () => void;
}

export interface EffectModule<T extends BaseEffectParams = BaseEffectParams> {
  id: EffectType;
  name: string;
  description: string;
  icon: string;
  color: string;
  parameters: ParameterDefinition[];
  defaults: T;
  createChain: (params: T) => EffectChainResult;
  configurePlayer?: (player: Tone.Player, params: T) => void;
}

export interface EffectState {
  activeEffect: EffectType | null;
  parameters: Record<string, number>;
  chain: EffectChainResult | null;
}

export type EffectAction =
  | { type: 'SET_EFFECT'; payload: EffectType | null }
  | { type: 'UPDATE_PARAMETER'; payload: { key: string; value: number } }
  | { type: 'SET_CHAIN'; payload: EffectChainResult | null }
  | { type: 'RESET' };

