from app.db.session import get_session_factory
from app.services.sessions.planner import PlanSessionRunner

from worker.celery_app import celery_app
from worker.config import get_settings


@celery_app.task(bind=True, name="sessions.plan")
def plan_session(self, job_id: str) -> bool:
    """Run the deterministic Phase 3 planning job."""
    db = get_session_factory()()
    try:
        worker_id = getattr(self.request, "hostname", None) or "celery-worker"
        return PlanSessionRunner(db=db, worker_id=worker_id).run(job_id=job_id)
    finally:
        db.close()


@celery_app.task(name="sessions.run")
def run_session(session_id: str) -> None:
    """Placeholder for the first session execution job."""
    raise NotImplementedError(f"Session execution is not implemented yet: {session_id}")


@celery_app.task(bind=True, name="jobs.reconcile_stale")
def reconcile_stale_jobs(self) -> int:
    """Mark stale running jobs failed so product state remains recoverable."""
    db = get_session_factory()()
    try:
        settings = get_settings()
        worker_id = getattr(self.request, "hostname", None) or "celery-worker"
        return PlanSessionRunner(db=db, worker_id=worker_id).reconcile_stale(
            stale_seconds=settings.job_stale_seconds,
        )
    finally:
        db.close()
