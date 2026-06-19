import uuid
from datetime import UTC, datetime

from sqlalchemy import or_, select

from app.models.session import (
    AgentMessage,
    ApprovalRequest,
    Job,
    PolicyDecision,
    RuntimeInstance,
    SessionEvent,
    SessionModel,
    Step,
    Task,
    ToolCall,
    ToolDefinition,
)
from app.repositories.base import BaseRepository


class SessionRepository(BaseRepository):
    """Session persistence boundary.

    SQLAlchemy queries will live here after the initial schema migration exists.
    """

    def list_sessions(self, *, workspace_id: uuid.UUID, limit: int = 50) -> list[SessionModel]:
        return list(
            self.db.scalars(
                select(SessionModel)
                .where(SessionModel.workspace_id == workspace_id, SessionModel.deleted_at.is_(None))
                .order_by(SessionModel.created_at.desc())
                .limit(limit)
            )
        )

    def get_session(
        self,
        *,
        workspace_id: uuid.UUID,
        session_id: uuid.UUID,
    ) -> SessionModel | None:
        return self.db.scalar(
            select(SessionModel).where(
                SessionModel.id == session_id,
                SessionModel.workspace_id == workspace_id,
                SessionModel.deleted_at.is_(None),
            )
        )

    def create_session(
        self,
        *,
        workspace_id: uuid.UUID,
        project_id: uuid.UUID,
        scope_id: uuid.UUID,
        created_by: uuid.UUID,
        title: str,
        objective: str,
        mode: str,
        provider_profile_id: uuid.UUID | None = None,
        policy_id: uuid.UUID | None = None,
    ) -> SessionModel:
        session = SessionModel(
            workspace_id=workspace_id,
            project_id=project_id,
            scope_id=scope_id,
            provider_profile_id=provider_profile_id,
            policy_id=policy_id,
            created_by=created_by,
            title=title,
            objective=objective,
            mode=mode,
            status="draft",
            metadata_json={},
        )
        self.db.add(session)
        self.db.flush()
        return session

    def create_event(
        self,
        *,
        workspace_id: uuid.UUID,
        session_id: uuid.UUID,
        event_type: str,
        payload: dict[str, object],
        actor_type: str,
        actor_id: str,
    ) -> SessionEvent:
        event = SessionEvent(
            workspace_id=workspace_id,
            session_id=session_id,
            event_type=event_type,
            payload=payload,
            actor_type=actor_type,
            actor_id=actor_id,
            created_at=datetime.now(UTC),
        )
        self.db.add(event)
        self.db.flush()
        return event

    def update_session_status(
        self,
        session: SessionModel,
        *,
        status: str,
        summary: str | None = None,
    ) -> SessionModel:
        session.status = status
        if summary is not None:
            session.summary = summary
        now = datetime.now(UTC)
        if status in {"planning", "running"} and session.started_at is None:
            session.started_at = now
        if status in {"completed", "failed", "stopped"}:
            session.completed_at = now
        self.db.add(session)
        self.db.flush()
        return session

    def create_task(
        self,
        *,
        workspace_id: uuid.UUID,
        session_id: uuid.UUID,
        title: str,
        description: str | None,
        position: int,
        status: str = "created",
    ) -> Task:
        task = Task(
            workspace_id=workspace_id,
            session_id=session_id,
            title=title,
            description=description,
            status=status,
            position=position,
        )
        self.db.add(task)
        self.db.flush()
        return task

    def create_step(
        self,
        *,
        workspace_id: uuid.UUID,
        session_id: uuid.UUID,
        task_id: uuid.UUID,
        title: str,
        description: str | None,
        position: int,
        status: str = "created",
        agent_role: str | None = None,
        step_input: str | None = None,
    ) -> Step:
        step = Step(
            workspace_id=workspace_id,
            session_id=session_id,
            task_id=task_id,
            title=title,
            description=description,
            status=status,
            agent_role=agent_role,
            position=position,
            input=step_input,
        )
        self.db.add(step)
        self.db.flush()
        return step

    def update_task_status(self, task: Task, *, status: str) -> Task:
        task.status = status
        self.db.add(task)
        self.db.flush()
        return task

    def update_task_result(
        self,
        task: Task,
        *,
        status: str | None = None,
        result_summary: str | None = None,
    ) -> Task:
        if status is not None:
            task.status = status
        if result_summary is not None:
            task.result_summary = result_summary
        self.db.add(task)
        self.db.flush()
        return task

    def update_step_status(
        self,
        step: Step,
        *,
        status: str,
        result: str | None = None,
    ) -> Step:
        step.status = status
        now = datetime.now(UTC)
        if status == "running" and step.started_at is None:
            step.started_at = now
        if status in {"completed", "failed", "skipped", "cancelled"}:
            step.completed_at = now
        if result is not None:
            step.result = result
        self.db.add(step)
        self.db.flush()
        return step

    def get_step(self, *, workspace_id: uuid.UUID, step_id: uuid.UUID) -> Step | None:
        return self.db.scalar(
            select(Step).where(Step.workspace_id == workspace_id, Step.id == step_id)
        )

    def list_tasks(self, *, workspace_id: uuid.UUID, session_id: uuid.UUID) -> list[Task]:
        return list(
            self.db.scalars(
                select(Task)
                .where(Task.workspace_id == workspace_id, Task.session_id == session_id)
                .order_by(Task.position)
            )
        )

    def list_steps(self, *, workspace_id: uuid.UUID, session_id: uuid.UUID) -> list[Step]:
        return list(
            self.db.scalars(
                select(Step)
                .where(Step.workspace_id == workspace_id, Step.session_id == session_id)
                .order_by(Step.task_id, Step.position)
            )
        )

    def get_next_ready_step(
        self,
        *,
        workspace_id: uuid.UUID,
        session_id: uuid.UUID,
    ) -> Step | None:
        return self.db.scalar(
            select(Step)
            .where(
                Step.workspace_id == workspace_id,
                Step.session_id == session_id,
                Step.status.in_(["ready", "running"]),
            )
            .order_by(Step.task_id, Step.position)
            .limit(1)
        )

    def create_job(
        self,
        *,
        workspace_id: uuid.UUID,
        session_id: uuid.UUID | None,
        job_type: str,
        payload: dict[str, object],
        max_attempts: int = 1,
    ) -> Job:
        now = datetime.now(UTC)
        job = Job(
            workspace_id=workspace_id,
            session_id=session_id,
            type=job_type,
            status="queued",
            payload=payload,
            attempts=0,
            max_attempts=max_attempts,
            run_after=now,
            created_at=now,
            updated_at=now,
        )
        self.db.add(job)
        self.db.flush()
        return job

    def get_job(self, *, workspace_id: uuid.UUID, job_id: uuid.UUID) -> Job | None:
        return self.db.scalar(
            select(Job).where(Job.id == job_id, Job.workspace_id == workspace_id)
        )

    def get_job_by_id(self, *, job_id: uuid.UUID) -> Job | None:
        return self.db.get(Job, job_id)

    def list_jobs(self, *, workspace_id: uuid.UUID, session_id: uuid.UUID) -> list[Job]:
        return list(
            self.db.scalars(
                select(Job)
                .where(Job.workspace_id == workspace_id, Job.session_id == session_id)
                .order_by(Job.created_at.desc())
            )
        )

    def mark_job_enqueued(self, job: Job, *, celery_task_id: str | None) -> Job:
        job.celery_task_id = celery_task_id
        self.db.add(job)
        self.db.flush()
        return job

    def claim_job(self, job: Job, *, worker_id: str) -> Job | None:
        now = datetime.now(UTC)
        run_after = _as_aware(job.run_after)
        if job.status != "queued" or run_after > now:
            return None
        job.status = "running"
        job.locked_by = worker_id
        job.locked_at = now
        job.started_at = job.started_at or now
        job.attempts += 1
        self.db.add(job)
        self.db.flush()
        return job

    def succeed_job(
        self,
        job: Job,
        *,
        result: dict[str, object] | None = None,
        progress: dict[str, object] | None = None,
    ) -> Job:
        job.status = "succeeded"
        job.result = result or {}
        job.progress = progress or {"percent": 100}
        job.finished_at = datetime.now(UTC)
        self.db.add(job)
        self.db.flush()
        return job

    def fail_job(self, job: Job, *, error: str) -> Job:
        job.status = "failed"
        job.last_error = error
        job.finished_at = datetime.now(UTC)
        self.db.add(job)
        self.db.flush()
        return job

    def cancel_queued_session_jobs(
        self,
        *,
        workspace_id: uuid.UUID,
        session_id: uuid.UUID,
    ) -> list[Job]:
        jobs = list(
            self.db.scalars(
                select(Job).where(
                    Job.workspace_id == workspace_id,
                    Job.session_id == session_id,
                    Job.status == "queued",
                )
            )
        )
        for job in jobs:
            job.status = "cancelled"
            job.finished_at = datetime.now(UTC)
            self.db.add(job)
        self.db.flush()
        return jobs

    def create_runtime_instance(
        self,
        *,
        runtime_id: uuid.UUID,
        workspace_id: uuid.UUID,
        session_id: uuid.UUID,
        image: str,
        status: str = "starting",
        runtime_type: str = "docker",
        external_id: str | None = None,
        workspace_path: str = "/workspace",
        ports: dict[str, object] | None = None,
        resource_limits: dict[str, object] | None = None,
    ) -> RuntimeInstance:
        now = datetime.now(UTC)
        runtime = RuntimeInstance(
            id=runtime_id,
            workspace_id=workspace_id,
            session_id=session_id,
            runtime_type=runtime_type,
            status=status,
            image=image,
            external_id=external_id,
            workspace_path=workspace_path,
            ports=ports or {},
            resource_limits=resource_limits or {},
            started_at=now if status == "running" else None,
        )
        self.db.add(runtime)
        self.db.flush()
        return runtime

    def get_runtime_instance(
        self,
        *,
        workspace_id: uuid.UUID,
        runtime_id: uuid.UUID,
    ) -> RuntimeInstance | None:
        return self.db.scalar(
            select(RuntimeInstance).where(
                RuntimeInstance.id == runtime_id,
                RuntimeInstance.workspace_id == workspace_id,
            )
        )

    def get_latest_runtime_instance(
        self,
        *,
        workspace_id: uuid.UUID,
        session_id: uuid.UUID,
    ) -> RuntimeInstance | None:
        return self.db.scalar(
            select(RuntimeInstance)
            .where(
                RuntimeInstance.workspace_id == workspace_id,
                RuntimeInstance.session_id == session_id,
            )
            .order_by(RuntimeInstance.created_at.desc())
            .limit(1)
        )

    def get_running_runtime_instance(
        self,
        *,
        workspace_id: uuid.UUID,
        session_id: uuid.UUID,
    ) -> RuntimeInstance | None:
        return self.db.scalar(
            select(RuntimeInstance)
            .where(
                RuntimeInstance.workspace_id == workspace_id,
                RuntimeInstance.session_id == session_id,
                RuntimeInstance.status == "running",
            )
            .order_by(RuntimeInstance.created_at.desc())
            .limit(1)
        )

    def update_runtime_instance(
        self,
        runtime: RuntimeInstance,
        *,
        status: str,
        external_id: str | None = None,
        image: str | None = None,
        workspace_path: str | None = None,
        ports: dict[str, object] | None = None,
        resource_limits: dict[str, object] | None = None,
    ) -> RuntimeInstance:
        runtime.status = status
        if external_id is not None:
            runtime.external_id = external_id
        if image is not None:
            runtime.image = image
        if workspace_path is not None:
            runtime.workspace_path = workspace_path
        if ports is not None:
            runtime.ports = ports
        if resource_limits is not None:
            runtime.resource_limits = resource_limits
        now = datetime.now(UTC)
        if status == "running" and runtime.started_at is None:
            runtime.started_at = now
        if status in {"stopped", "failed"}:
            runtime.stopped_at = now
        self.db.add(runtime)
        self.db.flush()
        return runtime

    def create_tool_call(
        self,
        *,
        workspace_id: uuid.UUID,
        session_id: uuid.UUID,
        tool_name: str,
        arguments: dict[str, object],
        policy_decision: dict[str, object],
        status: str = "queued",
        task_id: uuid.UUID | None = None,
        step_id: uuid.UUID | None = None,
        agent_message_id: uuid.UUID | None = None,
        tool_version: str | None = None,
        error_message: str | None = None,
    ) -> ToolCall:
        tool_call = ToolCall(
            workspace_id=workspace_id,
            session_id=session_id,
            task_id=task_id,
            step_id=step_id,
            agent_message_id=agent_message_id,
            tool_name=tool_name,
            tool_version=tool_version,
            status=status,
            arguments=arguments,
            policy_decision=policy_decision,
            error_message=error_message,
        )
        self.db.add(tool_call)
        self.db.flush()
        return tool_call

    def update_tool_call_status(
        self,
        tool_call: ToolCall,
        *,
        status: str,
        policy_decision: dict[str, object] | None = None,
        error_message: str | None = None,
    ) -> ToolCall:
        tool_call.status = status
        if policy_decision is not None:
            tool_call.policy_decision = policy_decision
        if error_message is not None:
            tool_call.error_message = error_message
        if status in {"succeeded", "failed", "timed_out", "cancelled", "denied"}:
            tool_call.completed_at = datetime.now(UTC)
        self.db.add(tool_call)
        self.db.flush()
        return tool_call

    def get_tool_call(
        self,
        *,
        workspace_id: uuid.UUID,
        tool_call_id: uuid.UUID,
    ) -> ToolCall | None:
        return self.db.scalar(
            select(ToolCall).where(
                ToolCall.id == tool_call_id,
                ToolCall.workspace_id == workspace_id,
            )
        )

    def get_tool_call_by_id(self, *, tool_call_id: uuid.UUID) -> ToolCall | None:
        return self.db.get(ToolCall, tool_call_id)

    def list_tool_calls(
        self,
        *,
        workspace_id: uuid.UUID,
        session_id: uuid.UUID,
        limit: int = 100,
    ) -> list[ToolCall]:
        return list(
            self.db.scalars(
                select(ToolCall)
                .where(ToolCall.workspace_id == workspace_id, ToolCall.session_id == session_id)
                .order_by(ToolCall.created_at.desc())
                .limit(limit)
            )
        )

    def list_tool_calls_for_step(
        self,
        *,
        workspace_id: uuid.UUID,
        step_id: uuid.UUID,
    ) -> list[ToolCall]:
        return list(
            self.db.scalars(
                select(ToolCall)
                .where(ToolCall.workspace_id == workspace_id, ToolCall.step_id == step_id)
                .order_by(ToolCall.created_at.desc())
            )
        )

    def mark_tool_call_running(
        self,
        tool_call: ToolCall,
        *,
        runtime_instance_id: uuid.UUID,
        runtime_command_id: str | None = None,
    ) -> ToolCall:
        tool_call.status = "running"
        tool_call.runtime_instance_id = runtime_instance_id
        tool_call.runtime_command_id = runtime_command_id
        tool_call.started_at = datetime.now(UTC)
        self.db.add(tool_call)
        self.db.flush()
        return tool_call

    def finish_tool_call(
        self,
        tool_call: ToolCall,
        *,
        status: str,
        result: dict[str, object] | None = None,
        raw_output: str | None = None,
        error_message: str | None = None,
        runtime_command_id: str | None = None,
        duration_ms: int | None = None,
    ) -> ToolCall:
        tool_call.status = status
        tool_call.result = result or {}
        tool_call.raw_output = raw_output
        tool_call.error_message = error_message
        if runtime_command_id is not None:
            tool_call.runtime_command_id = runtime_command_id
        tool_call.duration_ms = duration_ms
        tool_call.completed_at = datetime.now(UTC)
        self.db.add(tool_call)
        self.db.flush()
        return tool_call

    def cancel_active_tool_calls(
        self,
        *,
        workspace_id: uuid.UUID,
        session_id: uuid.UUID,
    ) -> list[ToolCall]:
        tool_calls = list(
            self.db.scalars(
                select(ToolCall).where(
                    ToolCall.workspace_id == workspace_id,
                    ToolCall.session_id == session_id,
                    ToolCall.status.in_(["queued", "running", "awaiting_approval"]),
                )
            )
        )
        now = datetime.now(UTC)
        for tool_call in tool_calls:
            tool_call.status = "cancelled"
            tool_call.completed_at = now
            self.db.add(tool_call)
        self.db.flush()
        return tool_calls

    def create_agent_message(
        self,
        *,
        workspace_id: uuid.UUID,
        session_id: uuid.UUID,
        agent_role: str,
        message_type: str,
        content: str,
        metadata: dict[str, object] | None = None,
        task_id: uuid.UUID | None = None,
        step_id: uuid.UUID | None = None,
        token_input: int | None = None,
        token_output: int | None = None,
    ) -> AgentMessage:
        message = AgentMessage(
            workspace_id=workspace_id,
            session_id=session_id,
            task_id=task_id,
            step_id=step_id,
            agent_role=agent_role,
            message_type=message_type,
            content=content,
            metadata_json=metadata or {},
            token_input=token_input,
            token_output=token_output,
            created_at=datetime.now(UTC),
        )
        self.db.add(message)
        self.db.flush()
        return message

    def list_agent_messages(
        self,
        *,
        workspace_id: uuid.UUID,
        session_id: uuid.UUID,
        limit: int = 100,
    ) -> list[AgentMessage]:
        return list(
            self.db.scalars(
                select(AgentMessage)
                .where(
                    AgentMessage.workspace_id == workspace_id,
                    AgentMessage.session_id == session_id,
                )
                .order_by(AgentMessage.created_at)
                .limit(limit)
            )
        )

    def create_policy_decision(
        self,
        *,
        workspace_id: uuid.UUID,
        session_id: uuid.UUID,
        action_type: str,
        tool_name: str,
        decision: str,
        risk_level: str,
        reasons: list[str],
        matched_rules: dict[str, object],
        constraints: dict[str, object],
        input_summary: dict[str, object],
        actor_type: str,
        actor_id: str,
        task_id: uuid.UUID | None = None,
        step_id: uuid.UUID | None = None,
        tool_call_id: uuid.UUID | None = None,
    ) -> PolicyDecision:
        policy_decision = PolicyDecision(
            workspace_id=workspace_id,
            session_id=session_id,
            task_id=task_id,
            step_id=step_id,
            tool_call_id=tool_call_id,
            action_type=action_type,
            tool_name=tool_name,
            decision=decision,
            risk_level=risk_level,
            reasons={"items": reasons},
            matched_rules=matched_rules,
            constraints=constraints,
            input_summary=input_summary,
            actor_type=actor_type,
            actor_id=actor_id,
            created_at=datetime.now(UTC),
        )
        self.db.add(policy_decision)
        self.db.flush()
        return policy_decision

    def list_policy_decisions(
        self,
        *,
        workspace_id: uuid.UUID,
        session_id: uuid.UUID | None = None,
        limit: int = 100,
    ) -> list[PolicyDecision]:
        statement = select(PolicyDecision).where(PolicyDecision.workspace_id == workspace_id)
        if session_id is not None:
            statement = statement.where(PolicyDecision.session_id == session_id)
        return list(
            self.db.scalars(statement.order_by(PolicyDecision.created_at.desc()).limit(limit))
        )

    def create_approval_request(
        self,
        *,
        workspace_id: uuid.UUID,
        session_id: uuid.UUID,
        risk_level: str,
        reason: str,
        requested_action: dict[str, object],
        requested_by_agent: str,
        task_id: uuid.UUID | None = None,
        step_id: uuid.UUID | None = None,
        tool_call_id: uuid.UUID | None = None,
    ) -> ApprovalRequest:
        approval = ApprovalRequest(
            workspace_id=workspace_id,
            session_id=session_id,
            task_id=task_id,
            step_id=step_id,
            tool_call_id=tool_call_id,
            status="pending",
            risk_level=risk_level,
            reason=reason,
            requested_action=requested_action,
            requested_by_agent=requested_by_agent,
            created_at=datetime.now(UTC),
        )
        self.db.add(approval)
        self.db.flush()
        return approval

    def list_approval_requests(
        self,
        *,
        workspace_id: uuid.UUID,
        status: str | None = None,
        limit: int = 100,
    ) -> list[ApprovalRequest]:
        statement = select(ApprovalRequest).where(ApprovalRequest.workspace_id == workspace_id)
        if status is not None:
            statement = statement.where(ApprovalRequest.status == status)
        return list(
            self.db.scalars(statement.order_by(ApprovalRequest.created_at.desc()).limit(limit))
        )

    def get_approval_request(
        self,
        *,
        workspace_id: uuid.UUID,
        approval_id: uuid.UUID,
    ) -> ApprovalRequest | None:
        return self.db.scalar(
            select(ApprovalRequest).where(
                ApprovalRequest.workspace_id == workspace_id,
                ApprovalRequest.id == approval_id,
            )
        )

    def resolve_approval_request(
        self,
        approval: ApprovalRequest,
        *,
        status: str,
        resolved_by: uuid.UUID,
        resolution_note: str | None = None,
    ) -> ApprovalRequest:
        approval.status = status
        approval.resolved_by = resolved_by
        approval.resolution_note = resolution_note
        approval.resolved_at = datetime.now(UTC)
        self.db.add(approval)
        self.db.flush()
        return approval

    def list_tool_definitions(
        self,
        *,
        workspace_id: uuid.UUID,
        include_disabled: bool = False,
    ) -> list[ToolDefinition]:
        statement = select(ToolDefinition).where(
            ToolDefinition.deleted_at.is_(None),
            or_(
                ToolDefinition.workspace_id == workspace_id,
                ToolDefinition.workspace_id.is_(None),
            ),
        )
        if not include_disabled:
            statement = statement.where(ToolDefinition.enabled.is_(True))
        return list(self.db.scalars(statement.order_by(ToolDefinition.name)))

    def get_tool_definition(
        self,
        *,
        workspace_id: uuid.UUID,
        name: str,
    ) -> ToolDefinition | None:
        return self.db.scalar(
            select(ToolDefinition)
            .where(
                ToolDefinition.deleted_at.is_(None),
                ToolDefinition.name == name,
                or_(
                    ToolDefinition.workspace_id == workspace_id,
                    ToolDefinition.workspace_id.is_(None),
                ),
            )
            .order_by(ToolDefinition.workspace_id.is_not(None).desc())
            .limit(1)
        )

    def list_stale_running_jobs(self, *, older_than: datetime) -> list[Job]:
        return list(
            self.db.scalars(
                select(Job).where(
                    Job.status == "running",
                    Job.locked_at.is_not(None),
                    Job.locked_at < older_than,
                )
            )
        )

    def list_events(
        self,
        *,
        workspace_id: uuid.UUID,
        session_id: uuid.UUID,
        after_id: int | None = None,
        limit: int = 200,
    ) -> list[SessionEvent]:
        statement = select(SessionEvent).where(
            SessionEvent.workspace_id == workspace_id,
            SessionEvent.session_id == session_id,
        )
        if after_id is not None:
            statement = statement.where(SessionEvent.id > after_id)
        return list(self.db.scalars(statement.order_by(SessionEvent.id).limit(limit)))


def _as_aware(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=UTC)
    return value
