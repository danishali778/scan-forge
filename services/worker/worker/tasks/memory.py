from app.db.session import get_session_factory
from app.services.memory import MemoryEmbedDocumentRunner

from worker.celery_app import celery_app


@celery_app.task(bind=True, name="memory.embed_document")
def embed_memory_document(self, job_id: str) -> bool:
    """Embed an approved memory document into searchable chunks."""
    db = get_session_factory()()
    try:
        worker_id = getattr(self.request, "hostname", None) or "celery-worker"
        return MemoryEmbedDocumentRunner(db=db, worker_id=worker_id).run(job_id=job_id)
    finally:
        db.close()
