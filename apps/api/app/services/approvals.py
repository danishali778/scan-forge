import uuid

from sqlalchemy.orm import Session

from app.auth.dependencies import AuthContext
from app.domain.exceptions import ConflictError, DomainError, NotFoundError
from app.domain.ids import parse_uuid
from app.domain.pagination import Page
from app.integrations.queue import QueueClient
from app.repositories.control_plane import AuditRepository
from app.repositories.sessions import SessionRepository
from app.schemas.agents import ApprovalResolveRequest, ApprovalResponse
from app.services.audit import AuditRecorder
from app.services.sessions.mappers import approval_response


class ApprovalService:
    def __init__(
        self,
        *,
        db: Session,
        repository: SessionRepository,
        audit_repository: AuditRepository,
        queue_client: QueueClient,
    ) -> None:
        self.db = db
        self.repository = repository
        self.audit = AuditRecorder(audit_repository)
        self.queue = queue_client

    def list_approvals(
        self,
        *,
        auth: AuthContext,
        status: str | None = None,
    ) -> Page[ApprovalResponse]:
        approvals = self.repository.list_approval_requests(
            workspace_id=uuid.UUID(auth.workspace_id),
            status=status,
        )
        return Page(items=[approval_response(approval) for approval in approvals])

    def get_approval(self, *, approval_id: str, auth: AuthContext) -> ApprovalResponse:
        approval = self._get_approval(approval_id=approval_id, auth=auth)
        return approval_response(approval)

    def approve(
        self,
        *,
        approval_id: str,
        request: ApprovalResolveRequest,
        auth: AuthContext,
    ) -> ApprovalResponse:
        approval = self._get_approval(approval_id=approval_id, auth=auth)
        if approval.status != "pending":
            raise ConflictError("Only pending approvals can be approved.")
        if approval.tool_call_id is None:
            raise ConflictError("Approval is not linked to a tool call.")

        session = self.repository.get_session(
            workspace_id=approval.workspace_id,
            session_id=approval.session_id,
        )
        tool_call = self.repository.get_tool_call(
            workspace_id=approval.workspace_id,
            tool_call_id=approval.tool_call_id,
        )
        if session is None or tool_call is None:
            raise NotFoundError("Approval target was not found.")

        self.repository.resolve_approval_request(
            approval,
            status="approved",
            resolved_by=uuid.UUID(auth.user_id),
            resolution_note=request.note,
        )
        self.repository.update_tool_call_status(tool_call, status="queued")
        previous_status = session.status
        if session.status == "awaiting_approval":
            self.repository.update_session_status(session, status="running")
            self.repository.create_event(
                workspace_id=session.workspace_id,
                session_id=session.id,
                event_type="session.status_changed",
                payload={"previous_status": previous_status, "new_status": "running"},
                actor_type=auth.actor_type,
                actor_id=auth.api_token_id or auth.user_id,
            )

        job = self.repository.create_job(
            workspace_id=session.workspace_id,
            session_id=session.id,
            job_type="execute_tool_call",
            payload={"tool_call_id": str(tool_call.id), "session_id": str(session.id)},
        )
        self.repository.create_event(
            workspace_id=session.workspace_id,
            session_id=session.id,
            event_type="approval.resolved",
            payload={"approval_id": str(approval.id), "status": approval.status},
            actor_type=auth.actor_type,
            actor_id=auth.api_token_id or auth.user_id,
        )
        self.repository.create_event(
            workspace_id=session.workspace_id,
            session_id=session.id,
            event_type="tool_call.queued",
            payload={"tool_call_id": str(tool_call.id), "job_id": str(job.id)},
            actor_type=auth.actor_type,
            actor_id=auth.api_token_id or auth.user_id,
        )
        self.audit.record(
            auth=auth,
            action="approval.approved",
            resource_type="approval_request",
            resource_id=str(approval.id),
            after={"tool_call_id": str(tool_call.id), "job_id": str(job.id)},
        )
        self.db.commit()

        try:
            celery_task_id = self.queue.enqueue_tool_execute(job_id=str(job.id))
            self.repository.mark_job_enqueued(job, celery_task_id=celery_task_id)
            self.db.commit()
        except Exception as exc:
            self.db.rollback()
            job = self.repository.get_job(workspace_id=session.workspace_id, job_id=job.id)
            if job is not None:
                self.repository.fail_job(job, error=str(exc))
                self.db.commit()
            raise DomainError("Approved tool execution could not be enqueued.") from exc

        return approval_response(approval)

    def deny(
        self,
        *,
        approval_id: str,
        request: ApprovalResolveRequest,
        auth: AuthContext,
    ) -> ApprovalResponse:
        approval = self._get_approval(approval_id=approval_id, auth=auth)
        if approval.status != "pending":
            raise ConflictError("Only pending approvals can be denied.")

        session = self.repository.get_session(
            workspace_id=approval.workspace_id,
            session_id=approval.session_id,
        )
        if session is None:
            raise NotFoundError("Approval session was not found.")

        self.repository.resolve_approval_request(
            approval,
            status="denied",
            resolved_by=uuid.UUID(auth.user_id),
            resolution_note=request.note,
        )
        if approval.tool_call_id is not None:
            tool_call = self.repository.get_tool_call(
                workspace_id=approval.workspace_id,
                tool_call_id=approval.tool_call_id,
            )
            if tool_call is not None:
                self.repository.finish_tool_call(
                    tool_call,
                    status="denied",
                    error_message="Approval was denied.",
                )
        if approval.step_id is not None:
            step = self.repository.get_step(
                workspace_id=approval.workspace_id,
                step_id=approval.step_id,
            )
            if step is not None:
                self.repository.update_step_status(step, status="ready")

        previous_status = session.status
        if session.status == "awaiting_approval":
            self.repository.update_session_status(session, status="running")
            self.repository.create_event(
                workspace_id=session.workspace_id,
                session_id=session.id,
                event_type="session.status_changed",
                payload={"previous_status": previous_status, "new_status": "running"},
                actor_type=auth.actor_type,
                actor_id=auth.api_token_id or auth.user_id,
            )
        self.repository.create_event(
            workspace_id=session.workspace_id,
            session_id=session.id,
            event_type="approval.resolved",
            payload={"approval_id": str(approval.id), "status": approval.status},
            actor_type=auth.actor_type,
            actor_id=auth.api_token_id or auth.user_id,
        )
        self.audit.record(
            auth=auth,
            action="approval.denied",
            resource_type="approval_request",
            resource_id=str(approval.id),
        )
        self.db.commit()
        return approval_response(approval)

    def _get_approval(self, *, approval_id: str, auth: AuthContext):
        approval = self.repository.get_approval_request(
            workspace_id=uuid.UUID(auth.workspace_id),
            approval_id=parse_uuid(approval_id, field_name="approval_id"),
        )
        if approval is None:
            raise NotFoundError("Approval request was not found.")
        return approval
