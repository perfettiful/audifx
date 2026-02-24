export interface DemoSample {
  id: string;
  name: string;
  description: string;
  icon: string;
  url: string;
  artist: string;
  license: string;
}

export const demoSamples: DemoSample[] = [
  {
    id: 'lofi-chill',
    name: 'Dreamy Flashback',
    description: 'Soft, nostalgic piano melody',
    icon: '🎹',
    url: '/samples/lofi-chill.mp3',
    artist: 'Kevin MacLeod',
    license: 'CC BY 4.0',
  },
  {
    id: 'jazz-piano',
    name: 'At Rest',
    description: 'Gentle jazz piano piece',
    icon: '🎷',
    url: '/samples/jazz-piano.mp3',
    artist: 'Kevin MacLeod',
    license: 'CC BY 4.0',
  },
  {
    id: 'ambient-drone',
    name: 'Algorithms',
    description: 'Ambient electronic textures',
    icon: '🌌',
    url: '/samples/ambient-drone.mp3',
    artist: 'Chad Crouch',
    license: 'CC BY-NC 4.0',
  },
  {
    id: 'hiphop-beat',
    name: 'Chill Wave',
    description: 'Laid-back beat with bass',
    icon: '🥁',
    url: '/samples/hiphop-beat.mp3',
    artist: 'Kevin MacLeod',
    license: 'CC BY 4.0',
  },
  {
    id: 'electronic-synth',
    name: 'Vibing Over Venus',
    description: 'Retro synth vibes',
    icon: '🚀',
    url: '/samples/electronic-synth.mp3',
    artist: 'Kevin MacLeod',
    license: 'CC BY 4.0',
  },
];

export function getDemoSample(id: string): DemoSample | undefined {
  return demoSamples.find(s => s.id === id);
}
