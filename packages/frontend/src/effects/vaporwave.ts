import * as Tone from 'tone';
import type { EffectModule, VaporwaveParams, EffectChainResult } from '../types/effects';

export const vaporwaveDefaults: VaporwaveParams = {
  bypass: false,
  speed: 0.85,
  reverbWet: 0.4,
  chorusDepth: 0.5,
  chorusRate: 0.5,
};

export const vaporwaveEffect: EffectModule<VaporwaveParams> = {
  id: 'vaporwave',
  name: 'Vaporwave',
  description: 'Nostalgic, surreal aesthetic with slow playback, heavy reverb, and tape wobble',
  icon: '🌴',
  color: '#FF69B4',
  parameters: [
    {
      id: 'speed',
      name: 'Speed',
      min: 0.75,
      max: 0.95,
      default: 0.85,
      step: 0.01,
      unit: 'x',
    },
    {
      id: 'reverbWet',
      name: 'Reverb',
      min: 0.2,
      max: 0.6,
      default: 0.4,
      step: 0.01,
    },
    {
      id: 'chorusDepth',
      name: 'Wobble',
      min: 0,
      max: 1,
      default: 0.5,
      step: 0.01,
    },
    {
      id: 'chorusRate',
      name: 'Wobble Speed',
      min: 0.1,
      max: 2,
      default: 0.5,
      step: 0.1,
      unit: 'Hz',
    },
  ],
  defaults: vaporwaveDefaults,
  
  createChain(params: VaporwaveParams): EffectChainResult {
    const chorus = new Tone.Chorus({
      frequency: params.chorusRate,
      depth: params.chorusDepth,
      wet: 0.3,
      delayTime: 3.5,
    });
    chorus.start();
    
    const reverb = new Tone.Reverb({
      decay: 5,
      wet: params.reverbWet,
    });
    reverb.generate();
    
    chorus.connect(reverb);
    
    const nodes = [chorus, reverb];
    
    return {
      nodes,
      input: chorus,
      output: reverb,
      update: (newParams: Partial<VaporwaveParams>) => {
        if (newParams.reverbWet !== undefined) {
          reverb.wet.value = newParams.reverbWet;
        }
        if (newParams.chorusDepth !== undefined) {
          chorus.depth = newParams.chorusDepth;
        }
        if (newParams.chorusRate !== undefined) {
          chorus.frequency.value = newParams.chorusRate;
        }
      },
      dispose: () => {
        chorus.stop();
        nodes.forEach(node => node.dispose());
      },
    };
  },
  
  configurePlayer(player: Tone.Player, params: VaporwaveParams) {
    player.playbackRate = params.speed;
  },
};

