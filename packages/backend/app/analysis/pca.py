"""PCA computation for music feature dimensionality reduction"""

import numpy as np
from typing import Dict, List, Any, Optional
from sklearn.preprocessing import StandardScaler
from sklearn.decomposition import PCA
import logging

logger = logging.getLogger(__name__)


def compute_pca(
    features_by_voice: Dict[str, Dict],
    n_components: int = 3,
    segment_duration: float = 4.0
) -> Dict[str, Any]:
    """
    Compute PCA on extracted features.

    Args:
        features_by_voice: Dict mapping voice_id to feature dicts
        n_components: Number of PCA components (2 or 3)
        segment_duration: Duration of time segments for trajectory analysis

    Returns:
        PCA results including coordinates, loadings, and explained variance
    """
    # Build feature matrix from voices
    voice_ids = []
    feature_vectors = []
    feature_names = []

    for voice_id, features in features_by_voice.items():
        if features["note_count"] == 0:
            continue

        # Extract numerical features into a vector
        vector, names = _features_to_vector(features)
        voice_ids.append(voice_id)
        feature_vectors.append(vector)

        if not feature_names:
            feature_names = names

    if len(feature_vectors) < 2:
        logger.warning("Not enough voices for PCA (need at least 2)")
        return _empty_pca_result()

    # Convert to numpy array
    X = np.array(feature_vectors)

    # Normalize features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # Apply PCA
    n_components = min(n_components, X_scaled.shape[0], X_scaled.shape[1])
    pca = PCA(n_components=n_components)
    X_pca = pca.fit_transform(X_scaled)

    # Build results
    coordinates = []
    for i, voice_id in enumerate(voice_ids):
        coord = {
            "voice_id": voice_id,
            "x": float(X_pca[i, 0]) if n_components > 0 else 0,
            "y": float(X_pca[i, 1]) if n_components > 1 else 0,
            "z": float(X_pca[i, 2]) if n_components > 2 else 0
        }
        coordinates.append(coord)

    # Feature loadings (which features contribute most to each PC)
    loadings = {}
    for i, name in enumerate(feature_names):
        loadings[name] = {
            "PC1": float(pca.components_[0, i]) if n_components > 0 else 0,
            "PC2": float(pca.components_[1, i]) if n_components > 1 else 0,
            "PC3": float(pca.components_[2, i]) if n_components > 2 else 0
        }

    # Top contributing features per component
    top_features = []
    for pc_idx in range(n_components):
        abs_loadings = np.abs(pca.components_[pc_idx])
        top_indices = np.argsort(abs_loadings)[::-1][:5]
        top_features.append({
            "component": f"PC{pc_idx + 1}",
            "features": [
                {
                    "name": feature_names[idx],
                    "loading": float(pca.components_[pc_idx, idx])
                }
                for idx in top_indices
            ]
        })

    return {
        "coordinates": coordinates,
        "explained_variance": [float(v) for v in pca.explained_variance_ratio_],
        "total_variance_explained": float(sum(pca.explained_variance_ratio_)),
        "loadings": loadings,
        "top_features": top_features,
        "n_components": n_components,
        "n_voices": len(voice_ids)
    }


def compute_pca_trajectory(
    time_series: List[Dict],
    window_size: float = 4.0,
    hop_size: float = 1.0,
    n_components: int = 3
) -> Dict[str, Any]:
    """
    Compute PCA trajectory over time windows.

    Args:
        time_series: List of notes with time info
        window_size: Size of each time window in seconds
        hop_size: Step size between windows
        n_components: Number of PCA components

    Returns:
        PCA trajectory data for animation
    """
    if not time_series:
        return {"trajectory": [], "explained_variance": []}

    # Sort by time
    sorted_notes = sorted(time_series, key=lambda n: n["time"])

    # Get time range
    min_time = sorted_notes[0]["time"]
    max_time = max(n["time"] + n["duration"] for n in sorted_notes)

    # Create windows
    windows = []
    window_times = []
    current_time = min_time

    while current_time < max_time:
        window_end = current_time + window_size
        window_notes = [
            n for n in sorted_notes
            if n["time"] >= current_time and n["time"] < window_end
        ]

        if window_notes:
            # Extract features for this window
            features = _extract_window_features(window_notes)
            windows.append(features)
            window_times.append(current_time + window_size / 2)  # Center time

        current_time += hop_size

    if len(windows) < 2:
        return {"trajectory": [], "explained_variance": []}

    # Build feature matrix
    feature_names = list(windows[0].keys())
    X = np.array([[w[f] for f in feature_names] for w in windows])

    # Handle constant features
    std = np.std(X, axis=0)
    valid_features = std > 0
    X = X[:, valid_features]
    feature_names = [f for f, v in zip(feature_names, valid_features) if v]

    if X.shape[1] < n_components:
        return {"trajectory": [], "explained_variance": []}

    # Normalize and PCA
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    n_components = min(n_components, X_scaled.shape[0], X_scaled.shape[1])
    pca = PCA(n_components=n_components)
    X_pca = pca.fit_transform(X_scaled)

    # Build trajectory
    trajectory = []
    for i, t in enumerate(window_times):
        point = {
            "time": float(t),
            "x": float(X_pca[i, 0]) if n_components > 0 else 0,
            "y": float(X_pca[i, 1]) if n_components > 1 else 0,
            "z": float(X_pca[i, 2]) if n_components > 2 else 0
        }
        trajectory.append(point)

    return {
        "trajectory": trajectory,
        "explained_variance": [float(v) for v in pca.explained_variance_ratio_],
        "window_size": window_size,
        "hop_size": hop_size
    }


def _features_to_vector(features: Dict) -> tuple:
    """Convert feature dict to numerical vector"""
    vector = []
    names = []

    # Pitch features
    pitch = features.get("pitch", {})
    for key in ["mean", "std", "range", "skewness", "kurtosis"]:
        vector.append(pitch.get(key, 0))
        names.append(f"pitch_{key}")

    # Interval features
    intervals = features.get("intervals", {})
    for key in ["mean", "std", "stepwise_ratio", "leap_ratio", "consonance_ratio"]:
        vector.append(intervals.get(key, 0))
        names.append(f"interval_{key}")

    # Rhythm features
    rhythm = features.get("rhythm", {})
    for key in ["note_density", "avg_duration", "duration_std", "rest_ratio"]:
        vector.append(rhythm.get(key, 0))
        names.append(f"rhythm_{key}")

    # Dynamics features
    dynamics = features.get("dynamics", {})
    for key in ["mean_velocity", "velocity_std"]:
        vector.append(dynamics.get(key, 0))
        names.append(f"dynamics_{key}")

    # Pitch class distribution (chromagram) - simplified to top 3
    histograms = features.get("histograms", {})
    pc_hist = histograms.get("pitch_class", [0] * 12)
    if pc_hist:
        # Add entropy of pitch class distribution
        pc_array = np.array(pc_hist)
        pc_array = pc_array[pc_array > 0]
        if len(pc_array) > 0:
            entropy = -np.sum(pc_array * np.log2(pc_array + 1e-10))
        else:
            entropy = 0
        vector.append(entropy)
        names.append("pitch_class_entropy")

    return vector, names


def _extract_window_features(notes: List[Dict]) -> Dict[str, float]:
    """Extract simple features from a time window of notes"""
    if not notes:
        return {}

    pitches = [n["pitch"] for n in notes]
    velocities = [n["velocity"] for n in notes]
    durations = [n["duration"] for n in notes]
    pitch_classes = [p % 12 for p in pitches]

    features = {
        "pitch_mean": np.mean(pitches),
        "pitch_std": np.std(pitches) if len(pitches) > 1 else 0,
        "pitch_range": max(pitches) - min(pitches) if pitches else 0,
        "velocity_mean": np.mean(velocities),
        "note_count": len(notes),
        "duration_mean": np.mean(durations),
        "unique_pitch_classes": len(set(pitch_classes))
    }

    # Pitch class centroid (circular mean on circle of fifths)
    fifths = [(pc * 7) % 12 for pc in pitch_classes]
    if fifths:
        angles = [f * 2 * np.pi / 12 for f in fifths]
        features["fifths_centroid_x"] = np.mean(np.cos(angles))
        features["fifths_centroid_y"] = np.mean(np.sin(angles))

    return features


def _empty_pca_result() -> Dict[str, Any]:
    """Return empty PCA result"""
    return {
        "coordinates": [],
        "explained_variance": [],
        "total_variance_explained": 0,
        "loadings": {},
        "top_features": [],
        "n_components": 0,
        "n_voices": 0
    }
