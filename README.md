# AudiFX

Audio effects processor and MIDI visualizer. Upload a song, apply effects like Slowed + Reverb or Nightcore, or break it down into stems and 3D MIDI visualization.

## What It Does

**Audio Effects**: Drop in an audio file and transform it with browser based effects powered by Tone.js and the Web Audio API.

| Effect | What It Sounds Like |
|--------|-------------------|
| Slowed + Reverb | Dreamy, atmospheric, nostalgic |
| Nightcore | Sped up with pitch shift |
| Lo-fi | Vinyl warmth, tape saturation |
| 8D Audio | Spatial rotation (needs headphones) |
| Vaporwave | Retro chorus and reverb |
| Underwater | Muffled, distant |
| Chopped & Screwed | Houston hip hop slow down |

**MIDI Visualizer**: Upload audio to the backend and it splits it into stems (vocals, bass, drums, other) using Demucs, transcribes each to MIDI with BasicPitch, and renders the result as an interactive 3D scene in Three.js.

Also includes a stem mixer, music analysis (key detection, chords, harmonic structure), and MIDI file export.

## Project Structure

```
audifx/
├── packages/
│   ├── frontend/           # React + Vite + Three.js + Tone.js
│   │   ├── src/
│   │   │   ├── components/ # UI (uploader, effects, visualizer, etc.)
│   │   │   ├── context/    # React Context for audio state
│   │   │   ├── effects/    # Effect module definitions
│   │   │   ├── presets/    # Genre presets (Daycore, Nightcore, etc.)
│   │   │   ├── types/      # TypeScript types
│   │   │   └── utils/      # Helpers
│   │   └── public/samples/ # Demo audio files (CC licensed)
│   │
│   └── backend/            # Python FastAPI
│       ├── app/
│       │   ├── main.py     # API server
│       │   ├── pipeline.py # Processing orchestration
│       │   ├── worker.py   # Background job queue
│       │   ├── models/     # AI models (Demucs, BasicPitch, LLM)
│       │   ├── dsp/        # Preprocessing and note cleanup
│       │   ├── analysis/   # Music analysis (harmony, PCA, Tonnetz)
│       │   └── artifacts/  # File storage
│       └── requirements.txt
│
├── docs/
│   ├── ARCHITECTURE.md     # System design and upgrade plan
│   ├── SPECIFICATION.md    # Effect parameters and implementation
│   └── MIDI_VISUALIZER.md  # Visualizer integration guide
│
└── README.md
```

## Quick Start

### What You Need

Node.js 18+, Python 3.9+, ffmpeg (`brew install ffmpeg` on macOS). A CUDA GPU is optional but makes stem separation much faster.

### Frontend Only (Audio Effects)

```bash
cd packages/frontend
npm install
npm run dev
# opens at http://localhost:5173
```

### Full Stack (with MIDI Visualizer)

```bash
# Terminal 1: backend
cd packages/backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
./start.sh
# API runs at http://localhost:8000

# Terminal 2: frontend
cd packages/frontend
npm install
npm run dev
# App runs at http://localhost:5173
```

## Backend Pipeline

When you upload audio, the backend processes it in stages:

```
Upload audio
  > ffmpeg normalize to 44.1kHz stereo
  > Demucs splits into vocals, bass, drums, other
  > BasicPitch transcribes melodic stems to MIDI
  > Onset detection handles drums
  > Post processing cleans up notes
  > Optional LLM labels and structure detection
  > Outputs timeline.json
```

### API Endpoints

| Method | Endpoint | What It Does |
|--------|----------|-------------|
| POST | `/jobs` | Upload audio, start processing |
| GET | `/jobs/{id}` | Check job status and progress |
| GET | `/jobs/{id}/timeline` | Get the timeline JSON |
| GET | `/jobs/{id}/audio` | Get preprocessed audio |
| GET | `/jobs/{id}/stems` | List separated stems |
| GET | `/jobs/{id}/stems/{name}` | Download a stem |
| GET | `/jobs/{id}/midi` | List MIDI files |
| GET | `/jobs/{id}/midi/{stem}` | Download a MIDI file |
| POST | `/jobs/{id}/remix` | Mix stems with custom volumes |
| GET | `/jobs/{id}/analysis` | Full music analysis |
| GET | `/jobs/{id}/analysis/harmony` | Key, chords, progressions |
| GET | `/jobs` | List all jobs |

Swagger docs are at `http://localhost:8000/docs` when the server is running.

## Frontend

### Audio Signal Flow

AudioFile > Tone.Player > EffectChain (Reverb, Filter, Panner, etc.) > MasterGain > Destination

Each effect in `src/effects/` exports parameter definitions, a `createChain()` factory that builds the Tone.js node graph, and a `dispose()` cleanup function.

### Genre Presets

The presets in `src/presets/` bundle parameter values with cultural context like history, notable artists, listening tips, and related genres. Eight presets: Daycore, Nightcore, Underwater, Lo-fi Vinyl, 8D Audio, Chopped & Screwed, Vaporwave, Doomerwave.

## Configuration

### Frontend (`packages/frontend/.env`)

| Variable | Default | What It Does |
|----------|---------|-------------|
| `VITE_BACKEND_URL` | `http://localhost:8000` | Points to the backend API |

### Backend (`packages/backend/.env`)

| Variable | Default | What It Does |
|----------|---------|-------------|
| `HOST` | `0.0.0.0` | Server host |
| `PORT` | `8000` | Server port |
| `DEVICE` | `cuda` | `cuda` or `cpu` |
| `MAX_CONCURRENT_JOBS` | `1` | How many jobs run at once |
| `ARTIFACTS_DIR` | `./artifacts` | Where job files are stored |
| `MAX_FILE_SIZE_MB` | `100` | Upload size limit |
| `LLM_MODEL_PATH` | (empty) | Path to a GGUF model, optional |

## Dev Commands

```bash
# frontend
cd packages/frontend
npm run dev        # dev server
npm run build      # production build
npm run lint       # eslint
npm run typecheck  # typescript check

# backend
cd packages/backend
source venv/bin/activate
python -m app.main # start server
pytest             # run tests
```

## Processing Speed

For a 3 minute song:

| Hardware | Time |
|----------|------|
| RTX 4090 | ~60 to 90 seconds |
| RTX 3080 | ~90 to 120 seconds |
| CPU only | ~4 to 6 minutes |

## Troubleshooting

**No audio output**: Make sure you've clicked or tapped the page first. Browsers block audio until the user interacts. Check `Tone.context.state` in the console, it should say `"running"`.

**Backend won't start**: Check that ffmpeg is installed (`ffmpeg -version`). Check Python deps are installed (`pip install -r requirements.txt`). For GPU check CUDA (`python -c "import torch; print(torch.cuda.is_available())"`)

**CUDA out of memory**: Set `DEVICE=cpu` in your `.env` file. Or reduce `MAX_CONCURRENT_JOBS` to 1.

**3D Visualizer shows nothing**: Check that your browser supports WebGL. Look at the console for errors.

## Docs

| Document | What It Covers |
|----------|---------------|
| [Architecture](docs/ARCHITECTURE.md) | Current system, upgrade plan, model reference |
| [Specification](docs/SPECIFICATION.md) | Effect parameters and implementation details |
| [MIDI Visualizer](docs/MIDI_VISUALIZER.md) | Visualizer setup, timeline format, Three.js |
| [Backend](packages/backend/README.md) | Backend setup and API examples |

## Tech Stack

| Layer | What |
|-------|------|
| Frontend | React 19, TypeScript, Vite, Tone.js, Three.js |
| Backend | Python 3.9+, FastAPI, PyTorch |
| Models | Demucs (stem separation), BasicPitch (transcription), llama.cpp (optional) |
| Audio | Web Audio API, librosa, soundfile, ffmpeg |

## Credits

[Demucs](https://github.com/facebookresearch/demucs) by Facebook Research.
[BasicPitch](https://github.com/spotify/basic-pitch) by Spotify.
[Tone.js](https://tonejs.github.io/) by Yotam Mann.
[Three.js](https://threejs.org/) by the Three.js authors.

## License

MIT
