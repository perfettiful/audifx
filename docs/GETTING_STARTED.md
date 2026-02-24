# Getting Started with AudiFX

How to set up and run AudiFX locally.

## Prerequisites

You need these installed:

### Required
- **Node.js** 18 or higher ([Download](https://nodejs.org/))
- **npm** (comes with Node.js)
- **Python** 3.9 or higher ([Download](https://python.org/))
- **ffmpeg** ([Installation Guide](#installing-ffmpeg))

### Optional (for GPU Acceleration)
- **NVIDIA GPU** with CUDA support
- **CUDA Toolkit** 11.8 or higher

## Installing ffmpeg

ffmpeg is required for audio preprocessing in the backend.

### macOS (Homebrew)
```bash
brew install ffmpeg
```

### Ubuntu/Debian
```bash
sudo apt-get update
sudo apt-get install ffmpeg
```

### Windows
1. Download from [ffmpeg.org](https://ffmpeg.org/download.html)
2. Extract to a folder (e.g., `C:\ffmpeg`)
3. Add to PATH: `C:\ffmpeg\bin`

### Verify Installation
```bash
ffmpeg -version
```

## Project Setup

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/audifx.git
cd audifx
```

### 2. Frontend Setup

```bash
# Navigate to frontend
cd packages/frontend

# Install dependencies
npm install

# Create environment file
cp .env.example .env

# Start development server
npm run dev
```

The frontend will be available at `http://localhost:5173`

### 3. Backend Setup (for MIDI Visualizer)

```bash
# Navigate to backend
cd packages/backend

# Create Python virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create environment file
cp .env.example .env

# Start the server
./start.sh
# Or: python -m app.main
```

The backend API will be available at `http://localhost:8000`

## Configuration

### Frontend Configuration

Edit `packages/frontend/.env`:

```env
# Backend API URL (only needed for MIDI Visualizer)
VITE_BACKEND_URL=http://localhost:8000
```

### Backend Configuration

Edit `packages/backend/.env`:

```env
# Server settings
HOST=0.0.0.0
PORT=8000

# Processing device (cuda for GPU, cpu for CPU-only)
DEVICE=cuda

# Maximum concurrent processing jobs
MAX_CONCURRENT_JOBS=1

# Storage directory for job artifacts
ARTIFACTS_DIR=./artifacts

# Maximum upload file size in MB
MAX_FILE_SIZE_MB=100

# Optional: Path to GGUF model for LLM label refinement
LLM_MODEL_PATH=
```

## Running the Application

### Audio Effects Only (Frontend)

If you only want to use the audio effects processor:

```bash
cd packages/frontend
npm run dev
```

Open `http://localhost:5173`.

### Full Application (with MIDI Visualizer)

To run both frontend and backend (needed for the MIDI visualizer):

**Terminal 1 - Backend:**
```bash
cd packages/backend
source venv/bin/activate  # or venv\Scripts\activate on Windows
./start.sh
```

**Terminal 2 - Frontend:**
```bash
cd packages/frontend
npm run dev
```

Then:
1. Open `http://localhost:5173`
2. Click the "🎹 MIDI Visualizer" button
3. Upload an audio file
4. Wait for processing, then the 3D visualization loads

## Verifying Installation

### Frontend Health Check
1. Open `http://localhost:5173`
2. You should see the AudiFX home page
3. Try uploading an audio file

### Backend Health Check
1. Open `http://localhost:8000` - should return JSON status
2. Open `http://localhost:8000/docs` - should show API documentation

### MIDI Visualizer Test
1. Click "🎹 MIDI Visualizer" in the frontend
2. Upload a short audio clip (30 seconds)
3. Wait for processing (progress shown)
4. 3D visualization should appear

## Common Issues

### "ffmpeg not found"
- Check ffmpeg is installed and in your PATH
- Restart your terminal after installation
- Verify with `ffmpeg -version`

### "CUDA not available" (backend)
- Set `DEVICE=cpu` in `.env` to use CPU mode
- For GPU: CUDA toolkit version must match PyTorch requirements
- Check: `python -c "import torch; print(torch.cuda.is_available())"`

### "Connection refused" (frontend to backend)
- Check backend is running on port 8000
- Check `VITE_BACKEND_URL` in frontend `.env`
- Check for firewall/antivirus blocking

### "AudioContext not started" (frontend)
- Browser requires user interaction before playing audio
- Click anywhere on the page before using audio features

### "WebGL not available" (MIDI Visualizer)
- Check browser supports WebGL: [get.webgl.org](https://get.webgl.org/)
- Try enabling hardware acceleration in browser settings

## Next Steps

See [ARCHITECTURE.md](ARCHITECTURE.md) for system design and the upgrade plan.

## Development Commands

### Frontend
```bash
cd packages/frontend
npm run dev        # Development server
npm run build      # Production build
npm run lint       # Run linter
npm run typecheck  # Type check
```

### Backend
```bash
cd packages/backend
source venv/bin/activate
python -m app.main  # Start server
```

## Getting Help

- Check the [docs](.) folder for detailed documentation
- Review [TROUBLESHOOTING](#common-issues) above
- Open an issue on GitHub
