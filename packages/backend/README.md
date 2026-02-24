# AudiFX Backend

Python backend that takes audio files, splits them into stems, transcribes each to MIDI, and outputs a timeline JSON for 3D visualization.

## What It Does

1. Separates audio into vocals, bass, drums, and "other" using Demucs (by Meta)
2. Transcribes melodic stems to MIDI notes using BasicPitch (by Spotify)
3. Detects drum hits using onset detection
4. Cleans up notes (removes noise, merges duplicates, limits polyphony)
5. Optionally uses a local LLM to refine labels and detect song structure
6. Outputs a timeline.json that the frontend renders in Three.js

Runs entirely on your machine. No cloud services required. GPU accelerated when CUDA is available.

## Requirements

Python 3.9+, a CUDA GPU (recommended) or CPU, ffmpeg, and at least 8GB RAM (16GB is better).

## Setup

```bash
cd packages/backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# edit .env to set DEVICE=cuda or cpu
```

## Configuration (.env)

```bash
HOST=0.0.0.0
PORT=8000
DEVICE=cuda                # or cpu
MAX_CONCURRENT_JOBS=1
ARTIFACTS_DIR=./artifacts
MAX_FILE_SIZE_MB=100
LLM_MODEL_PATH=            # leave empty to disable, or point to a GGUF file
LLM_USE_GPU=true
```

## Running

```bash
source venv/bin/activate
python -m app.main

# or with uvicorn directly
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Starts at http://localhost:8000

## API

### Upload and Process

```bash
curl -X POST -F "file=@song.mp3" http://localhost:8000/jobs
```

```json
{
  "job_id": "abc-123-def-456",
  "message": "Job created and queued for processing"
}
```

### Check Progress

```bash
curl http://localhost:8000/jobs/abc-123-def-456
```

```json
{
  "job_id": "abc-123-def-456",
  "status": "running",
  "progress": 0.65,
  "message": "Cleaning up notes"
}
```

### Get Results

`GET /jobs/{id}/timeline` for the timeline JSON.
`GET /jobs/{id}/audio` for the preprocessed audio.
`GET /jobs` to list all jobs.

## Timeline Format

```json
{
  "mix": {
    "url": "/jobs/abc-123/audio",
    "duration": 210.4
  },
  "voices": [
    {
      "id": "vocals",
      "label": "Lead Vocals",
      "color": "#ff4d4d",
      "notes": [
        {"time": 0.5, "duration": 0.8, "pitch": 60, "velocity": 80}
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
    {"t0": 0, "t1": 15, "name": "Intro"},
    {"t0": 15, "t1": 45, "name": "Verse"},
    {"t0": 45, "t1": 75, "name": "Chorus"}
  ]
}
```

## Pipeline Stages

**Preprocessing**: Normalizes audio to 44.1kHz stereo, applies EBU R128 loudness normalization, converts to WAV.

**Stem Separation**: Demucs (htdemucs model). GPU accelerated. Outputs vocals, bass, drums, other.

**Transcription**: BasicPitch for melodic stems. Onset detection with spectral classification for drums. Parameters are tuned per voice type.

**Post Processing**: Removes notes shorter than 80ms. Merges adjacent identical notes. Clamps pitch to voice appropriate ranges. Limits polyphony per voice. Optional timing quantization.

**LLM Refinement** (optional): Takes generic labels like "other" and renames them to "Piano" or "Guitar" based on the note content. Detects song structure (verse, chorus, bridge). Uses any llama.cpp compatible GGUF model.

## Speed

With an RTX 4090 and a 3 minute pop song, expect about 60 to 90 seconds total. Breakdown: stem separation 30 to 40s, transcription 20 to 30s, post processing 5 to 10s, LLM 5 to 10s. CPU only is 3x to 5x slower.

## Troubleshooting

**CUDA out of memory**: Set `DEVICE=cpu` in .env. Or reduce `MAX_CONCURRENT_JOBS` to 1. Close other GPU applications.

**ffmpeg not found**: Install it. macOS: `brew install ffmpeg`. Ubuntu: `sudo apt-get install ffmpeg`. Windows: download from https://ffmpeg.org/download.html

**Demucs model won't download**: Models download automatically on first run. Make sure you have internet access.

**LLM not working**: LLM is optional. Leave `LLM_MODEL_PATH` empty if you don't need it. If you do want it, download a GGUF model (like Mistral 7B) and set the path.

## Development

```bash
pip install pytest black ruff
pytest         # run tests
black app/     # format code
ruff check app/  # lint
```

## Credits

[Demucs](https://github.com/facebookresearch/demucs) by Facebook Research.
[BasicPitch](https://github.com/spotify/basic-pitch) by Spotify Research.
[llama.cpp](https://github.com/ggerganov/llama.cpp) by Georgi Gerganov.

## License

MIT
