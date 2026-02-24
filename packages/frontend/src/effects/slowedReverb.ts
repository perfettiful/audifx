import * as Tone from 'tone';
import type { EffectModule, SlowedReverbParams, EffectChainResult } from '../types/effects';

export const slowedReverbDefaults: SlowedReverbParams = {
  bypass: false,
  speed: 0.85,
  reverbWet: 0.3,
  reverbDecay: 4,
};

export const slowedReverbEffect: EffectModule<SlowedReverbParams> = {
  id: 'slowed-reverb',
  name: 'Slowed + Reverb',
  description: 'Melancholic, nostalgic atmosphere with slowed tempo and large room reverb',
  icon: '🌙',
  color: '#6B5B95',
  parameters: [
    {
      id: 'speed',
      name: 'Speed',
      min: 0.7,
      max: 1.0,
      default: 0.85,
      step: 0.01,
      unit: 'x',
    },
    {
      id: 'reverbWet',
      name: 'Reverb Mix',
      min: 0,
      max: 1,
      default: 0.3,
      step: 0.01,
    },
    {
      id: 'reverbDecay',
      name: 'Decay',
      min: 1,
      max: 10,
      default: 4,
      step: 0.1,
      unit: 's',
    },
  ],
  defaults: slowedReverbDefaults,
  
  createChain(params: SlowedReverbParams): EffectChainResult {
    const reverb = new Tone.Reverb({
      decay: params.reverbDecay,
      wet: params.reverbWet,
      preDelay: 0.01,
    });
    
    // Generate reverb impulse response
    reverb.generate();
    
    const nodes = [reverb];
    
    return {
      nodes,
      input: reverb,
      output: reverb,
      update: (newParams: Partial<SlowedReverbParams>) => {
        if (newParams.reverbWet !== undefined) {
          reverb.wet.value = newParams.reverbWet;
        }
        if (newParams.reverbDecay !== undefined) {
          reverb.decay = newParams.reverbDecay;
        }
      },
      dispose: () => {
        nodes.forEach(node => node.dispose());
      },
    };
  },
  
  configurePlayer(player: Tone.Player, params: SlowedReverbParams) {
    player.playbackRate = params.speed;
  },
};

