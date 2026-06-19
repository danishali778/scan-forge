from app.models.session import (
    AgentMessage,
    ApprovalRequest,
    Job,
    RuntimeInstance,
    SessionEvent,
    SessionModel,
    Step,
    Task,
    ToolCall,
)
from app.schemas.agents import AgentMessageResponse, ApprovalResponse
from app.schemas.sessions import (
    JobResponse,
    RuntimeInstanceResponse,
    SessionDetail,
    SessionEventResponse,
    SessionSummary,
    StepResponse,
    TaskResponse,
    ToolCallResponse,
)


def session_summary(session: SessionModel) -> SessionSummary:
    return SessionSummary(
        id=str(session.id),
        title=session.title,
        status=session.status,
        mode=session.mode,
        project_id=str(session.project_id),
        scope_id=str(session.scope_id),
        provider_profile_id=str(session.provider_profile_id)
        if session.provider_profile_id
        else None,
        policy_id=str(session.policy_id) if session.policy_id else None,
    )


def session_detail(session: SessionModel) -> SessionDetail:
    return SessionDetail(
        **session_summary(session).model_dump(),
        objective=session.objective,
        created_by=str(session.created_by),
    )


def session_event_response(event: SessionEvent) -> SessionEventResponse:
    return SessionEventResponse(
        id=event.id,
        session_id=str(event.session_id),
        event_type=event.event_type,
        payload=event.payload,
        actor_type=event.actor_type,
        actor_id=event.actor_id,
        created_at=event.created_at.isoformat(),
    )


def step_response(step: Step) -> StepResponse:
    return StepResponse(
        id=str(step.id),
        session_id=str(step.session_id),
        task_id=str(step.task_id),
        title=step.title,
        description=step.description,
        status=step.status,
        agent_role=step.agent_role,
        position=step.position,
        input=step.input,
        result=step.result,
    )


def task_response(task: Task, *, steps: list[Step]) -> TaskResponse:
    return TaskResponse(
        id=str(task.id),
        session_id=str(task.session_id),
        title=task.title,
        description=task.description,
        status=task.status,
        position=task.position,
        result_summary=task.result_summary,
        steps=[step_response(step) for step in steps],
    )


def job_response(job: Job) -> JobResponse:
    return JobResponse(
        id=str(job.id),
        session_id=str(job.session_id) if job.session_id else None,
        type=job.type,
        status=job.status,
        attempts=job.attempts,
        max_attempts=job.max_attempts,
        progress=job.progress,
        result=job.result,
        last_error=job.last_error,
        celery_task_id=job.celery_task_id,
        created_at=job.created_at.isoformat(),
        started_at=job.started_at.isoformat() if job.started_at else None,
        finished_at=job.finished_at.isoformat() if job.finished_at else None,
    )


def runtime_instance_response(runtime: RuntimeInstance) -> RuntimeInstanceResponse:
    return RuntimeInstanceResponse(
        id=str(runtime.id),
        session_id=str(runtime.session_id),
        runtime_type=runtime.runtime_type,
        status=runtime.status,
        image=runtime.image,
        external_id=runtime.external_id,
        workspace_path=runtime.workspace_path,
        ports=runtime.ports,
        resource_limits=runtime.resource_limits,
        started_at=runtime.started_at.isoformat() if runtime.started_at else None,
        stopped_at=runtime.stopped_at.isoformat() if runtime.stopped_at else None,
    )


def tool_call_response(tool_call: ToolCall) -> ToolCallResponse:
    return ToolCallResponse(
        id=str(tool_call.id),
        session_id=str(tool_call.session_id),
        task_id=str(tool_call.task_id) if tool_call.task_id else None,
        step_id=str(tool_call.step_id) if tool_call.step_id else None,
        agent_message_id=str(tool_call.agent_message_id) if tool_call.agent_message_id else None,
        runtime_instance_id=str(tool_call.runtime_instance_id)
        if tool_call.runtime_instance_id
        else None,
        tool_name=tool_call.tool_name,
        tool_version=tool_call.tool_version,
        status=tool_call.status,
        arguments=tool_call.arguments,
        result=tool_call.result,
        raw_output=tool_call.raw_output,
        error_message=tool_call.error_message,
        policy_decision=tool_call.policy_decision,
        runtime_command_id=tool_call.runtime_command_id,
        duration_ms=tool_call.duration_ms,
        started_at=tool_call.started_at.isoformat() if tool_call.started_at else None,
        completed_at=tool_call.completed_at.isoformat() if tool_call.completed_at else None,
    )


def agent_message_response(message: AgentMessage) -> AgentMessageResponse:
    return AgentMessageResponse(
        id=str(message.id),
        session_id=str(message.session_id),
        task_id=str(message.task_id) if message.task_id else None,
        step_id=str(message.step_id) if message.step_id else None,
        agent_role=message.agent_role,
        message_type=message.message_type,
        content=message.content,
        metadata=message.metadata_json,
        token_input=message.token_input,
        token_output=message.token_output,
        created_at=message.created_at.isoformat(),
    )


def approval_response(approval: ApprovalRequest) -> ApprovalResponse:
    return ApprovalResponse(
        id=str(approval.id),
        session_id=str(approval.session_id),
        task_id=str(approval.task_id) if approval.task_id else None,
        step_id=str(approval.step_id) if approval.step_id else None,
        tool_call_id=str(approval.tool_call_id) if approval.tool_call_id else None,
        status=approval.status,
        risk_level=approval.risk_level,
        reason=approval.reason,
        requested_action=approval.requested_action,
        requested_by_agent=approval.requested_by_agent,
        resolved_by=str(approval.resolved_by) if approval.resolved_by else None,
        resolution_note=approval.resolution_note,
        created_at=approval.created_at.isoformat(),
        resolved_at=approval.resolved_at.isoformat() if approval.resolved_at else None,
    )
