"""Stem separation using Demucs"""
import subprocess
import logging
from pathlib import Path
from typing import Dict, List
import os

logger = logging.getLogger(__name__)

class DemucsWrapper:
    """Wrapper for Demucs stem separation"""

    def __init__(self, device: str = "cuda", model: str = "htdemucs"):
        """
        Initialize Demucs wrapper

        Args:
            device: 'cuda' or 'cpu'
            model: Demucs model name (htdemucs, htdemucs_ft, mdx_extra)
        """
        self.device = device
        self.model = model

    def separate(
        self,
        audio_path: Path,
        output_dir: Path,
        stems: List[str] = None
    ) -> Dict[str, Path]:
        """
        Separate audio into stems

        Args:
            audio_path: Path to input audio
            output_dir: Directory for output stems
            stems: List of stems to extract (default: all 4)

        Returns:
            Dict mapping stem name to file path
        """
        if stems is None:
            stems = ["vocals", "bass", "drums", "other"]

        output_dir.mkdir(parents=True, exist_ok=True)

        logger.info(f"Separating stems with Demucs ({self.model})")
        logger.info(f"Input: {audio_path}")
        logger.info(f"Output: {output_dir}")

        # Build Demucs command
        cmd = [
            "demucs",
            "--two-stems", "vocals",  # Faster initial separation
            "-n", self.model,
            "--device", self.device,
            "-o", str(output_dir),
            str(audio_path)
        ]

        try:
            # Run Demucs
            result = subprocess.run(
                cmd,
                check=True,
                capture_output=True,
                text=True,
                env={**os.environ, "PYTORCH_CUDA_ALLOC_CONF": "max_split_size_mb:512"}
            )

            logger.info("Demucs separation complete")

            # Demucs outputs to: output_dir/model_name/audio_name/{stem}.wav
            audio_name = audio_path.stem
            demucs_output = output_dir / self.model / audio_name

            # Map stems to output paths
            stem_paths = {}

            # First separation gives us vocals and no_vocals
            if (demucs_output / "vocals.wav").exists():
                stem_paths["vocals"] = demucs_output / "vocals.wav"

            if (demucs_output / "no_vocals.wav").exists():
                # Run second pass on no_vocals to get bass, drums, other
                logger.info("Running second pass for bass/drums/other")
                self._separate_instrumental(
                    demucs_output / "no_vocals.wav",
                    output_dir
                )

                # Map remaining stems
                instrumental_output = output_dir / self.model / "no_vocals"
                if (instrumental_output / "bass.wav").exists():
                    stem_paths["bass"] = instrumental_output / "bass.wav"
                if (instrumental_output / "drums.wav").exists():
                    stem_paths["drums"] = instrumental_output / "drums.wav"
                if (instrumental_output / "other.wav").exists():
                    stem_paths["other"] = instrumental_output / "other.wav"

            logger.info(f"Extracted stems: {list(stem_paths.keys())}")
            return stem_paths

        except subprocess.CalledProcessError as e:
            logger.error(f"Demucs failed: {e.stderr}")
            raise RuntimeError(f"Stem separation failed: {e.stderr}")

    def _separate_instrumental(self, audio_path: Path, output_dir: Path):
        """Separate non-vocal stems (bass, drums, other)"""
        cmd = [
            "demucs",
            "-n", self.model,
            "--device", self.device,
            "-o", str(output_dir),
            str(audio_path)
        ]

        subprocess.run(cmd, check=True, capture_output=True)

def separate_stems(
    job_id: str,
    audio_path: Path,
    output_dir: Path,
    device: str = "cuda"
) -> Dict[str, Path]:
    """
    High-level stem separation function

    Args:
        job_id: Job identifier
        audio_path: Input audio file
        output_dir: Output directory
        device: 'cuda' or 'cpu'

    Returns:
        Dict of stem paths
    """
    separator = DemucsWrapper(device=device)
    return separator.separate(audio_path, output_dir)
