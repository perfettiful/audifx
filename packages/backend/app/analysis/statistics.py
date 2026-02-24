"""Comprehensive statistics computation for music analysis"""

import numpy as np
from typing import Dict, List, Any
from collections import Counter
import logging

from app.analysis.features import extract_all_features
from app.analysis.pca import compute_pca, compute_pca_trajectory
from app.analysis.tonnetz import compute_tonnetz_trajectory
from app.analysis.harmony import detect_key, analyze_chords

logger = logging.getLogger(__name__)


def compute_statistics(timeline: Dict) -> Dict[str, Any]:
    """
    Compute comprehensive statistics for a timeline.

    Args:
        timeline: Full timeline dict with voices and notes

    Returns:
        Complete analysis results
    """
    logger.info("Computing music statistics...")

    # Extract features from all voices
    features = extract_all_features(timeline)

    # Get combined notes for global analysis
    all_notes = []
    for voice in timeline.get("voices", []):
        for note in voice.get("notes", []):
            all_notes.append({
                **note,
                "voice": voice["id"],
                "pitch_class": note["pitch"] % 12
            })

    # Detect key
    key_info = detect_key(all_notes)
    logger.info(f"Detected key: {key_info['full_name']}")

    # Analyze chords
    chord_analysis = analyze_chords(
        all_notes,
        key=key_info["key"],
        mode=key_info["mode"]
    )

    # Compute PCA on voice features
    pca_result = compute_pca(features["voices"])

    # Compute PCA trajectory over time
    pca_trajectory = compute_pca_trajectory(all_notes)

    # Compute Tonnetz trajectory for 3D visualization
    tonnetz_data = compute_tonnetz_trajectory(all_notes)

    # Compute summary statistics
    summary = _compute_summary(features, timeline)

    # Circle of fifths data
    circle_of_fifths = _compute_circle_of_fifths(all_notes, key_info)

    return {
        "summary": summary,
        "key": key_info,
        "features": features,
        "pca": pca_result,
        "pca_trajectory": pca_trajectory,
        "tonnetz": tonnetz_data,
        "harmony": chord_analysis,
        "circle_of_fifths": circle_of_fifths,
        "metadata": {
            "total_voices": len(timeline.get("voices", [])),
            "total_notes": len(all_notes),
            "duration": timeline.get("mix", {}).get("duration", 0)
        }
    }


def _compute_summary(features: Dict, timeline: Dict) -> Dict[str, Any]:
    """Compute summary statistics across all voices"""
    combined = features.get("combined", {})

    # Per-voice summaries
    voice_summaries = []
    for voice in timeline.get("voices", []):
        voice_id = voice["id"]
        voice_features = features.get("voices", {}).get(voice_id, {})

        voice_summaries.append({
            "voice_id": voice_id,
            "label": voice.get("label", voice_id),
            "color": voice.get("color", "#ffffff"),
            "note_count": voice_features.get("note_count", 0),
            "pitch_mean": voice_features.get("pitch", {}).get("mean", 0),
            "pitch_range": voice_features.get("pitch", {}).get("range", 0),
            "note_density": voice_features.get("rhythm", {}).get("note_density", 0),
            "avg_velocity": voice_features.get("dynamics", {}).get("mean_velocity", 0)
        })

    return {
        "total_notes": combined.get("note_count", 0),
        "duration": timeline.get("mix", {}).get("duration", 0),
        "voices": voice_summaries,

        # Global pitch stats
        "pitch": {
            "mean": combined.get("pitch", {}).get("mean", 0),
            "range": combined.get("pitch", {}).get("range", 0),
            "lowest": combined.get("pitch", {}).get("min", 0),
            "highest": combined.get("pitch", {}).get("max", 0)
        },

        # Global rhythm stats
        "rhythm": {
            "note_density": combined.get("rhythm", {}).get("note_density", 0),
            "avg_duration": combined.get("rhythm", {}).get("avg_duration", 0)
        },

        # Global dynamics stats
        "dynamics": {
            "avg_velocity": combined.get("dynamics", {}).get("mean_velocity", 0),
            "velocity_range": combined.get("dynamics", {}).get("velocity_range", 0)
        }
    }


def _compute_circle_of_fifths(notes: List[Dict], key_info: Dict) -> Dict[str, Any]:
    """Compute circle of fifths visualization data"""
    if not notes:
        return {
            "pitch_class_weights": [0] * 12,
            "fifths_order_weights": [0] * 12,
            "key_position": 0
        }

    # Get pitch class distribution
    pc_counts = [0] * 12
    for note in notes:
        pc = note["pitch"] % 12
        weight = note.get("duration", 1.0) * (note.get("velocity", 100) / 127.0)
        pc_counts[pc] += weight

    # Normalize
    total = sum(pc_counts)
    if total > 0:
        pc_weights = [c / total for c in pc_counts]
    else:
        pc_weights = [0] * 12

    # Reorder to circle of fifths (C, G, D, A, E, B, F#, C#, G#, D#, A#, F)
    fifths_order = [0, 7, 2, 9, 4, 11, 6, 1, 8, 3, 10, 5]  # Pitch classes in fifths order
    fifths_weights = [pc_weights[pc] for pc in fifths_order]
    fifths_labels = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'C#', 'G#', 'D#', 'A#', 'F']

    # Key position on circle
    key_pc = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'].index(key_info["key"])
    key_position = fifths_order.index(key_pc)

    return {
        "pitch_class_weights": pc_weights,
        "fifths_order_weights": fifths_weights,
        "fifths_labels": fifths_labels,
        "key_position": key_position,
        "key_name": key_info["full_name"]
    }


def compute_voice_comparison(timeline: Dict) -> Dict[str, Any]:
    """Compare features across voices for radar chart visualization"""
    features = extract_all_features(timeline)

    # Normalize features across voices for comparison
    voice_data = []
    metrics = [
        ("pitch_mean", "Pitch"),
        ("pitch_range", "Range"),
        ("note_density", "Density"),
        ("avg_velocity", "Dynamics"),
        ("stepwise_ratio", "Stepwise"),
        ("consonance", "Consonance")
    ]

    # Collect raw values
    raw_values = {m[0]: [] for m in metrics}

    for voice in timeline.get("voices", []):
        voice_id = voice["id"]
        vf = features.get("voices", {}).get(voice_id, {})

        raw_values["pitch_mean"].append(vf.get("pitch", {}).get("mean", 0))
        raw_values["pitch_range"].append(vf.get("pitch", {}).get("range", 0))
        raw_values["note_density"].append(vf.get("rhythm", {}).get("note_density", 0))
        raw_values["avg_velocity"].append(vf.get("dynamics", {}).get("mean_velocity", 0))
        raw_values["stepwise_ratio"].append(vf.get("intervals", {}).get("stepwise_ratio", 0))
        raw_values["consonance"].append(vf.get("intervals", {}).get("consonance_ratio", 0))

    # Normalize each metric to 0-1 range
    normalized = {}
    for metric, values in raw_values.items():
        min_val = min(values) if values else 0
        max_val = max(values) if values else 1
        range_val = max_val - min_val if max_val > min_val else 1
        normalized[metric] = [(v - min_val) / range_val for v in values]

    # Build voice data
    for i, voice in enumerate(timeline.get("voices", [])):
        voice_data.append({
            "voice_id": voice["id"],
            "label": voice.get("label", voice["id"]),
            "color": voice.get("color", "#ffffff"),
            "values": {
                metric: normalized[metric][i] if i < len(normalized[metric]) else 0
                for metric, _ in metrics
            }
        })

    return {
        "metrics": [{"key": m[0], "label": m[1]} for m in metrics],
        "voices": voice_data
    }
