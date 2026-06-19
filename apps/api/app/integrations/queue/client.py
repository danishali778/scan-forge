from celery import Celery

from app.core.config import get_settings


class QueueClient:
    def enqueue_session_plan(self, *, job_id: str) -> str | None:
        raise NotImplementedError

    def enqueue_tool_execute(self, *, job_id: str) -> str | None:
        raise NotImplementedError

    def enqueue_agent_run(self, *, job_id: str) -> str | None:
        raise NotImplementedError

    def enqueue_finding_proposal(self, *, job_id: str) -> str | None:
        raise NotImplementedError

    def enqueue_report_render(self, *, job_id: str) -> str | None:
        raise NotImplementedError

    def enqueue_memory_embed(self, *, job_id: str) -> str | None:
        raise NotImplementedError


class CeleryQueueClient(QueueClient):
    def __init__(self) -> None:
        settings = get_settings()
        self._celery = Celery("pentagi_api_queue", broker=settings.celery_broker_url)

    def enqueue_session_plan(self, *, job_id: str) -> str | None:
        result = self._celery.send_task("agent.plan_session", args=[job_id])
        return result.id

    def enqueue_tool_execute(self, *, job_id: str) -> str | None:
        result = self._celery.send_task("tools.execute", args=[job_id])
        return result.id

    def enqueue_agent_run(self, *, job_id: str) -> str | None:
        result = self._celery.send_task("agent.run_session", args=[job_id])
        return result.id

    def enqueue_finding_proposal(self, *, job_id: str) -> str | None:
        result = self._celery.send_task("findings.propose_from_evidence", args=[job_id])
        return result.id

    def enqueue_report_render(self, *, job_id: str) -> str | None:
        result = self._celery.send_task("reports.render", args=[job_id])
        return result.id

    def enqueue_memory_embed(self, *, job_id: str) -> str | None:
        result = self._celery.send_task("memory.embed_document", args=[job_id])
        return result.id
