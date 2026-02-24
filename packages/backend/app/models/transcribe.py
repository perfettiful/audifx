"""Audio-to-MIDI transcription using BasicPitch and drum detection"""
import logging
from pathlib import Path
from typing import List, Dict, Any, Tuple, Optional
import numpy as np
import librosa
import soundfile as sf
from midiutil import MIDIFile

logger = logging.getLogger(__name__)

def transcribe_melodic(
    audio_path: Path,
    voice: str,
    onset_threshold: float = 0.5,
    frame_threshold: float = 0.3,
    minimum_note_length: int = 127.70,  # ~11ms at 22050 Hz
    midi_output_path: Optional[Path] = None
) -> Dict[str, Any]:
    """
    Transcribe melodic stem using BasicPitch

    Args:
        audio_path: Path to audio file
        voice: Voice name (vocals, bass, other)
        onset_threshold: Onset detection threshold
        frame_threshold: Frame-wise threshold
        minimum_note_length: Minimum note length in frames
        midi_output_path: Optional path to save MIDI file

    Returns:
        Track dict with notes
    """
    logger.info(f"Transcribing {voice}: {audio_path}")

    try:
        from basic_pitch.inference import predict
        from basic_pitch import ICASSP_2022_MODEL_PATH

        # Run BasicPitch
        model_output, midi_data, note_events = predict(
            str(audio_path),
            ICASSP_2022_MODEL_PATH,
            onset_threshold=onset_threshold,
            frame_threshold=frame_threshold,
            minimum_note_length=minimum_note_length
        )

        # Save MIDI file if path provided
        if midi_output_path and midi_data:
            midi_output_path.parent.mkdir(parents=True, exist_ok=True)
            midi_data.write(str(midi_output_path))
            logger.info(f"Saved MIDI file: {midi_output_path}")

        # Convert note events to our format
        notes = []
        for start_time, end_time, pitch, velocity, _ in note_events:
            notes.append({
                "time": float(start_time),
                "duration": float(end_time - start_time),
                "pitch": int(round(pitch)),
                "velocity": int(velocity)
            })

        logger.info(f"Transcribed {len(notes)} notes from {voice}")

        return {
            "voice": voice,
            "label": voice.capitalize(),
            "notes": notes
        }

    except Exception as e:
        logger.error(f"Transcription failed for {voice}: {e}")
        return {
            "voice": voice,
            "label": voice.capitalize(),
            "notes": []
        }

def transcribe_drums(
    audio_path: Path,
    onset_threshold: float = 0.3,
    min_silence: int = 100,  # ms
    midi_output_path: Optional[Path] = None
) -> Dict[str, Any]:
    """
    Transcribe drums using onset detection

    Args:
        audio_path: Path to drum audio
        onset_threshold: Onset strength threshold
        min_silence: Minimum silence between hits (ms)
        midi_output_path: Optional path to save MIDI file

    Returns:
        Track dict with drum hits
    """
    logger.info(f"Transcribing drums: {audio_path}")

    try:
        # Load audio
        y, sr = librosa.load(str(audio_path), sr=44100, mono=True)

        # Detect onsets
        onset_frames = librosa.onset.onset_detect(
            y=y,
            sr=sr,
            units='frames',
            backtrack=True,
            hop_length=512,
            delta=onset_threshold
        )

        # Convert frames to time
        onset_times = librosa.frames_to_time(onset_frames, sr=sr, hop_length=512)

        # Estimate onset strengths (for velocity)
        onset_env = librosa.onset.onset_strength(y=y, sr=sr, hop_length=512)
        onset_strengths = onset_env[onset_frames]

        # Normalize velocities to MIDI range
        if len(onset_strengths) > 0:
            velocities = np.clip(
                (onset_strengths / onset_strengths.max() * 100) + 27,
                1,
                127
            ).astype(int)
        else:
            velocities = []

        # Separate into different drum voices based on spectral content
        hits = []
        for time, velocity in zip(onset_times, velocities):
            # Extract frame around onset
            frame_idx = int(time * sr)
            frame = y[max(0, frame_idx - 1024):min(len(y), frame_idx + 1024)]

            # Spectral analysis to classify drum type
            pitch = classify_drum_hit(frame, sr)

            hits.append({
                "time": float(time),
                "duration": 0.1,  # Fixed short duration for hits
                "pitch": pitch,
                "velocity": int(velocity)
            })

        logger.info(f"Detected {len(hits)} drum hits")

        # Save MIDI file if path provided
        if midi_output_path and len(hits) > 0:
            save_drums_to_midi(hits, midi_output_path)
            logger.info(f"Saved drum MIDI file: {midi_output_path}")

        return {
            "voice": "drums",
            "label": "Drums",
            "notes": hits  # Drums use "notes" for consistency
        }

    except Exception as e:
        logger.error(f"Drum transcription failed: {e}")
        return {
            "voice": "drums",
            "label": "Drums",
            "notes": []
        }


def save_drums_to_midi(hits: List[Dict], output_path: Path):
    """Save drum hits to a MIDI file using General MIDI drum mapping"""
    midi = MIDIFile(1)  # One track
    track = 0
    channel = 9  # MIDI channel 10 (0-indexed) is drums
    tempo = 120

    midi.addTempo(track, 0, tempo)
    midi.addTrackName(track, 0, "Drums")

    for hit in hits:
        midi.addNote(
            track,
            channel,
            hit["pitch"],
            hit["time"],
            hit["duration"],
            hit["velocity"]
        )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "wb") as f:
        midi.writeFile(f)

def classify_drum_hit(frame: np.ndarray, sr: int) -> int:
    """
    Classify drum hit type based on spectral content

    Returns MIDI note number for drum mapping:
    - 36: Kick
    - 38: Snare
    - 42: Closed Hi-Hat
    - 46: Open Hi-Hat
    - 49: Crash
    """
    if len(frame) == 0:
        return 42  # Default to hi-hat

    # Compute spectral centroid
    spec = np.abs(librosa.stft(frame))
    centroid = librosa.feature.spectral_centroid(S=spec, sr=sr)[0, 0]

    # Compute RMS energy
    rms = librosa.feature.rms(y=frame)[0, 0]

    # Simple classification based on frequency content
    if centroid < 200:
        return 36  # Kick (low frequency)
    elif centroid < 1000:
        return 38  # Snare (mid frequency)
    elif centroid < 5000:
        if rms > 0.1:
            return 46  # Open hi-hat
        else:
            return 42  # Closed hi-hat
    else:
        return 49  # Crash (high frequency)

def transcribe_stem(
    audio_path: Path,
    stem_name: str,
    midi_output_path: Optional[Path] = None
) -> Dict[str, Any]:
    """
    Transcribe a single stem (dispatches to correct transcriber)

    Args:
        audio_path: Path to stem audio
        stem_name: Name of stem (vocals, bass, drums, other)
        midi_output_path: Optional path to save MIDI file

    Returns:
        Track dict with notes
    """
    if stem_name == "drums":
        return transcribe_drums(audio_path, midi_output_path=midi_output_path)
    else:
        # Adjust thresholds per voice
        thresholds = {
            "vocals": (0.5, 0.3),
            "bass": (0.4, 0.25),
            "other": (0.5, 0.3)
        }

        onset_th, frame_th = thresholds.get(stem_name, (0.5, 0.3))

        return transcribe_melodic(
            audio_path,
            stem_name,
            onset_threshold=onset_th,
            frame_threshold=frame_th,
            midi_output_path=midi_output_path
        )
