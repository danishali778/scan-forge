from app.db.session import get_session_factory
from app.services.review import CandidateFindingRunner, ReportRenderRunner

from worker.celery_app import celery_app


@celery_app.task(bind=True, name="findings.propose_from_evidence")
def propose_finding_from_evidence(self, job_id: str) -> bool:
    """Create a candidate finding from linked evidence."""
    db = get_session_factory()()
    try:
        worker_id = getattr(self.request, "hostname", None) or "celery-worker"
        return CandidateFindingRunner(db=db, worker_id=worker_id).run(job_id=job_id)
    finally:
        db.close()


@celery_app.task(bind=True, name="reports.render")
def render_report(self, job_id: str) -> bool:
    """Render a deterministic report and store Markdown/JSON exports."""
    db = get_session_factory()()
    try:
        worker_id = getattr(self.request, "hostname", None) or "celery-worker"
        return ReportRenderRunner(db=db, worker_id=worker_id).run(job_id=job_id)
    finally:
        db.close()
