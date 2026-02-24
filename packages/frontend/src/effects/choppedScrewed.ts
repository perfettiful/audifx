import * as Tone from 'tone';
import type { EffectModule, ChoppedScrewedParams, EffectChainResult } from '../types/effects';

export const choppedScrewedDefaults: ChoppedScrewedParams = {
  bypass: false,
  speed: 0.7,
  chopDensity: 0.3,
  chopLength: 0.25,
  reverbWet: 0.2,
};

export const choppedScrewedEffect: EffectModule<ChoppedScrewedParams> = {
  id: 'chopped-screwed',
  name: 'Chopped & Screwed',
  description: 'Houston hip-hop style with extreme slow-down and stuttering beats',
  icon: '🔪',
  color: '#8B0000',
  parameters: [
    {
      id: 'speed',
      name: 'Speed',
      min: 0.5,
      max: 0.85,
      default: 0.7,
      step: 0.01,
      unit: 'x',
    },
    {
      id: 'chopDensity',
      name: 'Chop Rate',
      min: 0,
      max: 1,
      default: 0.3,
      step: 0.01,
    },
    {
      id: 'chopLength',
      name: 'Chop Length',
      min: 0.1,
      max: 0.5,
      default: 0.25,
      step: 0.01,
      unit: 's',
    },
    {
      id: 'reverbWet',
      name: 'Reverb',
      min: 0,
      max: 0.5,
      default: 0.2,
      step: 0.01,
    },
  ],
  defaults: choppedScrewedDefaults,
  
  createChain(params: ChoppedScrewedParams): EffectChainResult {
    const reverb = new Tone.Reverb({
      decay: 3,
      wet: params.reverbWet,
    });
    reverb.generate();
    
    // Add some low-end emphasis for that heavy feel
    const eq = new Tone.EQ3({
      low: 2,
      mid: -1,
      high: -2,
    });
    
    eq.connect(reverb);
    
    const nodes = [eq, reverb];
    
    return {
      nodes,
      input: eq,
      output: reverb,
      update: (newParams: Partial<ChoppedScrewedParams>) => {
        if (newParams.reverbWet !== undefined) {
          reverb.wet.value = newParams.reverbWet;
        }
      },
      dispose: () => {
        nodes.forEach(node => node.dispose());
      },
    };
  },
  
  configurePlayer(player: Tone.Player, params: ChoppedScrewedParams) {
    player.playbackRate = params.speed;
  },
};

