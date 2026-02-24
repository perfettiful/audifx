# AudiFX Frontend

React + TypeScript + Vite frontend for audio effects and MIDI visualization.

## Quick Start

```bash
npm install
cp .env.example .env
npm run dev
```

Opens at http://localhost:5173

## What's In Here

**Audio Effects**: Upload an audio file and apply real time effects with Tone.js. Seven effects: Slowed+Reverb, Nightcore, Lo-fi, 8D Audio, Vaporwave, Underwater, Chopped & Screwed. Each has adjustable parameters and genre presets.

**MIDI Visualizer**: Connects to the backend API. Uploads audio for stem separation and MIDI transcription, then renders the result as a 3D scene using Three.js. Includes playback sync, voice filtering, and camera controls.

## Commands

```bash
npm run dev        # development server
npm run build      # production build
npm run preview    # preview the build
npm run lint       # eslint
npm run typecheck  # typescript check
```

## Structure

```
src/
├── components/           # React components
│   ├── AudioUploader/    # File upload
│   ├── EffectPanel/      # Effect controls
│   ├── TransportControls/ # Playback
│   ├── Visualizer/       # Waveform
│   ├── MIDIUploader/     # MIDI analysis upload
│   ├── MIDIVisualizer/   # 3D MIDI rendering
│   └── MIDIViewer/       # MIDI viewer page
├── context/              # React Context providers
├── effects/              # Audio effect modules
├── hooks/                # Custom hooks
├── types/                # TypeScript types
├── utils/                # Utilities
└── styles/               # Global CSS
```

## Environment

| Variable | Default | What It Does |
|----------|---------|-------------|
| `VITE_BACKEND_URL` | `http://localhost:8000` | Backend API URL for the MIDI visualizer |

## Tech

React 19, TypeScript, Vite, Tone.js (Web Audio), Three.js (3D).

## Notes

The AudioContext won't start until the user clicks or taps something. This is a browser security policy.

The MIDI Visualizer needs the backend to be running.

WebGL is required for the 3D scene.

Headphones are recommended for the 8D Audio effect.
