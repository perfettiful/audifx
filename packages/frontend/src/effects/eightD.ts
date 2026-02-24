import * as Tone from 'tone';
import type { EffectModule, EightDAudioParams, EffectChainResult } from '../types/effects';

export const eightDAudioDefaults: EightDAudioParams = {
  bypass: false,
  rotationSpeed: 10,
  depth: 0.8,
  reverbMix: 0.15,
};

export const eightDAudioEffect: EffectModule<EightDAudioParams> = {
  id: '8d-audio',
  name: '8D Audio',
  description: 'Sound appears to rotate 360° around your head. Requires headphones!',
  icon: '🎧',
  color: '#9B59B6',
  parameters: [
    {
      id: 'rotationSpeed',
      name: 'Rotation',
      min: 4,
      max: 20,
      default: 10,
      step: 0.5,
      unit: 's',
    },
    {
      id: 'depth',
      name: 'Intensity',
      min: 0,
      max: 1,
      default: 0.8,
      step: 0.01,
    },
    {
      id: 'reverbMix',
      name: 'Space',
      min: 0,
      max: 0.5,
      default: 0.15,
      step: 0.01,
    },
  ],
  defaults: eightDAudioDefaults,
  
  createChain(params: EightDAudioParams): EffectChainResult {
    const panner = new Tone.Panner(0);
    
    const reverb = new Tone.Reverb({
      decay: 2,
      wet: params.reverbMix,
    });
    reverb.generate();
    
    // LFO for automatic panning
    const lfoFrequency = 1 / params.rotationSpeed;
    const lfo = new Tone.LFO({
      frequency: lfoFrequency,
      min: -params.depth,
      max: params.depth,
      type: 'sine',
    });
    
    lfo.connect(panner.pan);
    lfo.start();
    
    panner.connect(reverb);
    
    const nodes = [panner, reverb, lfo];
    
    return {
      nodes,
      input: panner,
      output: reverb,
      update: (newParams: Partial<EightDAudioParams>) => {
        if (newParams.rotationSpeed !== undefined) {
          lfo.frequency.value = 1 / newParams.rotationSpeed;
        }
        if (newParams.depth !== undefined) {
          lfo.min = -newParams.depth;
          lfo.max = newParams.depth;
        }
        if (newParams.reverbMix !== undefined) {
          reverb.wet.value = newParams.reverbMix;
        }
      },
      dispose: () => {
        lfo.stop();
        nodes.forEach(node => node.dispose());
      },
    };
  },
};

