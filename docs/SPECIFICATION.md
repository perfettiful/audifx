# AudiFX Audio Effects Specification

How each effect works, what parameters it takes, and how to implement it with Tone.js.

## Stack

| Technology | Role |
|------------|------|
| Web Audio API | Native browser audio processing |
| Tone.js | High level wrapper for effect chains, scheduling, synthesis |
| React 18 | UI |
| TypeScript | Type safety |
| Vite | Build tool |

We use Tone.js because it simplifies node connection and routing, has built in effects (reverb, chorus, delay, EQ), handles scheduling for rhythmic effects, and supports pitch shifting. You could also look at [Howler.js](https://howlerjs.com/) for simpler playback or [Pizzicato.js](https://alemangui.github.io/pizzicato/) for a lightweight pedal style approach.

## Effects

### 1. Slowed + Reverb (Daycore)

Slow the track down and add reverb to create a melancholic, nostalgic atmosphere.

| Parameter | Range | Default | What It Does |
|-----------|-------|---------|-------------|
| speed | 0.7 to 1.0 | 0.85 | Playback rate |
| reverbWet | 0 to 1 | 0.3 | Wet/dry reverb mix |
| reverbDecay | 1 to 10s | 4s | Reverb tail length |
| irType | enum | 'hall' | Which impulse response to use |

```typescript
const player = new Tone.Player(audioUrl);
player.playbackRate = 0.85;

const reverb = new Tone.Reverb({
  decay: 4,
  wet: 0.3,
  preDelay: 0.01
});

player.connect(reverb);
reverb.toDestination();
```

Impulse response options: Large Hall, Cathedral, Plate (synthetic), Spring (lo fi character).

### 2. Nightcore (Sped Up)

Speed up the track for a high energy, anime intro feel. The opposite of daycore.

| Parameter | Range | Default | What It Does |
|-----------|-------|---------|-------------|
| speed | 1.1 to 1.6 | 1.25 | Playback rate |
| brightnessBoost | -6 to +12 dB | +3 dB | High frequency boost |
| boostFrequency | 2000 to 6000 Hz | 3500 Hz | Center frequency for the boost |

```typescript
const player = new Tone.Player(audioUrl);
player.playbackRate = 1.25;

const eq = new Tone.EQ3({
  high: 3,
  mid: 0,
  low: -1
});

player.connect(eq);
eq.toDestination();
```

### 3. Underwater / Muffled

Makes it sound like the music is playing through walls or underwater.

| Parameter | Range | Default | What It Does |
|-----------|-------|---------|-------------|
| cutoffFrequency | 100 to 1500 Hz | 400 Hz | Low pass filter cutoff |
| resonance | 0 to 10 | 2 | Filter Q factor |
| depth | 0 to 1 | 0.5 | How "deep" underwater |

```typescript
const filter = new Tone.Filter({
  type: 'lowpass',
  frequency: 400,
  Q: 2,
  rolloff: -24
});

player.connect(filter);
filter.toDestination();
```

### 4. Lo-fi (Vinyl & Tape)

Limited frequency range, warmth, and noise for that low fidelity feel.

| Parameter | Range | Default | What It Does |
|-----------|-------|---------|-------------|
| saturation | 0 to 1 | 0.3 | Soft clipping amount |
| noiseLevel | -60 to -10 dB | -25 dB | Vinyl crackle volume |
| highCut | 2000 to 8000 Hz | 4000 Hz | High frequency cutoff |
| lowCut | 50 to 300 Hz | 100 Hz | Low frequency cutoff |
| wowFlutter | 0 to 1 | 0.2 | Tape wobble intensity |

```typescript
const highPass = new Tone.Filter({ type: 'highpass', frequency: 100 });
const lowPass = new Tone.Filter({ type: 'lowpass', frequency: 4000 });

const distortion = new Tone.Distortion({
  distortion: 0.3,
  wet: 0.5
});

const noisePlayer = new Tone.Player('vinyl-crackle.mp3');
noisePlayer.loop = true;
noisePlayer.volume.value = -25;

player.chain(highPass, lowPass, distortion, Tone.Destination);
noisePlayer.toDestination();
```

### 5. 8D Audio

Sound appears to rotate around your head. Requires headphones.

| Parameter | Range | Default | What It Does |
|-----------|-------|---------|-------------|
| rotationSpeed | 4 to 20 s | 10 s | Full rotation period |
| depth | 0 to 1 | 0.8 | Pan intensity |
| reverbMix | 0 to 0.5 | 0.15 | Spatial reverb |

```typescript
const panner = new Tone.Panner(0);
const reverb = new Tone.Reverb({ decay: 2, wet: 0.15 });

const lfo = new Tone.LFO({
  frequency: '0.1hz',
  min: -1,
  max: 1
});
lfo.connect(panner.pan);
lfo.start();

player.connect(panner);
panner.connect(reverb);
reverb.toDestination();
```

### 6. Chopped & Screwed

Houston hip hop style. Extreme slow down with stuttering and skipping beats.

| Parameter | Range | Default | What It Does |
|-----------|-------|---------|-------------|
| speed | 0.5 to 0.85 | 0.7 | Playback rate |
| chopDensity | 0 to 1 | 0.3 | How often chops happen |
| chopLength | 0.1 to 0.5 s | 0.25 s | Length of the repeated segment |
| reverbWet | 0 to 0.5 | 0.2 | Reverb mix |

```typescript
const player = new Tone.Player(audioUrl);
player.playbackRate = 0.7;

Tone.Transport.scheduleRepeat((time) => {
  if (Math.random() < 0.3) {
    const currentPos = player.toSeconds(player.state);
    player.seek(currentPos - 0.25, time);
  }
}, '4n');
```

### 7. Vaporwave / Doomerwave

Slowed playback, heavy reverb, wobbly tape effect. Vaporwave is more reverb heavy, Doomerwave keeps the bass cleaner.

**Vaporwave parameters:**

| Parameter | Range | Default | What It Does |
|-----------|-------|---------|-------------|
| speed | 0.75 to 0.95 | 0.85 | Playback rate |
| reverbWet | 0.2 to 0.6 | 0.4 | Reverb amount |
| chorusDepth | 0 to 1 | 0.5 | Tape wobble |
| chorusRate | 0.1 to 2 Hz | 0.5 Hz | Wobble speed |

**Doomerwave** uses less reverb (0.15 to 0.25), slower speed (0.7 to 0.8), and keeps the bass intact.

```typescript
const player = new Tone.Player(audioUrl);
player.playbackRate = 0.85;

const chorus = new Tone.Chorus({
  frequency: 0.5,
  depth: 0.5,
  wet: 0.3
});

const reverb = new Tone.Reverb({
  decay: 5,
  wet: 0.4
});

player.chain(chorus, reverb, Tone.Destination);
chorus.start();
```

## UI

Three views:

**Upload**: Drag and drop zone, file browser, format indicators (MP3, WAV, FLAC, OGG), loading progress.

**Editor**: Waveform visualization, effect selection grid, parameter controls (knobs, sliders, toggles), transport (play, pause, seek, loop), volume.

**Export**: Format selection, quality settings, download button, progress indicator.

Responsive: full editor on desktop, stacked panels on tablet, simplified controls on mobile.

## Things to Watch Out For

**AudioContext**: Browsers block it until the user clicks or taps something. Always create it inside an event handler.

**Safari**: Use `window.AudioContext || window.webkitAudioContext` as a fallback.

**CORS**: Local files work fine. External URLs need `Access-Control-Allow-Origin` headers.

**Performance**: Target 60fps for visualizations. Debounce parameter changes by 16 to 32ms. Use `Tone.Offline` for export rendering. Lazy load impulse responses.

**Memory**: Dispose Tone.js nodes when switching effects. Clear buffers when loading a new file.

## Assets Needed

**Impulse responses** (reverb): Large Hall, Cathedral, Plate, Spring, Room. WAV format, 48kHz, stereo.

**Noise samples**: Vinyl crackle loop (~30s), tape hiss loop (~30s). MP3 or OGG for file size. Make sure the loop points are seamless.

## Testing

**Unit tests**: Effect parameter validation, audio node creation, state management.

**Integration tests**: Full effect chain routing, upload to playback flow, export.

**E2E tests** (Playwright): Upload a file, apply an effect, verify parameter changes, check export output.

**Manual**: Listen to each effect across browsers. Test on mobile (iOS Safari in particular).
