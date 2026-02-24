# MIDI Visualizer Guide

How to set up and use the 3D MIDI visualizer, which takes audio, splits it into stems, transcribes to MIDI, and renders the result as an interactive Three.js scene.

## Architecture

![Current System Architecture](diagrams/01-current-system.png)

For the full upgrade plan and model details, see [ARCHITECTURE.md](ARCHITECTURE.md).

## Setup

### Backend

```bash
cd packages/backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env      # edit to set DEVICE=cuda or cpu
./start.sh                # runs on http://localhost:8000
```

### Frontend

```bash
cd packages/frontend
npm install
cp .env.example .env      # set VITE_BACKEND_URL=http://localhost:8000
npm run dev               # runs on http://localhost:5173
```

### Using It

1. Open http://localhost:5173
2. Click the MIDI Visualizer button
3. Upload an audio file (MP3, WAV, FLAC, etc.)
4. Wait for processing (progress updates in real time)
5. Explore the 3D visualization

## Timeline JSON

The backend produces a `timeline.json` that the frontend consumes:

```json
{
  "mix": {
    "url": "/jobs/{job_id}/audio",
    "duration": 210.4
  },
  "voices": [
    {
      "id": "vocals",
      "label": "Lead Vocals",
      "color": "#ff4d4d",
      "notes": [
        { "time": 0.5, "duration": 0.8, "pitch": 60, "velocity": 80 }
      ]
    },
    {
      "id": "bass",
      "label": "Bass",
      "color": "#4dd2ff",
      "notes": []
    },
    {
      "id": "drums",
      "label": "Drums",
      "color": "#7dff4d",
      "notes": []
    },
    {
      "id": "other",
      "label": "Piano",
      "color": "#ffb84d",
      "notes": []
    }
  ],
  "sections": [
    { "t0": 0, "t1": 15, "name": "Intro" },
    { "t0": 15, "t1": 45, "name": "Verse" },
    { "t0": 45, "t1": 75, "name": "Chorus" }
  ],
  "metadata": {
    "job_id": "abc-123",
    "total_voices": 4,
    "total_notes": 1523
  }
}
```

## 3D Visualization

### How Notes Are Rendered

The X axis is time (horizontal progression). The Y axis is pitch (vertical, MIDI note number). The Z axis separates different voices/instruments. Box width maps to note duration, height/depth maps to velocity. Each voice gets its own color.

### Controls

**Camera modes**: Orbit lets you freely rotate around the scene. Follow mode tracks the playback position.

**Voice filtering**: View all voices at once or isolate one instrument at a time.

**Playback**: Play/pause, seek bar, time display. Notes light up as they play.

**Visual elements**: A time marker shows the current position. Section markers show song structure (intro, verse, chorus). Voice labels float as 3D sprites.

## Processing Speed

With an RTX 4090 and a 3 minute pop song:

| Stage | Time |
|-------|------|
| Stem separation | 30 to 40s |
| Transcription | 20 to 30s |
| Post processing | 5 to 10s |
| LLM (if enabled) | 5 to 10s |
| Total | ~60 to 90s |

CPU only is 3x to 5x slower.

## API

| Method | Endpoint | What It Does |
|--------|----------|-------------|
| POST | `/jobs` | Upload audio, start processing |
| GET | `/jobs/{id}` | Poll job status |
| GET | `/jobs/{id}/timeline` | Download timeline.json |
| GET | `/jobs/{id}/audio` | Download preprocessed audio |
| GET | `/jobs` | List all jobs |

Example upload:

```bash
curl -X POST -F "file=@song.mp3" http://localhost:8000/jobs
```

Response:

```json
{
  "job_id": "abc-123-def-456",
  "message": "Job created and queued for processing"
}
```

## Frontend Optimization

The Three.js renderer uses instanced rendering for note meshes, frustum culling, LOD for distant objects, and efficient material sharing. On the React side, components are memoized, event handlers use useCallback, and time updates run on requestAnimationFrame.

## Troubleshooting

**CUDA out of memory**: Set `DEVICE=cpu` in `.env` or reduce `MAX_CONCURRENT_JOBS` to 1.

**ffmpeg not found**: Install it. macOS: `brew install ffmpeg`. Ubuntu: `sudo apt-get install ffmpeg`.

**Demucs won't download**: Models download on first use. Make sure you have an internet connection.

**CORS errors**: Check that the backend is running and `VITE_BACKEND_URL` is set correctly in the frontend .env.

**Blank 3D scene**: Check the browser console for WebGL errors. Make sure GPU acceleration is enabled in browser settings.

**Audio won't play**: The browser requires a user click or tap before it allows audio. This is a browser security policy, not a bug.

## What's Next

See the [upgrade plan in ARCHITECTURE.md](ARCHITECTURE.md) for improvements like beat detection, better drum transcription, and multi model transcription.

## Dependencies

**Backend**: FastAPI, Demucs (Meta), BasicPitch (Spotify), llama.cpp (optional), librosa, PyTorch.

**Frontend**: React, Three.js, Tone.js, Vite.
