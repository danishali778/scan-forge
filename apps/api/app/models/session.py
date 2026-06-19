import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Index, Integer, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, JsonDict, SoftDeleteMixin, TimestampMixin, json_dict, uuid_pk


class SessionModel(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "sessions"

    id: Mapped[uuid.UUID] = uuid_pk()
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id"), nullable=False)
    project_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("projects.id"), nullable=False)
    scope_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("scopes.id"), nullable=False)
    provider_profile_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("provider_profiles.id"),
        nullable=True,
    )
    policy_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("policies.id"), nullable=True)
    created_by: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    objective: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="draft", nullable=False)
    mode: Mapped[str] = mapped_column(String(50), default="assisted", nullable=False)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(
        "metadata",
        JsonDict,
        default=dict,
        nullable=False,
    )
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ix_sessions_workspace_project_created", "workspace_id", "project_id", "created_at"),
        Index("ix_sessions_workspace_status", "workspace_id", "status"),
        Index("ix_sessions_workspace_creator_created", "workspace_id", "created_by", "created_at"),
    )


class SessionEvent(Base):
    __tablename__ = "session_events"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id"), nullable=False)
    session_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("sessions.id"), nullable=False)
    event_type: Mapped[str] = mapped_column(String(120), nullable=False)
    payload: Mapped[dict[str, Any]] = json_dict()
    actor_type: Mapped[str] = mapped_column(String(50), nullable=False)
    actor_id: Mapped[str] = mapped_column(String(120), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("ix_session_events_session_id", "session_id", "id"),
        Index("ix_session_events_workspace_created", "workspace_id", "created_at"),
        Index("ix_session_events_type_created", "event_type", "created_at"),
    )


class Task(Base, TimestampMixin):
    __tablename__ = "tasks"

    id: Mapped[uuid.UUID] = uuid_pk()
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id"), nullable=False)
    session_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("sessions.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="created", nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    result_summary: Mapped[str | None] = mapped_column(Text, nullable=True)

    __table_args__ = (
        Index("ix_tasks_session_position", "session_id", "position"),
        Index("ix_tasks_workspace_status", "workspace_id", "status"),
    )


class Step(Base, TimestampMixin):
    __tablename__ = "steps"

    id: Mapped[uuid.UUID] = uuid_pk()
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id"), nullable=False)
    session_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("sessions.id"), nullable=False)
    task_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("tasks.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="created", nullable=False)
    agent_role: Mapped[str | None] = mapped_column(String(80), nullable=True)
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    input: Mapped[str | None] = mapped_column(Text, nullable=True)
    result: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ix_steps_task_position", "task_id", "position"),
        Index("ix_steps_session_status", "session_id", "status"),
    )


class Job(Base, TimestampMixin):
    __tablename__ = "jobs"

    id: Mapped[uuid.UUID] = uuid_pk()
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id"), nullable=False)
    session_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("sessions.id"), nullable=True)
    type: Mapped[str] = mapped_column(String(120), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="queued", nullable=False)
    payload: Mapped[dict[str, Any]] = json_dict()
    celery_task_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    attempts: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    max_attempts: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    progress: Mapped[dict[str, Any] | None] = mapped_column(JsonDict, nullable=True)
    result: Mapped[dict[str, Any] | None] = mapped_column(JsonDict, nullable=True)
    locked_by: Mapped[str | None] = mapped_column(String(255), nullable=True)
    locked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    run_after: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    last_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ix_jobs_status_run_after", "status", "run_after"),
        Index("ix_jobs_session_created", "session_id", "created_at"),
        Index("ix_jobs_celery_task_id", "celery_task_id"),
    )


class RuntimeInstance(Base, TimestampMixin):
    __tablename__ = "runtime_instances"

    id: Mapped[uuid.UUID] = uuid_pk()
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id"), nullable=False)
    session_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("sessions.id"), nullable=False)
    runtime_type: Mapped[str] = mapped_column(String(50), default="docker", nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="starting", nullable=False)
    image: Mapped[str] = mapped_column(String(255), nullable=False)
    external_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    workspace_path: Mapped[str] = mapped_column(String(255), default="/workspace", nullable=False)
    ports: Mapped[dict[str, Any]] = json_dict()
    resource_limits: Mapped[dict[str, Any]] = json_dict()
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    stopped_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ix_runtime_instances_session_status", "session_id", "status"),
        Index("ix_runtime_instances_workspace_status", "workspace_id", "status"),
        Index("ix_runtime_instances_external_id", "external_id"),
    )


class AgentMessage(Base):
    __tablename__ = "agent_messages"

    id: Mapped[uuid.UUID] = uuid_pk()
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id"), nullable=False)
    session_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("sessions.id"), nullable=False)
    task_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("tasks.id"), nullable=True)
    step_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("steps.id"), nullable=True)
    agent_role: Mapped[str] = mapped_column(String(80), nullable=False)
    message_type: Mapped[str] = mapped_column(String(50), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(
        "metadata",
        JsonDict,
        default=dict,
        nullable=False,
    )
    token_input: Mapped[int | None] = mapped_column(Integer, nullable=True)
    token_output: Mapped[int | None] = mapped_column(Integer, nullable=True)
    cost_input: Mapped[float | None] = mapped_column(Numeric(12, 6), nullable=True)
    cost_output: Mapped[float | None] = mapped_column(Numeric(12, 6), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("ix_agent_messages_session_created", "session_id", "created_at"),
        Index("ix_agent_messages_session_role_created", "session_id", "agent_role", "created_at"),
    )


class ToolCall(Base, TimestampMixin):
    __tablename__ = "tool_calls"

    id: Mapped[uuid.UUID] = uuid_pk()
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id"), nullable=False)
    session_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("sessions.id"), nullable=False)
    task_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("tasks.id"), nullable=True)
    step_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("steps.id"), nullable=True)
    agent_message_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("agent_messages.id"),
        nullable=True,
    )
    runtime_instance_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("runtime_instances.id"),
        nullable=True,
    )
    tool_name: Mapped[str] = mapped_column(String(120), nullable=False)
    tool_version: Mapped[str | None] = mapped_column(String(80), nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="queued", nullable=False)
    arguments: Mapped[dict[str, Any]] = json_dict()
    result: Mapped[dict[str, Any] | None] = mapped_column(JsonDict, nullable=True)
    raw_output: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    policy_decision: Mapped[dict[str, Any]] = json_dict()
    runtime_command_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)

    __table_args__ = (
        Index("ix_tool_calls_session_created", "session_id", "created_at"),
        Index("ix_tool_calls_session_status", "session_id", "status"),
        Index("ix_tool_calls_runtime_instance", "runtime_instance_id"),
        Index("ix_tool_calls_tool_name_created", "tool_name", "created_at"),
    )


class PolicyDecision(Base):
    __tablename__ = "policy_decisions"

    id: Mapped[uuid.UUID] = uuid_pk()
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id"), nullable=False)
    session_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("sessions.id"), nullable=False)
    task_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("tasks.id"), nullable=True)
    step_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("steps.id"), nullable=True)
    tool_call_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("tool_calls.id"),
        nullable=True,
    )
    action_type: Mapped[str] = mapped_column(String(80), nullable=False)
    tool_name: Mapped[str] = mapped_column(String(120), nullable=False)
    decision: Mapped[str] = mapped_column(String(50), nullable=False)
    risk_level: Mapped[str] = mapped_column(String(50), nullable=False)
    reasons: Mapped[dict[str, Any]] = json_dict()
    matched_rules: Mapped[dict[str, Any]] = json_dict()
    constraints: Mapped[dict[str, Any]] = json_dict()
    input_summary: Mapped[dict[str, Any]] = json_dict()
    actor_type: Mapped[str] = mapped_column(String(50), nullable=False)
    actor_id: Mapped[str] = mapped_column(String(120), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("ix_policy_decisions_session_created", "session_id", "created_at"),
        Index("ix_policy_decisions_workspace_decision", "workspace_id", "decision"),
        Index("ix_policy_decisions_tool_call", "tool_call_id"),
    )


class ApprovalRequest(Base):
    __tablename__ = "approval_requests"

    id: Mapped[uuid.UUID] = uuid_pk()
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id"), nullable=False)
    session_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("sessions.id"), nullable=False)
    task_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("tasks.id"), nullable=True)
    step_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("steps.id"), nullable=True)
    tool_call_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("tool_calls.id"),
        nullable=True,
    )
    status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)
    risk_level: Mapped[str] = mapped_column(String(50), nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    requested_action: Mapped[dict[str, Any]] = json_dict()
    requested_by_agent: Mapped[str] = mapped_column(String(80), nullable=False)
    resolved_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    resolution_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ix_approval_requests_session_status", "session_id", "status"),
        Index(
            "ix_approval_requests_workspace_status_created",
            "workspace_id",
            "status",
            "created_at",
        ),
    )


class ToolDefinition(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "tool_definitions"

    id: Mapped[uuid.UUID] = uuid_pk()
    workspace_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("workspaces.id"),
        nullable=True,
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    version: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    category: Mapped[str] = mapped_column(String(80), nullable=False)
    risk_level: Mapped[str] = mapped_column(String(50), nullable=False)
    runtime_type: Mapped[str] = mapped_column(String(80), nullable=False)
    input_schema: Mapped[dict[str, Any]] = json_dict()
    output_schema: Mapped[dict[str, Any]] = json_dict()
    enabled: Mapped[bool] = mapped_column(default=True, nullable=False)

    __table_args__ = (
        Index("ix_tool_definitions_name_version", "name", "version", unique=True),
        Index("ix_tool_definitions_workspace_enabled", "workspace_id", "enabled"),
    )
