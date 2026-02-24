"""Local LLM integration for label refinement and structure detection"""
import json
import logging
from typing import Dict, Any, List, Optional
from pathlib import Path

logger = logging.getLogger(__name__)

class LocalLLM:
    """Local LLM client using llama.cpp"""

    def __init__(
        self,
        model_path: Optional[str] = None,
        context_size: int = 2048,
        use_gpu: bool = True
    ):
        """
        Initialize local LLM

        Args:
            model_path: Path to GGUF model file
            context_size: Context window size
            use_gpu: Use GPU acceleration
        """
        self.model_path = model_path
        self.context_size = context_size
        self.use_gpu = use_gpu
        self.llm = None

        if model_path and Path(model_path).exists():
            self._init_model()

    def _init_model(self):
        """Initialize llama.cpp model"""
        try:
            from llama_cpp import Llama

            logger.info(f"Loading LLM from {self.model_path}")

            self.llm = Llama(
                model_path=self.model_path,
                n_ctx=self.context_size,
                n_gpu_layers=-1 if self.use_gpu else 0,
                verbose=False
            )

            logger.info("LLM loaded successfully")

        except ImportError:
            logger.warning("llama-cpp-python not installed, LLM features disabled")
            self.llm = None
        except Exception as e:
            logger.error(f"Failed to load LLM: {e}")
            self.llm = None

    def refine_labels(self, tracks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Refine track labels using LLM

        Args:
            tracks: List of track dicts

        Returns:
            Tracks with refined labels
        """
        if not self.llm:
            logger.info("LLM not available, skipping label refinement")
            return tracks

        # Build prompt
        track_summary = []
        for track in tracks:
            track_summary.append({
                "id": track["voice"],
                "current_label": track["label"],
                "note_count": len(track["notes"]),
                "avg_pitch": self._avg_pitch(track["notes"])
            })

        prompt = self._build_label_prompt(track_summary)

        try:
            # Run inference
            response = self.llm(
                prompt,
                max_tokens=256,
                temperature=0.3,
                stop=["</response>"]
            )

            # Parse response
            refined = self._parse_label_response(response["choices"][0]["text"])

            # Apply refined labels
            for track in tracks:
                if track["voice"] in refined:
                    track["label"] = refined[track["voice"]]

            logger.info(f"LLM refined labels: {refined}")

        except Exception as e:
            logger.error(f"LLM label refinement failed: {e}")

        return tracks

    def detect_structure(
        self,
        tracks: List[Dict[str, Any]],
        duration: float
    ) -> List[Dict[str, Any]]:
        """
        Detect song structure (verse, chorus, etc.)

        Args:
            tracks: List of track dicts
            duration: Total song duration

        Returns:
            List of section dicts
        """
        if not self.llm:
            logger.info("LLM not available, using default structure")
            return self._default_structure(duration)

        # Build prompt
        prompt = self._build_structure_prompt(tracks, duration)

        try:
            response = self.llm(
                prompt,
                max_tokens=512,
                temperature=0.4,
                stop=["</response>"]
            )

            sections = self._parse_structure_response(response["choices"][0]["text"])
            logger.info(f"LLM detected {len(sections)} sections")
            return sections

        except Exception as e:
            logger.error(f"LLM structure detection failed: {e}")
            return self._default_structure(duration)

    def _build_label_prompt(self, track_summary: List[Dict]) -> str:
        """Build prompt for label refinement"""
        return f"""You are analyzing separated audio stems from a pop song. Refine the track labels to be more specific and accurate.

Track data:
{json.dumps(track_summary, indent=2)}

Instructions:
- "other" tracks could be: Keys, Piano, Guitar, Synth, Strings, etc.
- Choose labels that match typical pop music instrumentation
- Keep labels concise (1-2 words)
- Return JSON only

Response format:
{{"vocals": "Lead Vocals", "bass": "Bass", "other": "Piano", "drums": "Drums"}}

<response>"""

    def _build_structure_prompt(self, tracks: List[Dict], duration: float) -> str:
        """Build prompt for structure detection"""
        # Simplified track info
        note_density = []
        for track in tracks:
            if track["notes"]:
                density = len(track["notes"]) / duration
                note_density.append(f"{track['voice']}: {density:.1f} notes/sec")

        return f"""Analyze this pop song and identify its structure (intro, verse, chorus, bridge, outro).

Duration: {duration:.1f} seconds
Track activity: {', '.join(note_density)}

Typical pop song structure is 3-4 minutes with:
- Intro (0-15s)
- Verse 1 (15-45s)
- Chorus (45-75s)
- Verse 2 (75-105s)
- Chorus (105-135s)
- Bridge (135-165s)
- Chorus (165-195s)
- Outro (195-210s)

Return JSON array of sections with start time (t0), end time (t1), and name.

<response>
[{{"t0": 0, "t1": 15, "name": "Intro"}}, ...]"""

    def _parse_label_response(self, text: str) -> Dict[str, str]:
        """Parse LLM label response"""
        try:
            # Extract JSON from response
            start = text.find("{")
            end = text.rfind("}") + 1
            if start >= 0 and end > start:
                return json.loads(text[start:end])
        except json.JSONDecodeError:
            pass

        return {}

    def _parse_structure_response(self, text: str) -> List[Dict[str, Any]]:
        """Parse LLM structure response"""
        try:
            # Extract JSON array
            start = text.find("[")
            end = text.rfind("]") + 1
            if start >= 0 and end > start:
                return json.loads(text[start:end])
        except json.JSONDecodeError:
            pass

        return []

    def _avg_pitch(self, notes: List[Dict]) -> float:
        """Calculate average pitch of notes"""
        if not notes:
            return 0.0
        return sum(n["pitch"] for n in notes) / len(notes)

    def _default_structure(self, duration: float) -> List[Dict[str, Any]]:
        """Generate default structure when LLM unavailable"""
        sections = []

        # Simple heuristic structure
        if duration < 60:
            sections.append({"t0": 0, "t1": duration, "name": "Full"})
        elif duration < 120:
            mid = duration / 2
            sections.append({"t0": 0, "t1": mid, "name": "Part A"})
            sections.append({"t0": mid, "t1": duration, "name": "Part B"})
        else:
            # Standard pop structure approximation
            sections.extend([
                {"t0": 0, "t1": 15, "name": "Intro"},
                {"t0": 15, "t1": duration * 0.33, "name": "Verse"},
                {"t0": duration * 0.33, "t1": duration * 0.66, "name": "Chorus"},
                {"t0": duration * 0.66, "t1": duration, "name": "Outro"}
            ])

        return sections

# Global LLM instance
_llm: Optional[LocalLLM] = None

def init_llm(model_path: Optional[str] = None, use_gpu: bool = True):
    """Initialize global LLM instance"""
    global _llm
    _llm = LocalLLM(model_path=model_path, use_gpu=use_gpu)

def get_llm() -> LocalLLM:
    """Get global LLM instance"""
    if _llm is None:
        raise RuntimeError("LLM not initialized")
    return _llm

def refine_with_llm(
    tracks: List[Dict[str, Any]],
    duration: float
) -> tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Refine tracks and detect structure using LLM

    Returns:
        (refined_tracks, sections)
    """
    try:
        llm = get_llm()
        refined_tracks = llm.refine_labels(tracks)
        sections = llm.detect_structure(refined_tracks, duration)
        return refined_tracks, sections
    except RuntimeError:
        # LLM not available, return defaults
        logger.info("LLM not available, using defaults")
        llm = LocalLLM()  # Uninitialized instance for default methods
        sections = llm._default_structure(duration)
        return tracks, sections
