"""Post-processing for MIDI notes and events"""
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

# Voice-specific pitch ranges (MIDI note numbers)
VOICE_RANGES = {
    "vocals": (48, 84),   # C3 to C6
    "bass": (28, 55),     # E1 to G3
    "other": (36, 96),    # C2 to C7 (keys, guitar, etc.)
    "drums": (0, 127)     # Full range for percussion
}

# Maximum polyphony per voice
MAX_POLYPHONY = {
    "vocals": 2,    # Mostly monophonic, occasional harmonies
    "bass": 1,      # Strictly monophonic
    "other": 6,     # Chords and arpeggios
    "drums": 12     # Multiple simultaneous hits
}

def merge_notes(notes: List[Dict[str, Any]], gap_threshold: float = 0.05) -> List[Dict[str, Any]]:
    """
    Merge adjacent notes with same pitch

    Args:
        notes: List of note dicts with 'time', 'duration', 'pitch', 'velocity'
        gap_threshold: Maximum gap (seconds) to merge across

    Returns:
        List of merged notes
    """
    if not notes:
        return []

    # Sort by time, then pitch
    sorted_notes = sorted(notes, key=lambda n: (n["time"], n["pitch"]))

    merged = []
    current = sorted_notes[0].copy()

    for note in sorted_notes[1:]:
        # Check if same pitch and close in time
        same_pitch = note["pitch"] == current["pitch"]
        gap = note["time"] - (current["time"] + current["duration"])
        close_enough = gap <= gap_threshold

        if same_pitch and close_enough:
            # Extend current note
            new_end = note["time"] + note["duration"]
            current_end = current["time"] + current["duration"]
            current["duration"] = max(new_end, current_end) - current["time"]
            current["velocity"] = max(current["velocity"], note["velocity"])
        else:
            # Save current and start new
            merged.append(current)
            current = note.copy()

    merged.append(current)
    return merged

def remove_micro_notes(notes: List[Dict[str, Any]], min_duration: float = 0.08) -> List[Dict[str, Any]]:
    """Remove notes shorter than minimum duration"""
    return [n for n in notes if n["duration"] >= min_duration]

def clamp_range(notes: List[Dict[str, Any]], voice: str) -> List[Dict[str, Any]]:
    """
    Clamp notes to voice-appropriate pitch range

    Args:
        notes: List of notes
        voice: Voice name (vocals, bass, other, drums)

    Returns:
        Filtered notes within range
    """
    if voice not in VOICE_RANGES:
        return notes

    min_pitch, max_pitch = VOICE_RANGES[voice]
    return [
        n for n in notes
        if min_pitch <= n["pitch"] <= max_pitch
    ]

def limit_polyphony(notes: List[Dict[str, Any]], voice: str) -> List[Dict[str, Any]]:
    """
    Limit maximum simultaneous notes per voice

    Keeps highest velocity notes when overlapping
    """
    max_poly = MAX_POLYPHONY.get(voice, 6)

    if not notes:
        return []

    # Sort by time
    sorted_notes = sorted(notes, key=lambda n: n["time"])

    # Track active notes
    active = []
    result = []

    for note in sorted_notes:
        current_time = note["time"]

        # Remove expired notes from active list
        active = [n for n in active if n["time"] + n["duration"] > current_time]

        # Add current note
        active.append(note)

        # If over polyphony limit, keep only highest velocity notes
        if len(active) > max_poly:
            active = sorted(active, key=lambda n: n["velocity"], reverse=True)[:max_poly]

        # Add to result if still active
        if note in active:
            result.append(note)

    return result

def quantize_timing(
    notes: List[Dict[str, Any]],
    grid_size: float = 0.125,
    strength: float = 0.8
) -> List[Dict[str, Any]]:
    """
    Quantize note timings to grid

    Args:
        notes: List of notes
        grid_size: Grid size in seconds (e.g., 0.125 = 1/32 note at 120 BPM)
        strength: Quantization strength (0.0 = none, 1.0 = full)

    Returns:
        Quantized notes
    """
    quantized = []

    for note in notes:
        n = note.copy()

        # Quantize start time
        grid_time = round(n["time"] / grid_size) * grid_size
        n["time"] = n["time"] * (1 - strength) + grid_time * strength

        # Quantize duration
        grid_dur = round(n["duration"] / grid_size) * grid_size
        n["duration"] = max(grid_size, n["duration"] * (1 - strength) + grid_dur * strength)

        quantized.append(n)

    return quantized

def cleanup_track(track: Dict[str, Any]) -> Dict[str, Any]:
    """
    Apply full cleanup pipeline to a track

    Args:
        track: Dict with 'voice', 'notes' keys

    Returns:
        Cleaned track
    """
    voice = track["voice"]
    notes = track["notes"]

    logger.info(f"Cleaning {voice} track: {len(notes)} raw notes")

    # Apply cleanup stages
    notes = remove_micro_notes(notes, min_duration=0.08)
    notes = clamp_range(notes, voice)
    notes = merge_notes(notes, gap_threshold=0.05)
    notes = limit_polyphony(notes, voice)
    notes = quantize_timing(notes, grid_size=0.0625, strength=0.6)

    logger.info(f"Cleaned {voice} track: {len(notes)} final notes")

    track["notes"] = notes
    return track
