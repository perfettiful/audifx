"""Feature extraction from MIDI/note data for music analysis"""

import numpy as np
from typing import Dict, List, Any, Optional
from collections import Counter
import logging

logger = logging.getLogger(__name__)

# Pitch class names
PITCH_CLASSES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']


def extract_features(notes: List[Dict], voice_id: str = "unknown") -> Dict[str, Any]:
    """
    Extract comprehensive features from a list of notes.

    Args:
        notes: List of note dicts with time, duration, pitch, velocity
        voice_id: Identifier for this voice/track

    Returns:
        Dict containing all extracted features
    """
    if not notes:
        return _empty_features(voice_id)

    # Extract raw arrays
    pitches = np.array([n["pitch"] for n in notes])
    durations = np.array([n["duration"] for n in notes])
    velocities = np.array([n["velocity"] for n in notes])
    times = np.array([n["time"] for n in notes])

    # Compute pitch classes (0-11)
    pitch_classes = pitches % 12

    features = {
        "voice_id": voice_id,
        "note_count": len(notes),

        # Pitch statistics
        "pitch": _compute_pitch_features(pitches, pitch_classes),

        # Interval statistics
        "intervals": _compute_interval_features(pitches),

        # Rhythm statistics
        "rhythm": _compute_rhythm_features(times, durations),

        # Velocity/dynamics statistics
        "dynamics": _compute_dynamics_features(velocities),

        # Histograms for visualization
        "histograms": _compute_histograms(pitches, pitch_classes, durations, velocities),

        # Time-series data for animation
        "time_series": _compute_time_series(notes)
    }

    return features


def _empty_features(voice_id: str) -> Dict[str, Any]:
    """Return empty feature dict for tracks with no notes"""
    return {
        "voice_id": voice_id,
        "note_count": 0,
        "pitch": {
            "mean": 0, "std": 0, "min": 0, "max": 0, "range": 0,
            "skewness": 0, "kurtosis": 0, "most_common_pc": 0
        },
        "intervals": {
            "mean": 0, "std": 0, "stepwise_ratio": 0, "leap_ratio": 0,
            "direction_changes": 0, "consonance_ratio": 0
        },
        "rhythm": {
            "note_density": 0, "avg_duration": 0, "duration_std": 0,
            "total_duration": 0, "rest_ratio": 0
        },
        "dynamics": {
            "mean_velocity": 0, "velocity_std": 0, "velocity_range": 0
        },
        "histograms": {
            "pitch_class": [0] * 12,
            "intervals": [0] * 13,
            "durations": [],
            "velocities": []
        },
        "time_series": []
    }


def _compute_pitch_features(pitches: np.ndarray, pitch_classes: np.ndarray) -> Dict[str, float]:
    """Compute pitch-related features"""
    # Basic statistics
    mean_pitch = float(np.mean(pitches))
    std_pitch = float(np.std(pitches))
    min_pitch = int(np.min(pitches))
    max_pitch = int(np.max(pitches))
    pitch_range = max_pitch - min_pitch

    # Higher moments
    if std_pitch > 0:
        skewness = float(np.mean(((pitches - mean_pitch) / std_pitch) ** 3))
        kurtosis = float(np.mean(((pitches - mean_pitch) / std_pitch) ** 4) - 3)
    else:
        skewness = 0.0
        kurtosis = 0.0

    # Most common pitch class
    pc_counts = Counter(pitch_classes)
    most_common_pc = pc_counts.most_common(1)[0][0] if pc_counts else 0

    return {
        "mean": round(mean_pitch, 2),
        "std": round(std_pitch, 2),
        "min": min_pitch,
        "max": max_pitch,
        "range": pitch_range,
        "skewness": round(skewness, 3),
        "kurtosis": round(kurtosis, 3),
        "most_common_pc": int(most_common_pc),
        "most_common_pc_name": PITCH_CLASSES[int(most_common_pc)]
    }


def _compute_interval_features(pitches: np.ndarray) -> Dict[str, float]:
    """Compute melodic interval features"""
    if len(pitches) < 2:
        return {
            "mean": 0, "std": 0, "stepwise_ratio": 0, "leap_ratio": 0,
            "direction_changes": 0, "consonance_ratio": 0
        }

    # Compute intervals (signed)
    intervals = np.diff(pitches)
    abs_intervals = np.abs(intervals)

    # Basic statistics
    mean_interval = float(np.mean(abs_intervals))
    std_interval = float(np.std(abs_intervals))

    # Motion types
    stepwise = np.sum(abs_intervals <= 2)  # Semitone or whole tone
    leaps = np.sum(abs_intervals > 2)
    total = len(intervals)

    stepwise_ratio = stepwise / total if total > 0 else 0
    leap_ratio = leaps / total if total > 0 else 0

    # Direction changes
    directions = np.sign(intervals)
    direction_changes = np.sum(np.diff(directions) != 0)
    direction_change_ratio = direction_changes / (len(intervals) - 1) if len(intervals) > 1 else 0

    # Consonance (perfect intervals: unison, P4, P5, octave)
    consonant_intervals = {0, 5, 7, 12}  # In semitones
    consonant_count = sum(1 for i in abs_intervals if i % 12 in consonant_intervals)
    consonance_ratio = consonant_count / total if total > 0 else 0

    return {
        "mean": round(mean_interval, 2),
        "std": round(std_interval, 2),
        "stepwise_ratio": round(stepwise_ratio, 3),
        "leap_ratio": round(leap_ratio, 3),
        "direction_changes": int(direction_changes),
        "direction_change_ratio": round(direction_change_ratio, 3),
        "consonance_ratio": round(consonance_ratio, 3)
    }


def _compute_rhythm_features(times: np.ndarray, durations: np.ndarray) -> Dict[str, float]:
    """Compute rhythm-related features"""
    if len(times) == 0:
        return {
            "note_density": 0, "avg_duration": 0, "duration_std": 0,
            "total_duration": 0, "rest_ratio": 0
        }

    # Total time span
    total_duration = float(np.max(times + durations) - np.min(times))

    # Note density (notes per second)
    note_density = len(times) / total_duration if total_duration > 0 else 0

    # Duration statistics
    avg_duration = float(np.mean(durations))
    duration_std = float(np.std(durations))

    # Inter-onset intervals
    if len(times) > 1:
        ioi = np.diff(np.sort(times))
        avg_ioi = float(np.mean(ioi))

        # Rest ratio (time between notes vs note duration)
        total_sound = float(np.sum(durations))
        rest_ratio = 1 - (total_sound / total_duration) if total_duration > 0 else 0
    else:
        avg_ioi = 0
        rest_ratio = 0

    return {
        "note_density": round(note_density, 2),
        "avg_duration": round(avg_duration, 3),
        "duration_std": round(duration_std, 3),
        "total_duration": round(total_duration, 2),
        "avg_ioi": round(avg_ioi, 3) if len(times) > 1 else 0,
        "rest_ratio": round(max(0, rest_ratio), 3)
    }


def _compute_dynamics_features(velocities: np.ndarray) -> Dict[str, float]:
    """Compute dynamics/velocity features"""
    if len(velocities) == 0:
        return {"mean_velocity": 0, "velocity_std": 0, "velocity_range": 0}

    return {
        "mean_velocity": round(float(np.mean(velocities)), 1),
        "velocity_std": round(float(np.std(velocities)), 1),
        "velocity_range": int(np.max(velocities) - np.min(velocities)),
        "min_velocity": int(np.min(velocities)),
        "max_velocity": int(np.max(velocities))
    }


def _compute_histograms(
    pitches: np.ndarray,
    pitch_classes: np.ndarray,
    durations: np.ndarray,
    velocities: np.ndarray
) -> Dict[str, List]:
    """Compute histograms for visualization"""

    # Pitch class histogram (chromagram)
    pc_hist = [0] * 12
    for pc in pitch_classes:
        pc_hist[int(pc)] += 1
    # Normalize
    total = sum(pc_hist)
    if total > 0:
        pc_hist = [round(c / total, 4) for c in pc_hist]

    # Interval histogram (0-12 semitones)
    if len(pitches) > 1:
        intervals = np.abs(np.diff(pitches))
        int_hist = [0] * 13
        for interval in intervals:
            idx = min(int(interval), 12)  # Clamp to octave
            int_hist[idx] += 1
        # Normalize
        total = sum(int_hist)
        if total > 0:
            int_hist = [round(c / total, 4) for c in int_hist]
    else:
        int_hist = [0] * 13

    # Duration histogram (binned)
    dur_bins = [0, 0.1, 0.25, 0.5, 1.0, 2.0, float('inf')]
    dur_labels = ["<0.1s", "0.1-0.25s", "0.25-0.5s", "0.5-1s", "1-2s", ">2s"]
    dur_hist = []
    for i in range(len(dur_bins) - 1):
        count = np.sum((durations >= dur_bins[i]) & (durations < dur_bins[i+1]))
        dur_hist.append({"label": dur_labels[i], "count": int(count)})

    # Velocity histogram (binned)
    vel_bins = [0, 32, 64, 96, 128]
    vel_labels = ["pp (0-31)", "p (32-63)", "mf (64-95)", "f (96-127)"]
    vel_hist = []
    for i in range(len(vel_bins) - 1):
        count = np.sum((velocities >= vel_bins[i]) & (velocities < vel_bins[i+1]))
        vel_hist.append({"label": vel_labels[i], "count": int(count)})

    return {
        "pitch_class": pc_hist,
        "pitch_class_labels": PITCH_CLASSES,
        "intervals": int_hist,
        "interval_labels": ["0", "m2", "M2", "m3", "M3", "P4", "TT", "P5", "m6", "M6", "m7", "M7", "P8"],
        "durations": dur_hist,
        "velocities": vel_hist
    }


def _compute_time_series(notes: List[Dict]) -> List[Dict]:
    """
    Compute time-series data for animation.
    Returns notes with pitch class info for Tonnetz animation.
    """
    time_series = []

    # Sort by time
    sorted_notes = sorted(notes, key=lambda n: n["time"])

    for note in sorted_notes:
        pitch = note["pitch"]
        pc = pitch % 12

        time_series.append({
            "time": note["time"],
            "duration": note["duration"],
            "pitch": pitch,
            "pitch_class": pc,
            "pitch_class_name": PITCH_CLASSES[pc],
            "velocity": note["velocity"],
            "octave": pitch // 12 - 1
        })

    return time_series


def extract_all_features(timeline: Dict) -> Dict[str, Any]:
    """
    Extract features from all voices in a timeline.

    Args:
        timeline: Full timeline dict with voices

    Returns:
        Dict with per-voice and combined features
    """
    all_features = {
        "voices": {},
        "combined": None
    }

    # Extract per-voice features
    all_notes = []
    for voice in timeline.get("voices", []):
        voice_id = voice["id"]
        notes = voice.get("notes", [])

        features = extract_features(notes, voice_id)
        all_features["voices"][voice_id] = features

        # Collect all notes for combined analysis
        for note in notes:
            all_notes.append({**note, "voice": voice_id})

    # Extract combined features
    all_features["combined"] = extract_features(all_notes, "combined")
    all_features["combined"]["total_voices"] = len(timeline.get("voices", []))

    return all_features
