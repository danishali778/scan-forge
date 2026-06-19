import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from app.agents.contracts import PlannerStepOutput
from app.agents.roles.planner import PlannerAgent
from app.core.config import get_settings
from app.repositories.control_plane import ConfigurationRepository
from app.repositories.memory import MemoryRepository
from app.repositories.sessions import SessionRepository
from app.services.agents.providers import load_session_provider
from app.services.memory.context import scoped_memory_context

DEFAULT_PLAN = [
    {
        "title": "Validate scope and objective",
        "description": "Confirm the session objective is bound to the approved scope.",
        "steps": [
            "Review project, scope, and target constraints",
            "Confirm the session objective can be planned safely",
        ],
    },
    {
        "title": "Prepare testing approach",
        "description": "Create a safe placeholder approach before runtime tools exist.",
        "steps": [
            "Outline non-invasive discovery activities",
            "Identify policy and provider configuration for later phases",
        ],
    },
    {
        "title": "Execution readiness",
        "description": "Prepare the session for future execution phases.",
        "steps": [
            "Prepare runtime readiness checklist",
            "Record next operator review point",
        ],
    },
]


class PlanSessionRunner:
    def __init__(self, *, db: Session, worker_id: str) -> None:
        self.db = db
        self.repository = SessionRepository(db)
        self.configuration = ConfigurationRepository(db)
        self.memory = MemoryRepository(db)
        self.worker_id = worker_id

    def run(self, *, job_id: str) -> bool:
        job_uuid = uuid.UUID(job_id)
        job = self.repository.get_job_by_id(job_id=job_uuid)
        if job is None:
            return False
        if job.status == "succeeded":
            return True

        claimed = self.repository.claim_job(job, worker_id=self.worker_id)
        if claimed is None:
            return False
        if claimed.session_id is None:
            self.repository.fail_job(claimed, error="Planning job is missing a session.")
            self.db.commit()
            return False

        self.repository.create_event(
            workspace_id=claimed.workspace_id,
            session_id=claimed.session_id,
            event_type="job.updated",
            payload={"job_id": str(claimed.id), "status": "running", "type": claimed.type},
            actor_type="system",
            actor_id=self.worker_id,
        )
        self.db.commit()

        try:
            self._plan(claimed.id)
            return True
        except Exception as exc:
            self.db.rollback()
            self._mark_failed(job_id=claimed.id, error=str(exc))
            raise

    def reconcile_stale(self, *, stale_seconds: int) -> int:
        older_than = datetime.now(UTC) - timedelta(seconds=stale_seconds)
        stale_jobs = self.repository.list_stale_running_jobs(older_than=older_than)
        count = 0
        for job in stale_jobs:
            self.repository.fail_job(job, error="Job lock exceeded stale threshold.")
            if job.session_id is not None:
                session = self.repository.get_session(
                    workspace_id=job.workspace_id,
                    session_id=job.session_id,
                )
                if session is not None and session.status == "planning":
                    self.repository.update_session_status(session, status="failed")
                    self.repository.create_event(
                        workspace_id=session.workspace_id,
                        session_id=session.id,
                        event_type="session.status_changed",
                        payload={"previous_status": "planning", "new_status": "failed"},
                        actor_type="system",
                        actor_id=self.worker_id,
                    )
                self.repository.create_event(
                    workspace_id=job.workspace_id,
                    session_id=job.session_id,
                    event_type="job.updated",
                    payload={"job_id": str(job.id), "status": "failed", "type": job.type},
                    actor_type="system",
                    actor_id=self.worker_id,
                )
            count += 1
        self.db.commit()
        return count

    def _plan(self, job_id: uuid.UUID) -> None:
        job = self.repository.get_job_by_id(job_id=job_id)
        if job is None or job.session_id is None:
            raise RuntimeError("Planning job is missing a session.")

        session = self.repository.get_session(
            workspace_id=job.workspace_id,
            session_id=job.session_id,
        )
        if session is None:
            raise RuntimeError("Planning session was not found.")
        if session.status != "planning":
            raise RuntimeError(f"Cannot plan a session in status {session.status}.")

        existing_tasks = self.repository.list_tasks(
            workspace_id=session.workspace_id,
            session_id=session.id,
        )
        summary = "Deterministic placeholder plan is ready."
        task_count = len(existing_tasks)
        if not existing_tasks:
            provider = load_session_provider(
                repository=self.configuration,
                session=session,
                settings=get_settings(),
            )
            if provider is not None:
                summary, task_count = self._create_model_plan(session, provider)
            else:
                self._create_placeholder_plan(session)
                task_count = len(DEFAULT_PLAN)

        previous_status = session.status
        self.repository.update_session_status(
            session,
            status="running",
            summary=summary,
        )
        self.repository.create_event(
            workspace_id=session.workspace_id,
            session_id=session.id,
            event_type="plan.created",
            payload={"job_id": str(job.id), "task_count": task_count},
            actor_type="system",
            actor_id=self.worker_id,
        )
        self.repository.create_event(
            workspace_id=session.workspace_id,
            session_id=session.id,
            event_type="session.status_changed",
            payload={"previous_status": previous_status, "new_status": "running"},
            actor_type="system",
            actor_id=self.worker_id,
        )
        self.repository.succeed_job(
            job,
            result={"session_id": str(session.id), "task_count": task_count},
        )
        self.repository.create_event(
            workspace_id=session.workspace_id,
            session_id=session.id,
            event_type="job.updated",
            payload={"job_id": str(job.id), "status": "succeeded", "type": job.type},
            actor_type="system",
            actor_id=self.worker_id,
        )
        self.db.commit()

    def _create_placeholder_plan(self, session) -> None:
        for task_position, item in enumerate(DEFAULT_PLAN, start=1):
            task = self.repository.create_task(
                workspace_id=session.workspace_id,
                session_id=session.id,
                title=item["title"],
                description=item["description"],
                position=task_position,
                status="planned",
            )
            self.repository.create_event(
                workspace_id=session.workspace_id,
                session_id=session.id,
                event_type="task.created",
                payload={"task_id": str(task.id), "title": task.title, "position": task.position},
                actor_type="system",
                actor_id=self.worker_id,
            )
            for step_position, title in enumerate(item["steps"], start=1):
                step = self.repository.create_step(
                    workspace_id=session.workspace_id,
                    session_id=session.id,
                    task_id=task.id,
                    title=title,
                    description=None,
                    position=step_position,
                    status="ready",
                    agent_role="planner",
                )
                self.repository.create_event(
                    workspace_id=session.workspace_id,
                    session_id=session.id,
                    event_type="step.created",
                    payload={
                        "step_id": str(step.id),
                        "task_id": str(task.id),
                        "title": step.title,
                        "position": step.position,
                    },
                    actor_type="system",
                    actor_id=self.worker_id,
                )

    def _create_model_plan(self, session, provider) -> tuple[str, int]:
        settings = get_settings()
        memory_context = scoped_memory_context(
            memory_repository=self.memory,
            configuration_repository=self.configuration,
            settings=settings,
            session=session,
            query=session.objective,
        )
        context: dict[str, object] = {
            "session": {
                "id": str(session.id),
                "objective": session.objective,
                "mode": session.mode,
            },
            "policy_id": str(session.policy_id) if session.policy_id else None,
            "memory_context": memory_context,
        }
        output = PlannerAgent(provider=provider.client, model=provider.model).run(context)
        provider_response = _dict(context.get("provider_response"))
        message = self.repository.create_agent_message(
            workspace_id=session.workspace_id,
            session_id=session.id,
            agent_role="planner",
            message_type="assistant",
            content=str(provider_response.get("content", output.model_dump_json())),
            metadata={
                "summary": output.summary,
                "model": provider_response.get("model"),
                "provider_type": provider_response.get("provider_type"),
                "memory_result_count": len(memory_context),
            },
            token_input=_int_or_none(provider_response.get("token_input")),
            token_output=_int_or_none(provider_response.get("token_output")),
        )
        self.repository.create_event(
            workspace_id=session.workspace_id,
            session_id=session.id,
            event_type="agent.message",
            payload={"message_id": str(message.id), "agent_role": "planner"},
            actor_type="system",
            actor_id=self.worker_id,
        )

        task_count = 0
        for task_position, item in enumerate(output.tasks, start=1):
            task_count += 1
            task = self.repository.create_task(
                workspace_id=session.workspace_id,
                session_id=session.id,
                title=item.title,
                description=item.description,
                position=task_position,
                status="planned",
            )
            self.repository.create_event(
                workspace_id=session.workspace_id,
                session_id=session.id,
                event_type="task.created",
                payload={"task_id": str(task.id), "title": task.title, "position": task.position},
                actor_type="system",
                actor_id=self.worker_id,
            )
            for step_position, step_item in enumerate(item.steps, start=1):
                title, description = _step_title_description(step_item)
                step = self.repository.create_step(
                    workspace_id=session.workspace_id,
                    session_id=session.id,
                    task_id=task.id,
                    title=title,
                    description=description,
                    position=step_position,
                    status="ready",
                    agent_role="executor",
                )
                self.repository.create_event(
                    workspace_id=session.workspace_id,
                    session_id=session.id,
                    event_type="step.created",
                    payload={
                        "step_id": str(step.id),
                        "task_id": str(task.id),
                        "title": step.title,
                        "position": step.position,
                    },
                    actor_type="system",
                    actor_id=self.worker_id,
                )
        self.repository.create_event(
            workspace_id=session.workspace_id,
            session_id=session.id,
            event_type="agent.plan.created",
            payload={"message_id": str(message.id), "task_count": task_count},
            actor_type="system",
            actor_id=self.worker_id,
        )
        return output.summary or "Model-backed agent plan is ready.", task_count

    def _mark_failed(self, *, job_id: uuid.UUID, error: str) -> None:
        job = self.repository.get_job_by_id(job_id=job_id)
        if job is None:
            return
        self.repository.fail_job(job, error=error)
        if job.session_id is not None:
            session = self.repository.get_session(
                workspace_id=job.workspace_id,
                session_id=job.session_id,
            )
            if session is not None and session.status == "planning":
                self.repository.update_session_status(session, status="failed")
                self.repository.create_event(
                    workspace_id=session.workspace_id,
                    session_id=session.id,
                    event_type="session.status_changed",
                    payload={"previous_status": "planning", "new_status": "failed"},
                    actor_type="system",
                    actor_id=self.worker_id,
                )
            self.repository.create_event(
                workspace_id=job.workspace_id,
                session_id=job.session_id,
                event_type="job.updated",
                payload={"job_id": str(job.id), "status": "failed", "type": job.type},
                actor_type="system",
                actor_id=self.worker_id,
            )
        self.db.commit()


def _step_title_description(step: PlannerStepOutput | str) -> tuple[str, str | None]:
    if isinstance(step, str):
        return step, None
    return step.title, step.description


def _dict(value: object) -> dict[str, object]:
    return value if isinstance(value, dict) else {}


def _int_or_none(value: object) -> int | None:
    return value if isinstance(value, int) else None
