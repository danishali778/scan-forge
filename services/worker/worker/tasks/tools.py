from app.db.session import get_session_factory
from app.services.runtime import ToolExecutionRunner

from worker.celery_app import celery_app


@celery_app.task(bind=True, name="tools.execute")
def execute_tool_call(self, job_id: str) -> bool:
    """Execute a queued Phase 4 tool call through the runtime service."""
    db = get_session_factory()()
    try:
        worker_id = getattr(self.request, "hostname", None) or "celery-worker"
        return ToolExecutionRunner(db=db, worker_id=worker_id).run(job_id=job_id)
    finally:
        db.close()
