import uuid
from pathlib import PurePosixPath

from sqlalchemy.orm import Session

from app.auth.dependencies import AuthContext
from app.core.config import get_settings
from app.domain.exceptions import ConflictError, DomainError, NotFoundError
from app.domain.ids import parse_uuid
from app.domain.pagination import Page
from app.integrations.queue import QueueClient
from app.integrations.runtime import RuntimeServiceClient
from app.repositories.control_plane import AuditRepository, ConfigurationRepository
from app.repositories.projects import ProjectRepository
from app.repositories.sessions import SessionRepository
from app.schemas.sessions import (
    JobResponse,
    RuntimeFileContentResponse,
    RuntimeFileListResponse,
    RuntimeFileWriteRequest,
    RuntimeFileWriteResponse,
    RuntimeInstanceResponse,
    SessionCreateRequest,
    SessionDetail,
    SessionEventResponse,
    SessionSummary,
    TaskResponse,
    TerminalCommandRequest,
    ToolCallResponse,
)
from app.services.audit import AuditRecorder
from app.services.sessions.events import emit_session_created
from app.services.sessions.guards import ensure_project_scope_access, get_session_or_raise
from app.services.sessions.mappers import (
    job_response,
    runtime_instance_response,
    session_detail,
    session_event_response,
    session_summary,
    task_response,
    tool_call_response,
)


class SessionService:
    """Session use-case orchestration boundary."""

    def __init__(
        self,
        *,
        db: Session,
        repository: SessionRepository,
        project_repository: ProjectRepository,
        configuration_repository: ConfigurationRepository,
        audit_repository: AuditRepository,
        queue_client: QueueClient,
        runtime_client: RuntimeServiceClient,
    ) -> None:
        self.db = db
        self.repository = repository
        self.project_repository = project_repository
        self.configuration_repository = configuration_repository
        self.audit = AuditRecorder(audit_repository)
        self.queue = queue_client
        self.runtime = runtime_client

    def list_sessions(self, *, auth: AuthContext, limit: int = 50) -> Page[SessionSummary]:
        workspace_id = uuid.UUID(auth.workspace_id)
        sessions = self.repository.list_sessions(workspace_id=workspace_id, limit=limit)
        return Page(items=[session_summary(session) for session in sessions])

    def create_session(self, request: SessionCreateRequest, *, auth: AuthContext) -> SessionDetail:
        workspace_id = uuid.UUID(auth.workspace_id)
        project_id = parse_uuid(request.project_id, field_name="project_id")
        scope_id = parse_uuid(request.scope_id, field_name="scope_id")
        ensure_project_scope_access(
            self.project_repository,
            workspace_id=workspace_id,
            project_id=project_id,
            scope_id=scope_id,
        )
        provider_profile_id = (
            parse_uuid(request.provider_profile_id, field_name="provider_profile_id")
            if request.provider_profile_id
            else None
        )
        policy_id = (
            parse_uuid(request.policy_id, field_name="policy_id") if request.policy_id else None
        )
        if provider_profile_id is not None:
            provider_profile = self.configuration_repository.get_provider_profile(
                workspace_id=workspace_id,
                profile_id=provider_profile_id,
            )
            if provider_profile is None:
                raise NotFoundError("Provider profile was not found.")
        if policy_id is not None:
            policy = self.configuration_repository.get_policy(
                workspace_id=workspace_id,
                policy_id=policy_id,
            )
            if policy is None:
                raise NotFoundError("Policy was not found.")

        session = self.repository.create_session(
            workspace_id=workspace_id,
            project_id=project_id,
            scope_id=scope_id,
            created_by=uuid.UUID(auth.user_id),
            title=request.title,
            objective=request.objective,
            mode=request.mode,
            provider_profile_id=provider_profile_id,
            policy_id=policy_id,
        )
        emit_session_created(
            self.repository,
            workspace_id=workspace_id,
            session=session,
            actor_id=auth.user_id,
        )
        self.audit.record(
            auth=auth,
            action="session.created",
            resource_type="session",
            resource_id=str(session.id),
            after={
                "project_id": str(session.project_id),
                "scope_id": str(session.scope_id),
                "mode": session.mode,
                "provider_profile_id": str(session.provider_profile_id)
                if session.provider_profile_id
                else None,
                "policy_id": str(session.policy_id) if session.policy_id else None,
            },
        )
        self.db.commit()
        return session_detail(session)

    def get_session(self, *, session_id: str, auth: AuthContext) -> SessionDetail:
        session = get_session_or_raise(
            self.repository,
            workspace_id=uuid.UUID(auth.workspace_id),
            session_id=parse_uuid(session_id, field_name="session_id"),
        )
        return session_detail(session)

    def list_events(
        self,
        *,
        session_id: str,
        auth: AuthContext,
        after_id: int | None = None,
    ) -> Page[SessionEventResponse]:
        workspace_id = uuid.UUID(auth.workspace_id)
        session_uuid = parse_uuid(session_id, field_name="session_id")
        get_session_or_raise(
            self.repository,
            workspace_id=workspace_id,
            session_id=session_uuid,
        )
        events = self.repository.list_events(
            workspace_id=workspace_id,
            session_id=session_uuid,
            after_id=after_id,
        )
        return Page(items=[session_event_response(event) for event in events])

    def start_session(self, *, session_id: str, auth: AuthContext) -> SessionDetail:
        workspace_id = uuid.UUID(auth.workspace_id)
        session = get_session_or_raise(
            self.repository,
            workspace_id=workspace_id,
            session_id=parse_uuid(session_id, field_name="session_id"),
        )
        if session.status != "draft":
            raise ConflictError("Only draft sessions can be started.")

        previous_status = session.status
        self.repository.update_session_status(session, status="planning")
        self._emit_status_changed(auth=auth, session=session, previous_status=previous_status)
        job = self.repository.create_job(
            workspace_id=workspace_id,
            session_id=session.id,
            job_type="plan_session",
            payload={"session_id": str(session.id)},
        )
        self._emit_job_event(auth=auth, session_id=session.id, job_id=job.id, status="queued")
        self.audit.record(
            auth=auth,
            action="session.started",
            resource_type="session",
            resource_id=str(session.id),
            before={"status": previous_status},
            after={"status": session.status, "job_id": str(job.id)},
        )
        self.db.commit()

        try:
            celery_task_id = self.queue.enqueue_session_plan(job_id=str(job.id))
            self.repository.mark_job_enqueued(job, celery_task_id=celery_task_id)
            self.db.commit()
        except Exception as exc:
            self.db.rollback()
            job = self.repository.get_job(workspace_id=workspace_id, job_id=job.id)
            session = get_session_or_raise(
                self.repository,
                workspace_id=workspace_id,
                session_id=session.id,
            )
            if job is not None:
                self.repository.fail_job(job, error=str(exc))
                self._emit_job_event(
                    auth=auth,
                    session_id=session.id,
                    job_id=job.id,
                    status="failed",
                )
            self.repository.update_session_status(session, status="failed")
            self._emit_status_changed(auth=auth, session=session, previous_status="planning")
            self.db.commit()
            raise DomainError("Planning job could not be enqueued.") from exc

        return session_detail(session)

    def pause_session(self, *, session_id: str, auth: AuthContext) -> SessionDetail:
        session = self._transition(
            session_id=session_id,
            auth=auth,
            allowed={"running"},
            new_status="paused",
            audit_action="session.paused",
        )
        return session_detail(session)

    def resume_session(self, *, session_id: str, auth: AuthContext) -> SessionDetail:
        session = self._transition(
            session_id=session_id,
            auth=auth,
            allowed={"paused"},
            new_status="running",
            audit_action="session.resumed",
        )
        return session_detail(session)

    def stop_session(self, *, session_id: str, auth: AuthContext) -> SessionDetail:
        workspace_id = uuid.UUID(auth.workspace_id)
        session = get_session_or_raise(
            self.repository,
            workspace_id=workspace_id,
            session_id=parse_uuid(session_id, field_name="session_id"),
        )
        if session.status not in {"planning", "running", "paused", "awaiting_approval"}:
            raise ConflictError(
                "Only planning, running, paused, or awaiting approval sessions can be stopped."
            )

        previous_status = session.status
        cancelled_jobs = self.repository.cancel_queued_session_jobs(
            workspace_id=workspace_id,
            session_id=session.id,
        )
        for job in cancelled_jobs:
            self._emit_job_event(
                auth=auth,
                session_id=session.id,
                job_id=job.id,
                status="cancelled",
            )
        cancelled_tool_calls = self.repository.cancel_active_tool_calls(
            workspace_id=workspace_id,
            session_id=session.id,
        )
        for tool_call in cancelled_tool_calls:
            self.repository.create_event(
                workspace_id=workspace_id,
                session_id=session.id,
                event_type="tool_call.failed",
                payload={"tool_call_id": str(tool_call.id), "status": "cancelled"},
                actor_type=auth.actor_type,
                actor_id=auth.api_token_id or auth.user_id,
            )
        runtime = self.repository.get_running_runtime_instance(
            workspace_id=workspace_id,
            session_id=session.id,
        )
        if runtime is not None:
            try:
                self.runtime.stop_runtime(runtime_id=str(runtime.id), reason="session_stopped")
                self.repository.update_runtime_instance(runtime, status="stopped")
                self.repository.create_event(
                    workspace_id=workspace_id,
                    session_id=session.id,
                    event_type="runtime.stopped",
                    payload={"runtime_id": str(runtime.id), "status": "stopped"},
                    actor_type=auth.actor_type,
                    actor_id=auth.api_token_id or auth.user_id,
                )
            except Exception as exc:
                self.repository.create_event(
                    workspace_id=workspace_id,
                    session_id=session.id,
                    event_type="runtime.stop_failed",
                    payload={"runtime_id": str(runtime.id), "error": str(exc)},
                    actor_type="system",
                    actor_id="api",
                )
        self.repository.update_session_status(session, status="stopped")
        self._emit_status_changed(auth=auth, session=session, previous_status=previous_status)
        self.audit.record(
            auth=auth,
            action="session.stopped",
            resource_type="session",
            resource_id=str(session.id),
            before={"status": previous_status},
            after={
                "status": session.status,
                "cancelled_job_count": len(cancelled_jobs),
                "cancelled_tool_call_count": len(cancelled_tool_calls),
            },
        )
        self.db.commit()
        return session_detail(session)

    def archive_session(self, *, session_id: str, auth: AuthContext) -> SessionDetail:
        session = self._transition(
            session_id=session_id,
            auth=auth,
            allowed={"draft", "completed", "failed", "stopped"},
            new_status="archived",
            audit_action="session.archived",
        )
        return session_detail(session)

    def list_tasks(self, *, session_id: str, auth: AuthContext) -> Page[TaskResponse]:
        workspace_id = uuid.UUID(auth.workspace_id)
        session_uuid = parse_uuid(session_id, field_name="session_id")
        get_session_or_raise(self.repository, workspace_id=workspace_id, session_id=session_uuid)
        tasks = self.repository.list_tasks(workspace_id=workspace_id, session_id=session_uuid)
        steps = self.repository.list_steps(workspace_id=workspace_id, session_id=session_uuid)
        steps_by_task: dict[uuid.UUID, list] = {}
        for step in steps:
            steps_by_task.setdefault(step.task_id, []).append(step)
        return Page(
            items=[
                task_response(task, steps=steps_by_task.get(task.id, []))
                for task in tasks
            ]
        )

    def list_jobs(self, *, session_id: str, auth: AuthContext) -> Page[JobResponse]:
        workspace_id = uuid.UUID(auth.workspace_id)
        session_uuid = parse_uuid(session_id, field_name="session_id")
        get_session_or_raise(self.repository, workspace_id=workspace_id, session_id=session_uuid)
        jobs = self.repository.list_jobs(workspace_id=workspace_id, session_id=session_uuid)
        return Page(items=[job_response(job) for job in jobs])

    def get_runtime(
        self,
        *,
        session_id: str,
        auth: AuthContext,
    ) -> RuntimeInstanceResponse | None:
        workspace_id = uuid.UUID(auth.workspace_id)
        session_uuid = parse_uuid(session_id, field_name="session_id")
        get_session_or_raise(self.repository, workspace_id=workspace_id, session_id=session_uuid)
        runtime = self.repository.get_latest_runtime_instance(
            workspace_id=workspace_id,
            session_id=session_uuid,
        )
        return runtime_instance_response(runtime) if runtime else None

    def start_runtime(self, *, session_id: str, auth: AuthContext) -> RuntimeInstanceResponse:
        workspace_id = uuid.UUID(auth.workspace_id)
        session = get_session_or_raise(
            self.repository,
            workspace_id=workspace_id,
            session_id=parse_uuid(session_id, field_name="session_id"),
        )
        if session.status != "running":
            raise ConflictError("Runtime can only be started for running sessions.")

        existing = self.repository.get_running_runtime_instance(
            workspace_id=workspace_id,
            session_id=session.id,
        )
        if existing is not None:
            return runtime_instance_response(existing)

        runtime_id = uuid.uuid4()
        settings = get_settings()
        resource_limits: dict[str, object] = {
            "timeout_seconds": settings.runtime_default_timeout_seconds,
            "max_output_bytes": settings.runtime_max_output_bytes,
        }
        runtime = self.repository.create_runtime_instance(
            runtime_id=runtime_id,
            workspace_id=workspace_id,
            session_id=session.id,
            image="scopeforge-runtime-python:local",
            status="starting",
            resource_limits=resource_limits,
        )
        self.db.commit()

        try:
            response = self.runtime.start_runtime(
                runtime_id=str(runtime.id),
                workspace_id=str(workspace_id),
                session_id=str(session.id),
                resource_limits=resource_limits,
                network_policy={"mode": "none"},
            )
        except Exception:
            self.repository.update_runtime_instance(runtime, status="failed")
            self.db.commit()
            raise

        self.repository.update_runtime_instance(
            runtime,
            status=str(response.get("status", "running")),
            external_id=_optional_str(response.get("external_id")),
            image=str(response.get("image", runtime.image)),
            workspace_path=str(response.get("workspace_path", runtime.workspace_path)),
            resource_limits=_dict_value(response.get("resource_limits")) or resource_limits,
        )
        self.repository.create_event(
            workspace_id=workspace_id,
            session_id=session.id,
            event_type="runtime.started",
            payload={"runtime_id": str(runtime.id), "status": runtime.status},
            actor_type=auth.actor_type,
            actor_id=auth.api_token_id or auth.user_id,
        )
        self.audit.record(
            auth=auth,
            action="runtime.started",
            resource_type="runtime_instance",
            resource_id=str(runtime.id),
            after={"session_id": str(session.id), "status": runtime.status},
        )
        self.db.commit()
        return runtime_instance_response(runtime)

    def stop_runtime(self, *, session_id: str, auth: AuthContext) -> RuntimeInstanceResponse:
        workspace_id = uuid.UUID(auth.workspace_id)
        session = get_session_or_raise(
            self.repository,
            workspace_id=workspace_id,
            session_id=parse_uuid(session_id, field_name="session_id"),
        )
        if session.status not in {"running", "paused", "stopped", "failed"}:
            raise ConflictError("Runtime stop is only allowed for active or failed sessions.")

        runtime = self.repository.get_running_runtime_instance(
            workspace_id=workspace_id,
            session_id=session.id,
        ) or self.repository.get_latest_runtime_instance(
            workspace_id=workspace_id,
            session_id=session.id,
        )
        if runtime is None:
            raise NotFoundError("Runtime instance was not found.")

        response = self.runtime.stop_runtime(runtime_id=str(runtime.id), reason="api_request")
        previous_status = runtime.status
        self.repository.update_runtime_instance(
            runtime,
            status=str(response.get("status", "stopped")),
        )
        self.repository.create_event(
            workspace_id=workspace_id,
            session_id=session.id,
            event_type="runtime.stopped",
            payload={
                "runtime_id": str(runtime.id),
                "previous_status": previous_status,
                "status": runtime.status,
            },
            actor_type=auth.actor_type,
            actor_id=auth.api_token_id or auth.user_id,
        )
        self.audit.record(
            auth=auth,
            action="runtime.stopped",
            resource_type="runtime_instance",
            resource_id=str(runtime.id),
            before={"status": previous_status},
            after={"status": runtime.status},
        )
        self.db.commit()
        return runtime_instance_response(runtime)

    def list_tool_calls(
        self,
        *,
        session_id: str,
        auth: AuthContext,
    ) -> Page[ToolCallResponse]:
        workspace_id = uuid.UUID(auth.workspace_id)
        session_uuid = parse_uuid(session_id, field_name="session_id")
        get_session_or_raise(self.repository, workspace_id=workspace_id, session_id=session_uuid)
        tool_calls = self.repository.list_tool_calls(
            workspace_id=workspace_id,
            session_id=session_uuid,
        )
        return Page(items=[tool_call_response(tool_call) for tool_call in tool_calls])

    def create_terminal_tool_call(
        self,
        request: TerminalCommandRequest,
        *,
        session_id: str,
        auth: AuthContext,
    ) -> ToolCallResponse:
        workspace_id = uuid.UUID(auth.workspace_id)
        session = get_session_or_raise(
            self.repository,
            workspace_id=workspace_id,
            session_id=parse_uuid(session_id, field_name="session_id"),
        )
        if session.status != "running":
            raise ConflictError("Terminal commands can only be queued for running sessions.")

        cwd = _workspace_path(request.cwd)
        settings = get_settings()
        timeout_seconds = request.timeout_seconds or settings.runtime_default_timeout_seconds
        max_output_bytes = request.max_output_bytes or settings.runtime_max_output_bytes
        arguments: dict[str, object] = {
            "command": request.command,
            "cwd": cwd,
            "timeout_seconds": timeout_seconds,
            "max_output_bytes": max_output_bytes,
        }
        allowed, reason = _command_allowed(
            command=request.command,
            allowed_commands=settings.runtime_allowed_commands,
        )
        if not allowed:
            tool_call = self.repository.create_tool_call(
                workspace_id=workspace_id,
                session_id=session.id,
                tool_name="terminal",
                tool_version="phase4",
                status="denied",
                arguments=arguments,
                policy_decision=_denied_policy(reason),
                error_message=reason,
            )
            self.repository.create_event(
                workspace_id=workspace_id,
                session_id=session.id,
                event_type="tool_call.failed",
                payload={"tool_call_id": str(tool_call.id), "status": "denied", "reason": reason},
                actor_type=auth.actor_type,
                actor_id=auth.api_token_id or auth.user_id,
            )
            self.audit.record(
                auth=auth,
                action="tool_call.denied",
                resource_type="tool_call",
                resource_id=str(tool_call.id),
                metadata={"tool_name": "terminal", "reason": reason},
            )
            self.db.commit()
            return tool_call_response(tool_call)

        tool_call = self.repository.create_tool_call(
            workspace_id=workspace_id,
            session_id=session.id,
            tool_name="terminal",
            tool_version="phase4",
            status="queued",
            arguments=arguments,
            policy_decision=_allowed_policy(
                timeout_seconds=timeout_seconds,
                max_output_bytes=max_output_bytes,
            ),
        )
        job = self.repository.create_job(
            workspace_id=workspace_id,
            session_id=session.id,
            job_type="execute_tool_call",
            payload={"tool_call_id": str(tool_call.id), "session_id": str(session.id)},
        )
        self.repository.create_event(
            workspace_id=workspace_id,
            session_id=session.id,
            event_type="tool_call.queued",
            payload={"tool_call_id": str(tool_call.id), "job_id": str(job.id)},
            actor_type=auth.actor_type,
            actor_id=auth.api_token_id or auth.user_id,
        )
        self.audit.record(
            auth=auth,
            action="tool_call.requested",
            resource_type="tool_call",
            resource_id=str(tool_call.id),
            metadata={
                "tool_name": "terminal",
                "command": request.command[:1],
                "timeout_seconds": timeout_seconds,
            },
        )
        self.db.commit()

        try:
            celery_task_id = self.queue.enqueue_tool_execute(job_id=str(job.id))
            self.repository.mark_job_enqueued(job, celery_task_id=celery_task_id)
            self.db.commit()
        except Exception as exc:
            self.db.rollback()
            job = self.repository.get_job(workspace_id=workspace_id, job_id=job.id)
            tool_call = self.repository.get_tool_call(
                workspace_id=workspace_id,
                tool_call_id=tool_call.id,
            )
            if job is not None:
                self.repository.fail_job(job, error=str(exc))
            if tool_call is not None:
                self.repository.finish_tool_call(
                    tool_call,
                    status="failed",
                    error_message="Tool execution job could not be enqueued.",
                )
            self.db.commit()
            raise DomainError("Tool execution job could not be enqueued.") from exc

        return tool_call_response(tool_call)

    def list_runtime_files(
        self,
        *,
        session_id: str,
        path: str,
        auth: AuthContext,
    ) -> RuntimeFileListResponse:
        runtime = self._get_running_runtime_for_files(session_id=session_id, auth=auth)
        response = self.runtime.list_files(runtime_id=str(runtime.id), path=_workspace_path(path))
        return RuntimeFileListResponse.model_validate(response)

    def read_runtime_file(
        self,
        *,
        session_id: str,
        path: str,
        auth: AuthContext,
    ) -> RuntimeFileContentResponse:
        runtime = self._get_running_runtime_for_files(session_id=session_id, auth=auth)
        response = self.runtime.read_file(runtime_id=str(runtime.id), path=_workspace_path(path))
        return RuntimeFileContentResponse.model_validate(response)

    def write_runtime_file(
        self,
        request: RuntimeFileWriteRequest,
        *,
        session_id: str,
        auth: AuthContext,
    ) -> RuntimeFileWriteResponse:
        workspace_id = uuid.UUID(auth.workspace_id)
        session = get_session_or_raise(
            self.repository,
            workspace_id=workspace_id,
            session_id=parse_uuid(session_id, field_name="session_id"),
        )
        if session.status != "running":
            raise ConflictError("Files can only be written while a session is running.")
        runtime = self._get_running_runtime_for_session(workspace_id=workspace_id, session=session)
        path = _workspace_path(request.path)
        response = self.runtime.write_file(
            runtime_id=str(runtime.id),
            path=path,
            content=request.content,
        )
        self.repository.create_event(
            workspace_id=workspace_id,
            session_id=session.id,
            event_type="file.written",
            payload={
                "runtime_id": str(runtime.id),
                "path": path,
                "size_bytes": response.get("size_bytes", 0),
            },
            actor_type=auth.actor_type,
            actor_id=auth.api_token_id or auth.user_id,
        )
        self.audit.record(
            auth=auth,
            action="file.written",
            resource_type="runtime_file",
            resource_id=path,
            after={"session_id": str(session.id), "size_bytes": response.get("size_bytes", 0)},
        )
        self.db.commit()
        return RuntimeFileWriteResponse.model_validate(response)

    def _transition(
        self,
        *,
        session_id: str,
        auth: AuthContext,
        allowed: set[str],
        new_status: str,
        audit_action: str,
    ):
        workspace_id = uuid.UUID(auth.workspace_id)
        session = get_session_or_raise(
            self.repository,
            workspace_id=workspace_id,
            session_id=parse_uuid(session_id, field_name="session_id"),
        )
        if session.status not in allowed:
            allowed_display = ", ".join(sorted(allowed))
            raise ConflictError(
                f"Session must be in one of these statuses: {allowed_display}."
            )

        previous_status = session.status
        self.repository.update_session_status(session, status=new_status)
        self._emit_status_changed(auth=auth, session=session, previous_status=previous_status)
        self.audit.record(
            auth=auth,
            action=audit_action,
            resource_type="session",
            resource_id=str(session.id),
            before={"status": previous_status},
            after={"status": session.status},
        )
        self.db.commit()
        return session

    def _get_running_runtime_for_files(
        self,
        *,
        session_id: str,
        auth: AuthContext,
    ):
        workspace_id = uuid.UUID(auth.workspace_id)
        session = get_session_or_raise(
            self.repository,
            workspace_id=workspace_id,
            session_id=parse_uuid(session_id, field_name="session_id"),
        )
        return self._get_running_runtime_for_session(workspace_id=workspace_id, session=session)

    def _get_running_runtime_for_session(self, *, workspace_id: uuid.UUID, session):
        runtime = self.repository.get_running_runtime_instance(
            workspace_id=workspace_id,
            session_id=session.id,
        )
        if runtime is None:
            raise NotFoundError("Running runtime instance was not found.")
        return runtime

    def _emit_status_changed(
        self,
        *,
        auth: AuthContext,
        session,
        previous_status: str,
    ) -> None:
        self.repository.create_event(
            workspace_id=session.workspace_id,
            session_id=session.id,
            event_type="session.status_changed",
            payload={"previous_status": previous_status, "new_status": session.status},
            actor_type=auth.actor_type,
            actor_id=auth.api_token_id or auth.user_id,
        )

    def _emit_job_event(
        self,
        *,
        auth: AuthContext,
        session_id: uuid.UUID,
        job_id: uuid.UUID,
        status: str,
    ) -> None:
        self.repository.create_event(
            workspace_id=uuid.UUID(auth.workspace_id),
            session_id=session_id,
            event_type="job.updated",
            payload={"job_id": str(job_id), "status": status, "type": "plan_session"},
            actor_type=auth.actor_type,
            actor_id=auth.api_token_id or auth.user_id,
        )


def _workspace_path(value: str) -> str:
    path = PurePosixPath(value)
    parts = path.parts
    if not path.is_absolute() or len(parts) < 2 or parts[1] != "workspace":
        raise DomainError("Runtime paths must be inside /workspace.")
    if ".." in parts:
        raise DomainError("Runtime paths cannot contain parent directory traversal.")
    return str(path)


def _command_allowed(*, command: list[str], allowed_commands: set[str]) -> tuple[bool, str]:
    if not command:
        return False, "Command cannot be empty."
    executable = command[0]
    if "/" in executable or "\\" in executable:
        return False, "Command executable must be a simple allowed command name."
    if executable not in allowed_commands:
        return False, f"Command is not allowed by the Phase 4 conservative gate: {executable}."
    return True, "Command is allowed by the Phase 4 conservative runtime gate."


def _allowed_policy(*, timeout_seconds: int, max_output_bytes: int) -> dict[str, object]:
    return {
        "decision": "allow",
        "risk_level": "low",
        "reasons": ["Command is allowed by the Phase 4 conservative runtime gate."],
        "constraints": {
            "network_mode": "none",
            "timeout_seconds": timeout_seconds,
            "max_output_bytes": max_output_bytes,
        },
    }


def _denied_policy(reason: str) -> dict[str, object]:
    return {
        "decision": "deny",
        "risk_level": "medium",
        "reasons": [reason],
        "constraints": {"network_mode": "none"},
    }


def _dict_value(value: object) -> dict[str, object] | None:
    return value if isinstance(value, dict) else None


def _optional_str(value: object) -> str | None:
    return str(value) if value is not None else None
