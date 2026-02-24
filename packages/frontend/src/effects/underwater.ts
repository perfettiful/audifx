import * as Tone from 'tone';
import type { EffectModule, UnderwaterParams, EffectChainResult } from '../types/effects';

export const underwaterDefaults: UnderwaterParams = {
  bypass: false,
  cutoffFrequency: 400,
  resonance: 2,
};

export const underwaterEffect: EffectModule<UnderwaterParams> = {
  id: 'underwater',
  name: 'Underwater',
  description: 'Muffled sound like music playing from another room or submerged',
  icon: '🌊',
  color: '#00CED1',
  parameters: [
    {
      id: 'cutoffFrequency',
      name: 'Depth',
      min: 100,
      max: 1500,
      default: 400,
      step: 10,
      unit: 'Hz',
    },
    {
      id: 'resonance',
      name: 'Resonance',
      min: 0,
      max: 10,
      default: 2,
      step: 0.1,
    },
  ],
  defaults: underwaterDefaults,
  
  createChain(params: UnderwaterParams): EffectChainResult {
    const filter = new Tone.Filter({
      type: 'lowpass',
      frequency: params.cutoffFrequency,
      Q: params.resonance,
      rolloff: -24,
    });
    
    const nodes = [filter];
    
    return {
      nodes,
      input: filter,
      output: filter,
      update: (newParams: Partial<UnderwaterParams>) => {
        if (newParams.cutoffFrequency !== undefined) {
          filter.frequency.value = newParams.cutoffFrequency;
        }
        if (newParams.resonance !== undefined) {
          filter.Q.value = newParams.resonance;
        }
      },
      dispose: () => {
        nodes.forEach(node => node.dispose());
      },
    };
  },
};

