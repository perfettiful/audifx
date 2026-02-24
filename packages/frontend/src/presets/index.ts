import type { EffectType } from '../types/effects';

export interface GenrePreset {
  id: string;
  name: string;
  subtitle: string;
  icon: string;
  color: string;
  gradientFrom: string;
  gradientTo: string;
  effectId: EffectType;
  parameters: Record<string, number>;
  // Genre information
  description: string;
  history: string;
  characteristics: string[];
  notableArtists: string[];
  listensWith: string; // What to listen for
  tips: string[];
  relatedGenres: string[];
  era: string;
  origin: string;
}

export const genrePresets: GenrePreset[] = [
  {
    id: 'daycore',
    name: 'Daycore',
    subtitle: 'Slowed + Reverb',
    icon: '🌙',
    color: '#6B5B95',
    gradientFrom: '#1a0a20',
    gradientTo: '#2d1b4e',
    effectId: 'slowed-reverb',
    parameters: {
      speed: 0.85,
      reverbWet: 0.35,
      reverbDecay: 4.5,
    },
    description: 'A melancholic, dreamlike transformation that slows music to create an ethereal, nostalgic atmosphere. The added reverb creates a sense of vast, empty space.',
    history: 'Daycore emerged from internet music culture in the early 2010s, inspired by the Chopped & Screwed movement from Houston. It gained massive popularity on YouTube and SoundCloud, where creators would upload slowed versions of popular songs. The term "Daycore" is sometimes used interchangeably with "Slowed + Reverb" though purists note subtle differences.',
    characteristics: [
      'Tempo reduced to 80-90% of original speed',
      'Heavy room or hall reverb for spacious feel',
      'Lowered pitch creates deeper, more emotional vocals',
      'Dreamlike, almost underwater quality',
      'Enhanced bass presence from the slowdown',
    ],
    notableArtists: ['Slater', 'DJ Smokey', 'Various YouTube channels'],
    listensWith: 'Best experienced with headphones in a dark room. Perfect for late-night introspection, studying, or winding down.',
    tips: [
      'Works especially well with R&B, hip-hop, and emotional pop',
      'The reverb "wetness" is key - too much and it becomes muddy',
      'Speed around 0.85x is the sweet spot for most tracks',
    ],
    relatedGenres: ['Chopped & Screwed', 'Vaporwave', 'Lo-fi'],
    era: '2010s - Present',
    origin: 'Internet / YouTube',
  },
  {
    id: 'nightcore',
    name: 'Nightcore',
    subtitle: 'Sped Up + Bright',
    icon: '⚡',
    color: '#FF6B9D',
    gradientFrom: '#1a0a15',
    gradientTo: '#4a1a35',
    effectId: 'nightcore',
    parameters: {
      speed: 1.25,
      brightnessBoost: 4,
    },
    description: 'High-energy, anime-inspired style that speeds up music to create an uplifting, euphoric sound. Vocals become higher-pitched and more "cute" sounding.',
    history: 'Nightcore originated in Norway around 2002, created by Thomas S. Nilsen and Steffen Ojala Søderholm who released pitch-shifted versions of trance and eurodance songs. The name comes from their DJ duo. It exploded on YouTube in the late 2000s, often paired with anime artwork, becoming synonymous with anime music culture.',
    characteristics: [
      'Tempo increased to 120-150% of original speed',
      'Higher-pitched vocals with "chipmunk" quality',
      'Enhanced high frequencies for brightness',
      'Energetic, dance-friendly feel',
      'Often associated with anime aesthetics',
    ],
    notableArtists: ['Nightcore (original duo)', 'TheFatRat', 'Various YouTube creators'],
    listensWith: 'Best for workouts, gaming sessions, or when you need an energy boost. Popular in the anime and gaming communities.',
    tips: [
      'Works great with EDM, pop, and already upbeat tracks',
      'A slight high-frequency boost prevents muddiness',
      'Speed between 1.2x-1.3x is usually ideal',
    ],
    relatedGenres: ['Eurodance', 'Happy Hardcore', 'Trance'],
    era: '2002 - Present',
    origin: 'Norway',
  },
  {
    id: 'underwater',
    name: 'Underwater',
    subtitle: 'Muffled & Distant',
    icon: '🌊',
    color: '#00CED1',
    gradientFrom: '#0a1520',
    gradientTo: '#1a3a4a',
    effectId: 'underwater',
    parameters: {
      cutoffFrequency: 350,
      resonance: 2.5,
    },
    description: 'Creates the illusion of hearing music through walls, underwater, or from a distant room. A dreamy, muffled quality that evokes memory and distance.',
    history: 'The underwater/muffled effect has roots in film sound design where it\'s used to convey POV changes, dream sequences, or emotional distance. In music production, it became popular in ambient and experimental genres, and later found its way into internet remix culture.',
    characteristics: [
      'Heavy low-pass filtering removes high frequencies',
      'Creates "through the wall" or submerged sensation',
      'Emphasizes bass and low-mid frequencies',
      'Slight resonance at cutoff adds character',
      'Evokes nostalgia and emotional distance',
    ],
    notableArtists: ['Boards of Canada', 'Burial', 'Ambient producers'],
    listensWith: 'Perfect for creating atmosphere, studying, or when you want music to feel like a distant memory.',
    tips: [
      'Cutoff around 300-500Hz gives the classic muffled sound',
      'Adding slight resonance makes it more interesting',
      'Works with any genre but especially evocative with vocals',
    ],
    relatedGenres: ['Ambient', 'Lo-fi', 'Experimental'],
    era: 'Timeless',
    origin: 'Film Sound Design',
  },
  {
    id: 'lofi-vinyl',
    name: 'Lo-fi Vinyl',
    subtitle: 'Warm & Nostalgic',
    icon: '📻',
    color: '#D4A574',
    gradientFrom: '#1a1510',
    gradientTo: '#3a2a1a',
    effectId: 'lofi',
    parameters: {
      saturation: 0.35,
      noiseLevel: -22,
      highCut: 3500,
      lowCut: 120,
    },
    description: 'Recreates the warm, imperfect sound of vinyl records and tape machines. Limited frequency range, gentle saturation, and subtle noise create an intimate, nostalgic feel.',
    history: 'Lo-fi (low fidelity) as an aesthetic emerged in the 1980s-90s indie and hip-hop scenes. Artists like J Dilla and Nujabes pioneered the "lo-fi hip-hop" sound. The 2010s saw it explode via YouTube "beats to study/relax to" streams, becoming the soundtrack of a generation.',
    characteristics: [
      'Rolled-off high and low frequencies (bandwidth limiting)',
      'Warm tape/tube saturation adds harmonics',
      'Vinyl crackle and tape hiss in the background',
      'Slightly "crushed" dynamic range',
      'Cozy, intimate, bedroom-studio aesthetic',
    ],
    notableArtists: ['J Dilla', 'Nujabes', 'Tomppabeats', 'Jinsang', 'Idealism'],
    listensWith: 'The quintessential study/work background music. Best enjoyed with coffee, rain sounds optional.',
    tips: [
      'Don\'t overdo the noise - it should be subtle',
      'The saturation adds warmth without distortion',
      'Cutting above 4kHz removes digital harshness',
    ],
    relatedGenres: ['Lo-fi Hip-hop', 'Chillhop', 'Jazz Hop'],
    era: '1990s - Present',
    origin: 'Underground Hip-hop',
  },
  {
    id: '8d-audio',
    name: '8D Audio',
    subtitle: '360° Spatial Sound',
    icon: '🎧',
    color: '#9B59B6',
    gradientFrom: '#150a20',
    gradientTo: '#2a1a45',
    effectId: '8d-audio',
    parameters: {
      rotationSpeed: 10,
      depth: 0.85,
      reverbMix: 0.18,
    },
    description: 'Creates the illusion of sound rotating around your head in 3D space. A psychoacoustic trick that requires headphones to experience properly.',
    history: '8D Audio became a viral phenomenon around 2018-2019 on YouTube. Despite the "8D" name (implying 8 dimensions), it\'s actually a stereo panning technique combined with reverb. The effect exploits how our brains perceive spatial audio through headphones.',
    characteristics: [
      'Sound appears to circle around your head',
      'Automated stereo panning creates movement',
      'Reverb adds spatial depth and distance',
      'Requires headphones for full effect',
      'Creates an immersive, almost ASMR-like experience',
    ],
    notableArtists: ['8D Tunes', '8D Era', 'Various YouTube channels'],
    listensWith: 'HEADPHONES REQUIRED! Best experienced lying down with eyes closed for full immersion.',
    tips: [
      'Rotation speed of 8-12 seconds feels natural',
      'Light reverb helps sell the spatial illusion',
      'Works best with songs that have clear vocals/lead elements',
    ],
    relatedGenres: ['Binaural Audio', 'ASMR', 'Spatial Audio'],
    era: '2018 - Present',
    origin: 'Internet / YouTube',
  },
  {
    id: 'chopped-screwed',
    name: 'Chopped & Screwed',
    subtitle: 'Houston Classic',
    icon: '🔪',
    color: '#8B0000',
    gradientFrom: '#1a0a0a',
    gradientTo: '#3a1515',
    effectId: 'chopped-screwed',
    parameters: {
      speed: 0.68,
      chopDensity: 0.35,
      chopLength: 0.28,
      reverbWet: 0.22,
    },
    description: 'The original slow-down technique from Houston hip-hop. Features extreme tempo reduction, record scratching effects, and stuttering "chops" that skip beats.',
    history: 'Invented by DJ Screw (Robert Earl Davis Jr.) in Houston, Texas in the early 1990s. Screw would slow down tracks to 60-70% speed and add "chops" - repeated segments that create a hypnotic, syrupy feel. The style became the soundtrack of Houston\'s hip-hop scene and influenced countless genres.',
    characteristics: [
      'Extreme slowdown (60-80% of original tempo)',
      'Stuttering "chops" - repeated/skipped segments',
      'Heavy, syrupy, hypnotic feel',
      'Enhanced bass from the slowdown',
      'Often with subtle reverb or delay',
    ],
    notableArtists: ['DJ Screw', 'Swishahouse', 'Michael "5000" Watts', 'OG Ron C'],
    listensWith: 'Best for cruising, late nights, or vibing. The genre that started it all for slowed music.',
    tips: [
      'Slower than typical "Slowed + Reverb" (around 0.65-0.75x)',
      'The "chops" are what distinguish it from Daycore',
      'Works especially well with Southern hip-hop',
    ],
    relatedGenres: ['Daycore', 'Houston Rap', 'Phonk'],
    era: '1990s - Present',
    origin: 'Houston, Texas',
  },
  {
    id: 'vaporwave',
    name: 'Vaporwave',
    subtitle: 'A E S T H E T I C',
    icon: '🌴',
    color: '#FF69B4',
    gradientFrom: '#1a0a1a',
    gradientTo: '#2a1a3a',
    effectId: 'vaporwave',
    parameters: {
      speed: 0.82,
      reverbWet: 0.45,
      chorusDepth: 0.55,
      chorusRate: 0.4,
    },
    description: 'A surreal, nostalgic aesthetic that samples 80s/90s corporate music, smooth jazz, and elevator music. Slowed, drowned in reverb, with wobbly tape effects.',
    history: 'Vaporwave emerged around 2010-2011 as both a music genre and visual art movement. Pioneered by artists like Macintosh Plus (Vektroid) and James Ferraro, it critiques/celebrates consumer capitalism through distorted 80s/90s media. The iconic "Floral Shoppe" album defined the sound.',
    characteristics: [
      'Slowed to 80-90% tempo',
      'Heavy reverb creates dreamlike atmosphere',
      'Chorus/wobble mimics degraded VHS tapes',
      'Often samples 80s/90s corporate/mall music',
      'Surreal, nostalgic, sometimes ironic tone',
    ],
    notableArtists: ['Macintosh Plus', 'Blank Banshee', 'Saint Pepsi', '2814', 'Luxury Elite'],
    listensWith: 'Best paired with retro visuals, neon aesthetics, and a sense of ironic nostalgia for an era you may not have lived through.',
    tips: [
      'The chorus "wobble" is essential for that VHS degradation feel',
      'More reverb than typical Daycore - embrace the wash',
      'Works best with smooth, corporate-sounding source material',
    ],
    relatedGenres: ['Future Funk', 'Synthwave', 'Mallsoft', 'Daycore'],
    era: '2010 - Present',
    origin: 'Internet',
  },
  {
    id: 'doomerwave',
    name: 'Doomerwave',
    subtitle: 'Post-Punk Melancholy',
    icon: '🖤',
    color: '#4a4a5a',
    gradientFrom: '#0a0a0f',
    gradientTo: '#1a1a25',
    effectId: 'slowed-reverb',
    parameters: {
      speed: 0.78,
      reverbWet: 0.2,
      reverbDecay: 3,
    },
    description: 'A darker variant of Vaporwave applied to post-punk and Russian rock. Less reverb than Vaporwave to keep the driving basslines intact.',
    history: 'Doomerwave emerged from the "Doomer" meme culture around 2018-2019. It combines the slowed aesthetic with post-punk, darkwave, and Russian rock, reflecting themes of existential melancholy. Often features the iconic "Doomer" character in visuals.',
    characteristics: [
      'Slowed more than Vaporwave (75-80% speed)',
      'Less reverb to preserve bass clarity',
      'Dark, melancholic, existential atmosphere',
      'Often uses post-punk or Russian rock sources',
      'Driving basslines remain prominent',
    ],
    notableArtists: ['Molchat Doma (common source)', 'Soviet Soviet', 'Kino'],
    listensWith: 'For late-night walks, rainy days, and moments of beautiful melancholy. The sound of Eastern European apartments at 3am.',
    tips: [
      'Keep reverb lower than Vaporwave to preserve the bass',
      'Speed around 0.75-0.8x works well',
      'Post-punk and darkwave sources work best',
    ],
    relatedGenres: ['Vaporwave', 'Post-Punk', 'Darkwave', 'Russian Rock'],
    era: '2018 - Present',
    origin: 'Internet / Eastern Europe',
  },
];

export function getPreset(id: string): GenrePreset | undefined {
  return genrePresets.find(p => p.id === id);
}

export function getPresetsByEffect(effectId: EffectType): GenrePreset[] {
  return genrePresets.filter(p => p.effectId === effectId);
}

