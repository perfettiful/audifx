"""Main audio processing pipeline orchestration"""
import json
import logging
from pathlib import Path
from typing import Callable, Dict, Any, List

from app.dsp.preprocess import preprocess_audio, get_audio_info
from app.dsp.postprocess import cleanup_track
from app.models.separation import separate_stems
from app.models.transcribe import transcribe_stem
from app.models.llm import refine_with_llm
from app.artifacts.storage import get_storage
from app.jobs.state import JobStatus

logger = logging.getLogger(__name__)

# Voice color mapping for 3D visualization
VOICE_COLORS = {
    "vocals": "#ff4d4d",
    "bass": "#4dd2ff",
    "drums": "#7dff4d",
    "other": "#ffb84d",
    "keys": "#ff9d4d",
    "guitar": "#9d4dff",
    "synth": "#4dffb8"
}

def run_pipeline(
    job_id: str,
    update_status: Callable,
    device: str = "cuda"
):
    """
    Run complete audio → MIDI → timeline pipeline

    Args:
        job_id: Job identifier
        update_status: Callback to update job status
        device: 'cuda' or 'cpu'
    """
    storage = get_storage()

    try:
        # Stage 1: Preprocessing
        update_status(
            job_id,
            JobStatus.RUNNING,
            0.05,
            "Preprocessing audio"
        )

        upload_path = storage.upload_path(job_id)
        preprocessed_path = storage.preprocessed_path(job_id)

        preprocess_audio(
            upload_path,
            preprocessed_path,
            sample_rate=44100,
            channels=2,
            normalize=True
        )

        # Get audio info
        audio_info = get_audio_info(preprocessed_path)
        duration = audio_info.get("duration", 0)

        logger.info(f"Audio duration: {duration:.2f}s")

        # Stage 2: Stem Separation
        update_status(
            job_id,
            JobStatus.RUNNING,
            0.20,
            "Separating stems with Demucs"
        )

        stems_dir = storage.stems_dir(job_id)
        stem_paths = separate_stems(
            job_id,
            preprocessed_path,
            stems_dir,
            device=device
        )

        logger.info(f"Separated {len(stem_paths)} stems")

        # Stage 3: Transcription
        update_status(
            job_id,
            JobStatus.RUNNING,
            0.45,
            "Transcribing stems to MIDI"
        )

        raw_tracks = []
        for stem_name, stem_path in stem_paths.items():
            logger.info(f"Transcribing {stem_name}")
            # Save MIDI file for each stem
            midi_path = storage.midi_path(job_id, stem_name)
            track = transcribe_stem(stem_path, stem_name, midi_output_path=midi_path)
            raw_tracks.append(track)

        total_notes = sum(len(t["notes"]) for t in raw_tracks)
        logger.info(f"Transcribed {total_notes} total notes")

        # Stage 4: Post-processing
        update_status(
            job_id,
            JobStatus.RUNNING,
            0.65,
            "Cleaning up notes"
        )

        cleaned_tracks = []
        for track in raw_tracks:
            cleaned = cleanup_track(track)
            cleaned_tracks.append(cleaned)

        # Stage 5: LLM Refinement (optional)
        update_status(
            job_id,
            JobStatus.RUNNING,
            0.80,
            "Refining labels and structure"
        )

        refined_tracks, sections = refine_with_llm(cleaned_tracks, duration)

        # Stage 6: Build Timeline
        update_status(
            job_id,
            JobStatus.RUNNING,
            0.95,
            "Building timeline"
        )

        timeline = build_timeline(
            job_id,
            refined_tracks,
            sections,
            duration
        )

        # Write output
        timeline_path = storage.timeline_path(job_id)
        with open(timeline_path, "w") as f:
            json.dump(timeline, f, indent=2)

        logger.info(f"Timeline written to {timeline_path}")

        # Complete
        update_status(
            job_id,
            JobStatus.COMPLETED,
            1.0,
            "Processing complete",
            result={
                "timeline_url": storage.get_relative_url(job_id, "timeline.json"),
                "duration": duration,
                "tracks": len(refined_tracks),
                "total_notes": sum(len(t["notes"]) for t in refined_tracks)
            }
        )

    except Exception as e:
        logger.error(f"Pipeline failed for job {job_id}: {e}", exc_info=True)
        update_status(
            job_id,
            JobStatus.FAILED,
            0.0,
            f"Processing failed: {str(e)}",
            error=str(e)
        )
        raise

def build_timeline(
    job_id: str,
    tracks: List[Dict[str, Any]],
    sections: List[Dict[str, Any]],
    duration: float
) -> Dict[str, Any]:
    """
    Build final timeline.json output

    Args:
        job_id: Job identifier
        tracks: List of track dicts with notes
        sections: List of section dicts
        duration: Song duration in seconds

    Returns:
        Timeline dict for frontend consumption
    """
    storage = get_storage()

    # Build voices array
    voices = []
    for track in tracks:
        voice_id = track["voice"]
        voice_label = track["label"]

        # Assign color
        color = VOICE_COLORS.get(voice_label.lower(), VOICE_COLORS.get(voice_id, "#ffffff"))

        # Check if MIDI file exists for this voice
        midi_url = None
        midi_file = storage.midi_path(job_id, voice_id)
        if midi_file.exists():
            midi_url = f"/jobs/{job_id}/midi/{voice_id}"

        voices.append({
            "id": voice_id,
            "label": voice_label,
            "color": color,
            "notes": track["notes"],
            "midiUrl": midi_url
        })

    # Build timeline object
    timeline = {
        "mix": {
            "url": storage.get_relative_url(job_id, "preprocessed.wav"),
            "duration": duration
        },
        "voices": voices,
        "sections": sections,
        "metadata": {
            "job_id": job_id,
            "total_voices": len(voices),
            "total_notes": sum(len(v["notes"]) for v in voices),
            "total_sections": len(sections)
        }
    }

    return timeline
