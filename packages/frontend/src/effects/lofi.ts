import * as Tone from 'tone';
import type { EffectModule, LofiParams, EffectChainResult } from '../types/effects';

export const lofiDefaults: LofiParams = {
  bypass: false,
  saturation: 0.3,
  noiseLevel: -25,
  highCut: 4000,
  lowCut: 100,
};

export const lofiEffect: EffectModule<LofiParams> = {
  id: 'lofi',
  name: 'Lo-fi',
  description: 'Vinyl and tape aesthetic with limited frequency range and warm saturation',
  icon: '📻',
  color: '#D4A574',
  parameters: [
    {
      id: 'saturation',
      name: 'Warmth',
      min: 0,
      max: 1,
      default: 0.3,
      step: 0.01,
    },
    {
      id: 'noiseLevel',
      name: 'Noise',
      min: -60,
      max: -10,
      default: -25,
      step: 1,
      unit: 'dB',
    },
    {
      id: 'highCut',
      name: 'High Cut',
      min: 2000,
      max: 8000,
      default: 4000,
      step: 100,
      unit: 'Hz',
    },
    {
      id: 'lowCut',
      name: 'Low Cut',
      min: 50,
      max: 300,
      default: 100,
      step: 10,
      unit: 'Hz',
    },
  ],
  defaults: lofiDefaults,
  
  createChain(params: LofiParams): EffectChainResult {
    // Band-pass filtering
    const highPass = new Tone.Filter({
      type: 'highpass',
      frequency: params.lowCut,
    });
    
    const lowPass = new Tone.Filter({
      type: 'lowpass',
      frequency: params.highCut,
    });
    
    // Saturation via distortion (soft clipping)
    const distortion = new Tone.Distortion({
      distortion: params.saturation,
      wet: 0.5,
    });
    
    // Slight bit crusher for lo-fi texture
    const bitCrusher = new Tone.BitCrusher(12);
    
    // Connect chain
    highPass.connect(lowPass);
    lowPass.connect(distortion);
    distortion.connect(bitCrusher);
    
    const nodes = [highPass, lowPass, distortion, bitCrusher];
    
    return {
      nodes,
      input: highPass,
      output: bitCrusher,
      update: (newParams: Partial<LofiParams>) => {
        if (newParams.saturation !== undefined) {
          distortion.distortion = newParams.saturation;
        }
        if (newParams.highCut !== undefined) {
          lowPass.frequency.value = newParams.highCut;
        }
        if (newParams.lowCut !== undefined) {
          highPass.frequency.value = newParams.lowCut;
        }
      },
      dispose: () => {
        nodes.forEach(node => node.dispose());
      },
    };
  },
};

