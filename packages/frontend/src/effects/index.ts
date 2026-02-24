import type { EffectModule, EffectType } from '../types/effects';
import { slowedReverbEffect } from './slowedReverb';
import { nightcoreEffect } from './nightcore';
import { underwaterEffect } from './underwater';
import { lofiEffect } from './lofi';
import { eightDAudioEffect } from './eightD';
import { choppedScrewedEffect } from './choppedScrewed';
import { vaporwaveEffect } from './vaporwave';

export const effectRegistry: Record<EffectType, EffectModule> = {
  'slowed-reverb': slowedReverbEffect,
  'nightcore': nightcoreEffect,
  'underwater': underwaterEffect,
  'lofi': lofiEffect,
  '8d-audio': eightDAudioEffect,
  'chopped-screwed': choppedScrewedEffect,
  'vaporwave': vaporwaveEffect,
};

export const effectList: EffectModule[] = Object.values(effectRegistry);

export function getEffect(id: EffectType): EffectModule | undefined {
  return effectRegistry[id];
}

export * from './slowedReverb';
export * from './nightcore';
export * from './underwater';
export * from './lofi';
export * from './eightD';
export * from './choppedScrewed';
export * from './vaporwave';

