"""Audio preprocessing using ffmpeg"""
import subprocess
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

def preprocess_audio(
    input_path: Path,
    output_path: Path,
    sample_rate: int = 44100,
    channels: int = 2,
    normalize: bool = True
) -> Path:
    """
    Preprocess audio file using ffmpeg

    Args:
        input_path: Path to input audio file
        output_path: Path to output WAV file
        sample_rate: Target sample rate (Hz)
        channels: Target channel count (1=mono, 2=stereo)
        normalize: Apply normalization

    Returns:
        Path to preprocessed audio file
    """
    logger.info(f"Preprocessing audio: {input_path} -> {output_path}")

    # Build ffmpeg command
    cmd = [
        "ffmpeg",
        "-i", str(input_path),
        "-ar", str(sample_rate),
        "-ac", str(channels),
    ]

    if normalize:
        # Apply loudness normalization (EBU R128)
        cmd.extend([
            "-af", "loudnorm=I=-16:TP=-1.5:LRA=11",
        ])

    # Output format
    cmd.extend([
        "-acodec", "pcm_s16le",
        "-y",  # Overwrite output
        str(output_path)
    ])

    try:
        result = subprocess.run(
            cmd,
            check=True,
            capture_output=True,
            text=True
        )
        logger.info(f"Preprocessing complete: {output_path}")
        return output_path

    except subprocess.CalledProcessError as e:
        logger.error(f"ffmpeg failed: {e.stderr}")
        raise RuntimeError(f"Audio preprocessing failed: {e.stderr}")

def get_audio_info(file_path: Path) -> dict:
    """
    Get audio file information using ffprobe

    Returns:
        dict with duration, sample_rate, channels, etc.
    """
    cmd = [
        "ffprobe",
        "-v", "error",
        "-show_entries", "format=duration:stream=sample_rate,channels",
        "-of", "json",
        str(file_path)
    ]

    try:
        result = subprocess.run(
            cmd,
            check=True,
            capture_output=True,
            text=True
        )

        import json
        data = json.loads(result.stdout)

        # Extract info
        format_info = data.get("format", {})
        stream_info = data.get("streams", [{}])[0]

        return {
            "duration": float(format_info.get("duration", 0)),
            "sample_rate": int(stream_info.get("sample_rate", 0)),
            "channels": int(stream_info.get("channels", 0))
        }

    except (subprocess.CalledProcessError, json.JSONDecodeError, ValueError) as e:
        logger.error(f"ffprobe failed: {e}")
        return {}
