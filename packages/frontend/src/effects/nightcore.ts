import * as Tone from 'tone';
import type { EffectModule, NightcoreParams, EffectChainResult } from '../types/effects';

export const nightcoreDefaults: NightcoreParams = {
  bypass: false,
  speed: 1.25,
  brightnessBoost: 3,
};

export const nightcoreEffect: EffectModule<NightcoreParams> = {
  id: 'nightcore',
  name: 'Nightcore',
  description: 'High-energy anime-intro style with sped up tempo and brightness boost',
  icon: '⚡',
  color: '#FF6B9D',
  parameters: [
    {
      id: 'speed',
      name: 'Speed',
      min: 1.1,
      max: 1.6,
      default: 1.25,
      step: 0.01,
      unit: 'x',
    },
    {
      id: 'brightnessBoost',
      name: 'Brightness',
      min: -6,
      max: 12,
      default: 3,
      step: 0.5,
      unit: 'dB',
    },
  ],
  defaults: nightcoreDefaults,
  
  createChain(params: NightcoreParams): EffectChainResult {
    const eq = new Tone.EQ3({
      high: params.brightnessBoost,
      mid: 0,
      low: -1,
    });
    
    const nodes = [eq];
    
    return {
      nodes,
      input: eq,
      output: eq,
      update: (newParams: Partial<NightcoreParams>) => {
        if (newParams.brightnessBoost !== undefined) {
          eq.high.value = newParams.brightnessBoost;
        }
      },
      dispose: () => {
        nodes.forEach(node => node.dispose());
      },
    };
  },
  
  configurePlayer(player: Tone.Player, params: NightcoreParams) {
    player.playbackRate = params.speed;
  },
};

