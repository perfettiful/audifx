"""Job state management and metadata store"""
import json
import os
from dataclasses import dataclass, asdict
from datetime import datetime
from enum import Enum
from pathlib import Path
from typing import Optional, Dict, Any
from threading import Lock

class JobStatus(str, Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"

@dataclass
class JobMetadata:
    job_id: str
    status: JobStatus
    progress: float
    message: str
    created_at: str
    updated_at: str
    error: Optional[str] = None
    result: Optional[Dict[str, Any]] = None

class JobStore:
    """Thread-safe in-memory job state store with disk persistence"""

    def __init__(self, artifacts_dir: str):
        self.artifacts_dir = Path(artifacts_dir)
        self.artifacts_dir.mkdir(parents=True, exist_ok=True)
        self._jobs: Dict[str, JobMetadata] = {}
        self._lock = Lock()

    def create_job(self, job_id: str) -> JobMetadata:
        """Create a new job with pending status"""
        now = datetime.utcnow().isoformat()
        job = JobMetadata(
            job_id=job_id,
            status=JobStatus.PENDING,
            progress=0.0,
            message="Job created",
            created_at=now,
            updated_at=now
        )

        with self._lock:
            self._jobs[job_id] = job
            self._persist_job(job)

        return job

    def update_job(
        self,
        job_id: str,
        status: Optional[JobStatus] = None,
        progress: Optional[float] = None,
        message: Optional[str] = None,
        error: Optional[str] = None,
        result: Optional[Dict[str, Any]] = None
    ) -> Optional[JobMetadata]:
        """Update job metadata"""
        with self._lock:
            if job_id not in self._jobs:
                return None

            job = self._jobs[job_id]

            if status is not None:
                job.status = status
            if progress is not None:
                job.progress = progress
            if message is not None:
                job.message = message
            if error is not None:
                job.error = error
            if result is not None:
                job.result = result

            job.updated_at = datetime.utcnow().isoformat()

            self._persist_job(job)
            return job

    def get_job(self, job_id: str) -> Optional[JobMetadata]:
        """Get job metadata"""
        with self._lock:
            return self._jobs.get(job_id)

    def list_jobs(self) -> list[JobMetadata]:
        """List all jobs"""
        with self._lock:
            return list(self._jobs.values())

    def _persist_job(self, job: JobMetadata):
        """Persist job metadata to disk"""
        job_dir = self.artifacts_dir / job.job_id
        job_dir.mkdir(parents=True, exist_ok=True)

        meta_path = job_dir / "metadata.json"
        with open(meta_path, "w") as f:
            json.dump(asdict(job), f, indent=2)

    def _job_dir(self, job_id: str) -> Path:
        """Get job artifact directory"""
        return self.artifacts_dir / job_id

# Global job store instance
_store: Optional[JobStore] = None

def init_store(artifacts_dir: str):
    """Initialize global job store"""
    global _store
    _store = JobStore(artifacts_dir)

def get_store() -> JobStore:
    """Get global job store instance"""
    if _store is None:
        raise RuntimeError("JobStore not initialized. Call init_store() first.")
    return _store
