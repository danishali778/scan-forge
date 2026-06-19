import uuid

from sqlalchemy.orm import Session

from app.auth.dependencies import AuthContext
from app.core.config import get_settings
from app.domain.exceptions import ConflictError, DomainError
from app.domain.ids import parse_uuid
from app.domain.pagination import Page
from app.integrations.queue import QueueClient
from app.repositories.sessions import SessionRepository
from app.schemas.agents import AgentMessageResponse, AgentRunRequest, AgentRunResponse
from app.services.sessions.guards import get_session_or_raise
from app.services.sessions.mappers import agent_message_response


class AgentService:
    def __init__(
        self,
        *,
        db: Session,
        repository: SessionRepository,
        queue_client: QueueClient,
    ) -> None:
        self.db = db
        self.repository = repository
        self.queue = queue_client

    def list_messages(
        self,
        *,
        session_id: str,
        auth: AuthContext,
    ) -> Page[AgentMessageResponse]:
        workspace_id = uuid.UUID(auth.workspace_id)
        session_uuid = parse_uuid(session_id, field_name="session_id")
        get_session_or_raise(self.repository, workspace_id=workspace_id, session_id=session_uuid)
        messages = self.repository.list_agent_messages(
            workspace_id=workspace_id,
            session_id=session_uuid,
        )
        return Page(items=[agent_message_response(message) for message in messages])

    def run_session(
        self,
        request: AgentRunRequest,
        *,
        session_id: str,
        auth: AuthContext,
    ) -> AgentRunResponse:
        workspace_id = uuid.UUID(auth.workspace_id)
        session = get_session_or_raise(
            self.repository,
            workspace_id=workspace_id,
            session_id=parse_uuid(session_id, field_name="session_id"),
        )
        if session.status != "running":
            raise ConflictError("Agent runs can only be queued for running sessions.")

        max_turns = request.max_turns or get_settings().agent_max_turns_per_job
        job = self.repository.create_job(
            workspace_id=workspace_id,
            session_id=session.id,
            job_type="agent_run_session",
            payload={"session_id": str(session.id), "max_turns": max_turns},
        )
        self.repository.create_event(
            workspace_id=workspace_id,
            session_id=session.id,
            event_type="job.updated",
            payload={"job_id": str(job.id), "status": "queued", "type": job.type},
            actor_type=auth.actor_type,
            actor_id=auth.api_token_id or auth.user_id,
        )
        self.db.commit()

        try:
            celery_task_id = self.queue.enqueue_agent_run(job_id=str(job.id))
            self.repository.mark_job_enqueued(job, celery_task_id=celery_task_id)
            self.db.commit()
        except Exception as exc:
            self.db.rollback()
            job = self.repository.get_job(workspace_id=workspace_id, job_id=job.id)
            if job is not None:
                self.repository.fail_job(job, error=str(exc))
                self.db.commit()
            raise DomainError("Agent run job could not be enqueued.") from exc

        return AgentRunResponse(job_id=str(job.id), session_id=str(session.id), status=job.status)
