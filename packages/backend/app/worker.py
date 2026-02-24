"""Background worker for processing jobs"""
import logging
import queue
import threading
from typing import Optional

from app.jobs.state import get_store, JobStatus
from app.pipeline import run_pipeline

logger = logging.getLogger(__name__)

class Worker:
    """Background worker thread for processing jobs"""

    def __init__(self, device: str = "cuda", max_concurrent: int = 1):
        """
        Initialize worker

        Args:
            device: 'cuda' or 'cpu'
            max_concurrent: Maximum concurrent jobs (usually 1 for GPU)
        """
        self.device = device
        self.max_concurrent = max_concurrent
        self.queue = queue.Queue()
        self.threads = []
        self.running = False

    def start(self):
        """Start worker threads"""
        if self.running:
            logger.warning("Worker already running")
            return

        self.running = True

        for i in range(self.max_concurrent):
            thread = threading.Thread(
                target=self._worker_loop,
                name=f"Worker-{i}",
                daemon=True
            )
            thread.start()
            self.threads.append(thread)

        logger.info(f"Started {self.max_concurrent} worker thread(s)")

    def stop(self):
        """Stop worker threads"""
        self.running = False

        # Send stop signals
        for _ in self.threads:
            self.queue.put(None)

        # Wait for threads to finish
        for thread in self.threads:
            thread.join(timeout=5.0)

        logger.info("Worker threads stopped")

    def enqueue(self, job_id: str):
        """
        Enqueue a job for processing

        Args:
            job_id: Job identifier
        """
        logger.info(f"Enqueuing job: {job_id}")
        self.queue.put(job_id)

    def _worker_loop(self):
        """Worker thread main loop"""
        store = get_store()

        while self.running:
            try:
                # Get next job (blocking with timeout)
                job_id = self.queue.get(timeout=1.0)

                if job_id is None:
                    # Stop signal
                    break

                logger.info(f"Processing job: {job_id}")

                # Update status callback
                def update_status(jid, status, progress, message, error=None, result=None):
                    store.update_job(
                        jid,
                        status=status,
                        progress=progress,
                        message=message,
                        error=error,
                        result=result
                    )

                # Run pipeline
                try:
                    run_pipeline(job_id, update_status, device=self.device)
                except Exception as e:
                    logger.error(f"Job {job_id} failed: {e}", exc_info=True)

                self.queue.task_done()

            except queue.Empty:
                # No jobs available, continue waiting
                continue
            except Exception as e:
                logger.error(f"Worker error: {e}", exc_info=True)

# Global worker instance
_worker: Optional[Worker] = None

def init_worker(device: str = "cuda", max_concurrent: int = 1):
    """Initialize and start global worker"""
    global _worker
    _worker = Worker(device=device, max_concurrent=max_concurrent)
    _worker.start()

def get_worker() -> Worker:
    """Get global worker instance"""
    if _worker is None:
        raise RuntimeError("Worker not initialized")
    return _worker

def shutdown_worker():
    """Shutdown global worker"""
    if _worker is not None:
        _worker.stop()
