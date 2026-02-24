"""Harmonic analysis: key detection, chord analysis, and roman numerals"""

import numpy as np
from typing import Dict, List, Any, Tuple, Optional
from collections import Counter
import logging

logger = logging.getLogger(__name__)

# Pitch class names
PITCH_CLASSES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

# Major scale intervals from root
MAJOR_SCALE = [0, 2, 4, 5, 7, 9, 11]

# Minor scale intervals (natural minor)
MINOR_SCALE = [0, 2, 3, 5, 7, 8, 10]

# Krumhansl-Schmuckler key profiles
# These represent how often each pitch class appears in major/minor keys
MAJOR_PROFILE = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
MINOR_PROFILE = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])

# Roman numeral labels for scale degrees
MAJOR_NUMERALS = ['I', 'ii', 'iii', 'IV', 'V', 'vi', 'vii°']
MINOR_NUMERALS = ['i', 'ii°', 'III', 'iv', 'v', 'VI', 'VII']


def detect_key(notes: List[Dict]) -> Dict[str, Any]:
    """
    Detect the key of a piece using Krumhansl-Schmuckler algorithm.

    Args:
        notes: List of note dicts with pitch, duration

    Returns:
        Key detection result with name, mode, confidence, and alternatives
    """
    if not notes:
        return {
            "key": "C",
            "mode": "major",
            "confidence": 0,
            "correlation": 0,
            "alternatives": []
        }

    # Build pitch class distribution weighted by duration
    pc_distribution = np.zeros(12)
    for note in notes:
        pc = note["pitch"] % 12
        weight = note.get("duration", 1.0)
        pc_distribution[pc] += weight

    # Normalize
    total = np.sum(pc_distribution)
    if total > 0:
        pc_distribution = pc_distribution / total

    # Correlate with all major and minor key profiles
    correlations = []

    for root in range(12):
        # Rotate distribution to align with this root
        rotated = np.roll(pc_distribution, -root)

        # Correlate with major profile
        major_corr = np.corrcoef(rotated, MAJOR_PROFILE)[0, 1]
        correlations.append({
            "key": PITCH_CLASSES[root],
            "mode": "major",
            "correlation": float(major_corr) if not np.isnan(major_corr) else 0
        })

        # Correlate with minor profile
        minor_corr = np.corrcoef(rotated, MINOR_PROFILE)[0, 1]
        correlations.append({
            "key": PITCH_CLASSES[root],
            "mode": "minor",
            "correlation": float(minor_corr) if not np.isnan(minor_corr) else 0
        })

    # Sort by correlation
    correlations.sort(key=lambda x: x["correlation"], reverse=True)

    # Best match
    best = correlations[0]

    # Confidence: difference between best and second-best
    confidence = best["correlation"] - correlations[1]["correlation"]

    return {
        "key": best["key"],
        "mode": best["mode"],
        "full_name": f"{best['key']} {best['mode']}",
        "correlation": round(best["correlation"], 3),
        "confidence": round(confidence, 3),
        "pitch_class_distribution": pc_distribution.tolist(),
        "alternatives": correlations[1:6]  # Top 5 alternatives
    }


def analyze_chords(
    notes: List[Dict],
    key: Optional[str] = None,
    mode: Optional[str] = None,
    window_size: float = 0.5
) -> Dict[str, Any]:
    """
    Analyze chords and progressions.

    Args:
        notes: List of note dicts
        key: Detected or specified key (e.g., "C")
        mode: "major" or "minor"
        window_size: Time window for chord detection

    Returns:
        Chord analysis including progression, types, and roman numerals
    """
    if not notes:
        return {
            "chords": [],
            "progression": [],
            "chord_type_distribution": {},
            "most_common_progression": None
        }

    # Auto-detect key if not provided
    if key is None:
        key_info = detect_key(notes)
        key = key_info["key"]
        mode = key_info["mode"]

    key_root = PITCH_CLASSES.index(key)

    # Group notes into time windows
    sorted_notes = sorted(notes, key=lambda n: n["time"])
    min_time = sorted_notes[0]["time"]
    max_time = max(n["time"] + n["duration"] for n in sorted_notes)

    chords = []
    current_time = min_time

    while current_time < max_time:
        window_end = current_time + window_size

        # Get notes in this window
        window_notes = [
            n for n in sorted_notes
            if n["time"] < window_end and n["time"] + n["duration"] > current_time
        ]

        if window_notes:
            # Get pitch classes
            pcs = list(set(n["pitch"] % 12 for n in window_notes))

            if len(pcs) >= 2:
                # Classify chord
                chord_type, root = _classify_chord(pcs)

                # Get roman numeral
                if root is not None:
                    scale_degree = (root - key_root) % 12
                    roman = _get_roman_numeral(scale_degree, chord_type, mode)
                else:
                    roman = "?"

                chords.append({
                    "time": current_time,
                    "duration": window_size,
                    "pitch_classes": pcs,
                    "root": PITCH_CLASSES[root] if root is not None else None,
                    "type": chord_type,
                    "roman_numeral": roman,
                    "full_name": f"{PITCH_CLASSES[root] if root else '?'}{_chord_suffix(chord_type)}"
                })

        current_time += window_size

    # Build progression (list of roman numerals)
    progression = [c["roman_numeral"] for c in chords if c["roman_numeral"] != "?"]

    # Chord type distribution
    type_counts = Counter(c["type"] for c in chords)
    total_chords = len(chords)
    type_distribution = {
        t: round(count / total_chords, 3) if total_chords > 0 else 0
        for t, count in type_counts.items()
    }

    # Find common progressions (2-4 chord patterns)
    common_progressions = _find_common_progressions(progression)

    return {
        "key": key,
        "mode": mode,
        "chords": chords,
        "progression": progression,
        "chord_type_distribution": type_distribution,
        "common_progressions": common_progressions
    }


def _classify_chord(pitch_classes: List[int]) -> Tuple[str, Optional[int]]:
    """Classify a chord by its pitch classes"""
    if len(pitch_classes) < 2:
        return ("single", pitch_classes[0] if pitch_classes else None)

    pcs = set(pitch_classes)

    for root in range(12):
        # Major triad
        if {root, (root + 4) % 12, (root + 7) % 12} <= pcs:
            if (root + 11) % 12 in pcs:
                return ("major7", root)
            if (root + 10) % 12 in pcs:
                return ("dominant7", root)
            return ("major", root)

        # Minor triad
        if {root, (root + 3) % 12, (root + 7) % 12} <= pcs:
            if (root + 10) % 12 in pcs:
                return ("minor7", root)
            return ("minor", root)

        # Diminished
        if {root, (root + 3) % 12, (root + 6) % 12} <= pcs:
            return ("diminished", root)

        # Augmented
        if {root, (root + 4) % 12, (root + 8) % 12} <= pcs:
            return ("augmented", root)

        # Sus4
        if {root, (root + 5) % 12, (root + 7) % 12} == pcs:
            return ("sus4", root)

        # Sus2
        if {root, (root + 2) % 12, (root + 7) % 12} == pcs:
            return ("sus2", root)

        # Power chord
        if {root, (root + 7) % 12} == pcs:
            return ("power", root)

    return ("other", min(pitch_classes))


def _get_roman_numeral(scale_degree: int, chord_type: str, mode: str) -> str:
    """Get roman numeral for a chord in a key"""
    # Map semitones to scale degrees
    if mode == "major":
        degree_map = {0: 0, 2: 1, 4: 2, 5: 3, 7: 4, 9: 5, 11: 6}
    else:
        degree_map = {0: 0, 2: 1, 3: 2, 5: 3, 7: 4, 8: 5, 10: 6}

    if scale_degree not in degree_map:
        # Chromatic chord
        base = ["I", "bII", "II", "bIII", "III", "IV", "#IV", "V", "bVI", "VI", "bVII", "VII"]
        numeral = base[scale_degree]
    else:
        idx = degree_map[scale_degree]
        if mode == "major":
            numeral = MAJOR_NUMERALS[idx]
        else:
            numeral = MINOR_NUMERALS[idx]

    # Modify based on chord type
    if chord_type in ["major", "major7"]:
        numeral = numeral.upper().replace("°", "")
    elif chord_type in ["minor", "minor7"]:
        numeral = numeral.lower().replace("°", "")
    elif chord_type == "diminished":
        numeral = numeral.lower() + "°"
    elif chord_type == "augmented":
        numeral = numeral.upper() + "+"
    elif chord_type == "dominant7":
        numeral = numeral.upper() + "7"

    return numeral


def _chord_suffix(chord_type: str) -> str:
    """Get chord suffix for display"""
    suffixes = {
        "major": "",
        "minor": "m",
        "diminished": "dim",
        "augmented": "aug",
        "major7": "maj7",
        "minor7": "m7",
        "dominant7": "7",
        "sus2": "sus2",
        "sus4": "sus4",
        "power": "5",
        "other": "?"
    }
    return suffixes.get(chord_type, "")


def _find_common_progressions(progression: List[str], min_length: int = 2, max_length: int = 4) -> List[Dict]:
    """Find common chord progressions"""
    if len(progression) < min_length:
        return []

    patterns = Counter()

    for length in range(min_length, min(max_length + 1, len(progression) + 1)):
        for i in range(len(progression) - length + 1):
            pattern = tuple(progression[i:i+length])
            patterns[pattern] += 1

    # Filter to patterns that occur more than once
    common = [
        {"pattern": list(p), "count": c}
        for p, c in patterns.most_common(10)
        if c > 1
    ]

    return common


def get_scale_notes(key: str, mode: str) -> List[str]:
    """Get the notes in a scale"""
    root = PITCH_CLASSES.index(key)
    intervals = MAJOR_SCALE if mode == "major" else MINOR_SCALE

    return [PITCH_CLASSES[(root + i) % 12] for i in intervals]


def get_diatonic_chords(key: str, mode: str) -> List[Dict]:
    """Get the diatonic chords for a key"""
    root = PITCH_CLASSES.index(key)

    if mode == "major":
        chord_types = ["major", "minor", "minor", "major", "major", "minor", "diminished"]
        numerals = MAJOR_NUMERALS
    else:
        chord_types = ["minor", "diminished", "major", "minor", "minor", "major", "major"]
        numerals = MINOR_NUMERALS

    intervals = MAJOR_SCALE if mode == "major" else MINOR_SCALE

    chords = []
    for i, interval in enumerate(intervals):
        chord_root = (root + interval) % 12
        chords.append({
            "degree": i + 1,
            "roman_numeral": numerals[i],
            "root": PITCH_CLASSES[chord_root],
            "type": chord_types[i],
            "full_name": f"{PITCH_CLASSES[chord_root]}{_chord_suffix(chord_types[i])}"
        })

    return chords
