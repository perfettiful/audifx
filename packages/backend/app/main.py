"""FastAPI server for audio-to-MIDI backend"""
import os
import logging
import uuid
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse, FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

from app.jobs.state import init_store, get_store, JobMetadata
from app.artifacts.storage import init_storage, get_storage
from app.models.llm import init_llm
from app.worker import init_worker, get_worker, shutdown_worker

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)

logger = logging.getLogger(__name__)

# Configuration
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", 8000))
ARTIFACTS_DIR = os.getenv("ARTIFACTS_DIR", "./artifacts")
DEVICE = os.getenv("DEVICE", "cuda")
MAX_CONCURRENT_JOBS = int(os.getenv("MAX_CONCURRENT_JOBS", 1))
MAX_FILE_SIZE_MB = int(os.getenv("MAX_FILE_SIZE_MB", 100))
LLM_MODEL_PATH = os.getenv("LLM_MODEL_PATH")
LLM_USE_GPU = os.getenv("LLM_USE_GPU", "true").lower() == "true"

# Initialize FastAPI app
app = FastAPI(
    title="AudiFX Audio-to-MIDI Backend",
    description="Transform audio into MIDI with 3D visualization data",
    version="0.1.0"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic models
class JobResponse(BaseModel):
    job_id: str
    status: str
    progress: float
    message: str
    created_at: str
    updated_at: str
    error: Optional[str] = None
    result: Optional[dict] = None

class JobCreateResponse(BaseModel):
    job_id: str
    message: str

# Startup/Shutdown events
@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    logger.info("Starting AudiFX backend...")

    # Initialize storage
    init_storage(ARTIFACTS_DIR)
    logger.info(f"Artifact storage: {ARTIFACTS_DIR}")

    # Initialize job store
    init_store(ARTIFACTS_DIR)
    logger.info("Job store initialized")

    # Initialize LLM (optional)
    if LLM_MODEL_PATH and Path(LLM_MODEL_PATH).exists():
        init_llm(model_path=LLM_MODEL_PATH, use_gpu=LLM_USE_GPU)
        logger.info(f"LLM loaded: {LLM_MODEL_PATH}")
    else:
        init_llm()  # Initialize without model
        logger.info("LLM disabled (no model path configured)")

    # Initialize worker
    init_worker(device=DEVICE, max_concurrent=MAX_CONCURRENT_JOBS)
    logger.info(f"Worker started (device={DEVICE}, max_concurrent={MAX_CONCURRENT_JOBS})")

    logger.info("AudiFX backend ready!")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    logger.info("Shutting down...")
    shutdown_worker()

# Routes
@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "service": "AudiFX Audio-to-MIDI Backend",
        "status": "running",
        "version": "0.1.0"
    }

@app.post("/jobs", response_model=JobCreateResponse)
async def create_job(file: UploadFile = File(...)):
    """
    Upload audio file and create processing job

    Args:
        file: Audio file (WAV, MP3, etc.)

    Returns:
        Job ID and status
    """
    # Validate file size
    file.file.seek(0, 2)  # Seek to end
    file_size = file.file.tell()
    file.file.seek(0)  # Reset

    max_size = MAX_FILE_SIZE_MB * 1024 * 1024
    if file_size > max_size:
        raise HTTPException(
            status_code=413,
            detail=f"File too large (max {MAX_FILE_SIZE_MB}MB)"
        )

    # Generate job ID
    job_id = str(uuid.uuid4())

    try:
        # Create job
        store = get_store()
        store.create_job(job_id)

        # Save uploaded file
        storage = get_storage()
        upload_path = storage.upload_path(job_id)

        with open(upload_path, "wb") as f:
            content = await file.read()
            f.write(content)

        logger.info(f"Job {job_id} created, file saved: {upload_path}")

        # Enqueue job
        worker = get_worker()
        worker.enqueue(job_id)

        return JobCreateResponse(
            job_id=job_id,
            message="Job created and queued for processing"
        )

    except Exception as e:
        logger.error(f"Failed to create job: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/jobs/{job_id}", response_model=JobResponse)
async def get_job_status(job_id: str):
    """
    Get job status and progress

    Args:
        job_id: Job identifier

    Returns:
        Job metadata
    """
    store = get_store()
    job = store.get_job(job_id)

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    return JobResponse(**job.__dict__)

@app.get("/jobs/{job_id}/timeline")
async def get_timeline(job_id: str):
    """
    Get timeline.json for completed job

    Args:
        job_id: Job identifier

    Returns:
        Timeline JSON
    """
    storage = get_storage()
    timeline_path = storage.timeline_path(job_id)

    if not timeline_path.exists():
        raise HTTPException(status_code=404, detail="Timeline not found (job may not be complete)")

    return FileResponse(timeline_path, media_type="application/json")

@app.get("/jobs/{job_id}/audio")
async def get_audio(job_id: str):
    """
    Get preprocessed audio file

    Args:
        job_id: Job identifier

    Returns:
        Audio file
    """
    storage = get_storage()
    audio_path = storage.preprocessed_path(job_id)

    if not audio_path.exists():
        raise HTTPException(status_code=404, detail="Audio not found")

    return FileResponse(audio_path, media_type="audio/wav")


@app.get("/jobs/{job_id}/midi/{stem_name}")
async def get_midi(job_id: str, stem_name: str):
    """
    Get MIDI file for a specific stem

    Args:
        job_id: Job identifier
        stem_name: Stem name (vocals, bass, drums, other)

    Returns:
        MIDI file
    """
    storage = get_storage()
    midi_path = storage.midi_path(job_id, stem_name)

    if not midi_path.exists():
        raise HTTPException(status_code=404, detail=f"MIDI file not found for {stem_name}")

    return FileResponse(
        midi_path,
        media_type="audio/midi",
        filename=f"{stem_name}.mid"
    )


@app.get("/jobs/{job_id}/midi")
async def list_midi_files(job_id: str):
    """
    List available MIDI files for a job

    Args:
        job_id: Job identifier

    Returns:
        List of available MIDI files
    """
    storage = get_storage()
    midi_dir = storage.midi_dir(job_id)

    if not midi_dir.exists():
        return {"midi_files": [], "total": 0}

    midi_files = []
    for midi_file in midi_dir.glob("*.mid"):
        stem_name = midi_file.stem
        midi_files.append({
            "stem": stem_name,
            "url": f"/jobs/{job_id}/midi/{stem_name}",
            "filename": f"{stem_name}.mid"
        })

    return {"midi_files": midi_files, "total": len(midi_files)}


# Analysis endpoints
@app.get("/jobs/{job_id}/analysis")
async def get_analysis(job_id: str):
    """
    Get comprehensive music analysis for a completed job.

    Args:
        job_id: Job identifier

    Returns:
        Full analysis including features, PCA, Tonnetz, harmony
    """
    import json
    from app.analysis.statistics import compute_statistics

    storage = get_storage()
    timeline_path = storage.timeline_path(job_id)

    if not timeline_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Timeline not found. Job may not be complete."
        )

    # Load timeline
    with open(timeline_path, "r") as f:
        timeline = json.load(f)

    # Compute analysis
    try:
        analysis = compute_statistics(timeline)
        return analysis
    except Exception as e:
        logger.error(f"Analysis failed: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


@app.get("/jobs/{job_id}/analysis/pca")
async def get_pca_analysis(job_id: str):
    """
    Get PCA analysis for voice comparison and time trajectory.
    """
    import json
    from app.analysis.features import extract_all_features
    from app.analysis.pca import compute_pca, compute_pca_trajectory

    storage = get_storage()
    timeline_path = storage.timeline_path(job_id)

    if not timeline_path.exists():
        raise HTTPException(status_code=404, detail="Timeline not found")

    with open(timeline_path, "r") as f:
        timeline = json.load(f)

    # Extract features
    features = extract_all_features(timeline)

    # Compute PCA on voices
    pca_result = compute_pca(features["voices"])

    # Get all notes for trajectory
    all_notes = []
    for voice in timeline.get("voices", []):
        for note in voice.get("notes", []):
            all_notes.append({
                **note,
                "voice": voice["id"],
                "pitch_class": note["pitch"] % 12
            })

    # Compute trajectory
    trajectory = compute_pca_trajectory(all_notes)

    return {
        "voices": pca_result,
        "trajectory": trajectory
    }


@app.get("/jobs/{job_id}/analysis/tonnetz")
async def get_tonnetz_analysis(job_id: str):
    """
    Get Tonnetz torus visualization data.
    """
    import json
    from app.analysis.tonnetz import compute_tonnetz_trajectory

    storage = get_storage()
    timeline_path = storage.timeline_path(job_id)

    if not timeline_path.exists():
        raise HTTPException(status_code=404, detail="Timeline not found")

    with open(timeline_path, "r") as f:
        timeline = json.load(f)

    # Get all notes
    all_notes = []
    for voice in timeline.get("voices", []):
        for note in voice.get("notes", []):
            all_notes.append({
                **note,
                "voice": voice["id"],
                "pitch_class": note["pitch"] % 12
            })

    # Compute Tonnetz data
    tonnetz = compute_tonnetz_trajectory(all_notes)

    return tonnetz


@app.get("/jobs/{job_id}/analysis/harmony")
async def get_harmony_analysis(job_id: str):
    """
    Get harmonic analysis: key detection, chords, progressions.
    """
    import json
    from app.analysis.harmony import detect_key, analyze_chords, get_diatonic_chords

    storage = get_storage()
    timeline_path = storage.timeline_path(job_id)

    if not timeline_path.exists():
        raise HTTPException(status_code=404, detail="Timeline not found")

    with open(timeline_path, "r") as f:
        timeline = json.load(f)

    # Get all notes
    all_notes = []
    for voice in timeline.get("voices", []):
        for note in voice.get("notes", []):
            all_notes.append(note)

    # Detect key
    key_info = detect_key(all_notes)

    # Analyze chords
    chord_analysis = analyze_chords(all_notes, key_info["key"], key_info["mode"])

    # Get diatonic chords for reference
    diatonic = get_diatonic_chords(key_info["key"], key_info["mode"])

    return {
        "key": key_info,
        "chords": chord_analysis,
        "diatonic_chords": diatonic
    }


@app.get("/jobs")
async def list_jobs():
    """
    List all jobs

    Returns:
        List of job metadata
    """
    store = get_store()
    jobs = store.list_jobs()

    return {
        "jobs": [JobResponse(**job.__dict__) for job in jobs],
        "total": len(jobs)
    }


# Stem Mixer endpoints
@app.get("/jobs/{job_id}/stems")
async def list_stems(job_id: str):
    """
    List available stems for a job

    Args:
        job_id: Job identifier

    Returns:
        List of available stems
    """
    storage = get_storage()
    stems_dir = storage.stems_dir(job_id)

    # Look in the htdemucs output directory
    htdemucs_dir = stems_dir / "htdemucs"
    available_stems = []

    if htdemucs_dir.exists():
        # Check all subdirectories for stem files
        for subdir in htdemucs_dir.iterdir():
            if subdir.is_dir():
                for stem_file in subdir.glob("*.wav"):
                    stem_name = stem_file.stem
                    available_stems.append({
                        "name": stem_name,
                        "url": f"/jobs/{job_id}/stems/{stem_name}",
                        "label": stem_name.replace("_", " ").title()
                    })

    # Also check root stems directory
    for stem_file in stems_dir.glob("*.wav"):
        stem_name = stem_file.stem
        if not any(s["name"] == stem_name for s in available_stems):
            available_stems.append({
                "name": stem_name,
                "url": f"/jobs/{job_id}/stems/{stem_name}",
                "label": stem_name.replace("_", " ").title()
            })

    return {"stems": available_stems, "total": len(available_stems)}


@app.get("/jobs/{job_id}/stems/{stem_name}")
async def get_stem(job_id: str, stem_name: str):
    """
    Get individual stem audio file

    Args:
        job_id: Job identifier
        stem_name: Stem name (vocals, bass, drums, other, no_vocals)

    Returns:
        Audio file
    """
    storage = get_storage()
    stems_dir = storage.stems_dir(job_id)

    # Search in htdemucs output directories
    stem_path = None
    htdemucs_dir = stems_dir / "htdemucs"

    if htdemucs_dir.exists():
        for subdir in htdemucs_dir.iterdir():
            if subdir.is_dir():
                potential_path = subdir / f"{stem_name}.wav"
                if potential_path.exists():
                    stem_path = potential_path
                    break

    # Also check root stems directory
    if not stem_path:
        root_stem = stems_dir / f"{stem_name}.wav"
        if root_stem.exists():
            stem_path = root_stem

    if not stem_path or not stem_path.exists():
        raise HTTPException(status_code=404, detail=f"Stem '{stem_name}' not found")

    return FileResponse(stem_path, media_type="audio/wav", filename=f"{stem_name}.wav")


class RemixSettings(BaseModel):
    """Settings for remixing stems"""
    vocals: float = 1.0
    bass: float = 1.0
    drums: float = 1.0
    other: float = 1.0
    format: str = "wav"  # wav, mp3, flac


@app.post("/jobs/{job_id}/remix")
async def remix_stems(job_id: str, settings: RemixSettings):
    """
    Mix stems with custom volume levels and export

    Args:
        job_id: Job identifier
        settings: Remix settings with volume levels

    Returns:
        Mixed audio file
    """
    import numpy as np
    import soundfile as sf
    from io import BytesIO
    from fastapi.responses import StreamingResponse

    storage = get_storage()
    stems_dir = storage.stems_dir(job_id)
    htdemucs_dir = stems_dir / "htdemucs"

    # Find and load stems
    stem_volumes = {
        "vocals": settings.vocals,
        "bass": settings.bass,
        "drums": settings.drums,
        "other": settings.other
    }

    mixed_audio = None
    sample_rate = None

    for stem_name, volume in stem_volumes.items():
        stem_path = None

        # Search in htdemucs directories
        if htdemucs_dir.exists():
            for subdir in htdemucs_dir.iterdir():
                if subdir.is_dir():
                    potential_path = subdir / f"{stem_name}.wav"
                    if potential_path.exists():
                        stem_path = potential_path
                        break

        if stem_path and stem_path.exists():
            audio, sr = sf.read(str(stem_path))

            if sample_rate is None:
                sample_rate = sr
                mixed_audio = np.zeros_like(audio)

            # Apply volume and add to mix
            mixed_audio += audio * volume

    if mixed_audio is None:
        raise HTTPException(status_code=404, detail="No stems found for this job")

    # Normalize to prevent clipping
    max_val = np.max(np.abs(mixed_audio))
    if max_val > 1.0:
        mixed_audio = mixed_audio / max_val * 0.95

    # Export to requested format
    output = BytesIO()

    if settings.format == "flac":
        sf.write(output, mixed_audio, sample_rate, format='FLAC')
        output.seek(0)
        media_type = "audio/flac"
        filename = f"remix_{job_id}.flac"
    else:  # wav (default)
        sf.write(output, mixed_audio, sample_rate, format='WAV')
        output.seek(0)
        media_type = "audio/wav"
        filename = f"remix_{job_id}.wav"

    return StreamingResponse(
        output,
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@app.get("/jobs/{job_id}/export")
async def export_audio(job_id: str, format: str = "wav"):
    """
    Export the processed audio in various formats

    Args:
        job_id: Job identifier
        format: Output format (wav, flac)

    Returns:
        Audio file in requested format
    """
    import soundfile as sf
    from io import BytesIO
    from fastapi.responses import StreamingResponse

    storage = get_storage()
    audio_path = storage.preprocessed_path(job_id)

    if not audio_path.exists():
        raise HTTPException(status_code=404, detail="Audio not found")

    # Read audio
    audio, sample_rate = sf.read(str(audio_path))

    # Export to requested format
    output = BytesIO()

    if format == "flac":
        sf.write(output, audio, sample_rate, format='FLAC')
        output.seek(0)
        media_type = "audio/flac"
        filename = f"audio_{job_id}.flac"
    else:  # wav (default)
        sf.write(output, audio, sample_rate, format='WAV')
        output.seek(0)
        media_type = "audio/wav"
        filename = f"audio_{job_id}.wav"

    return StreamingResponse(
        output,
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


# Error handlers
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=HOST,
        port=PORT,
        reload=False,
        log_level="info"
    )
