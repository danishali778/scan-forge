from app.db.session import get_session_factory
from app.services.agents import AgentRunSessionRunner
from app.services.sessions.planner import PlanSessionRunner

from worker.celery_app import celery_app


@celery_app.task(bind=True, name="agent.plan_session")
def plan_session(self, job_id: str) -> bool:
    """Run Phase 5-aware planning with provider fallback."""
    db = get_session_factory()()
    try:
        worker_id = getattr(self.request, "hostname", None) or "celery-worker"
        return PlanSessionRunner(db=db, worker_id=worker_id).run(job_id=job_id)
    finally:
        db.close()


@celery_app.task(bind=True, name="agent.run_session")
def run_session(self, job_id: str) -> bool:
    """Run a bounded assisted agent loop."""
    db = get_session_factory()()
    try:
        worker_id = getattr(self.request, "hostname", None) or "celery-worker"
        return AgentRunSessionRunner(db=db, worker_id=worker_id).run(job_id=job_id)
    finally:
        db.close()
