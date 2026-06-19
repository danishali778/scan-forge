from pydantic import BaseModel, Field


class SessionCreateRequest(BaseModel):
    project_id: str
    scope_id: str
    policy_id: str | None = None
    provider_profile_id: str | None = None
    title: str
    objective: str
    mode: str = "assisted"


class SessionSummary(BaseModel):
    id: str
    title: str
    status: str
    mode: str
    project_id: str
    scope_id: str
    provider_profile_id: str | None = None
    policy_id: str | None = None


class SessionDetail(SessionSummary):
    objective: str
    created_by: str


class StepResponse(BaseModel):
    id: str
    session_id: str
    task_id: str
    title: str
    description: str | None = None
    status: str
    agent_role: str | None = None
    position: int
    input: str | None = None
    result: str | None = None


class TaskResponse(BaseModel):
    id: str
    session_id: str
    title: str
    description: str | None = None
    status: str
    position: int
    result_summary: str | None = None
    steps: list[StepResponse] = Field(default_factory=list)


class JobResponse(BaseModel):
    id: str
    session_id: str | None = None
    type: str
    status: str
    attempts: int
    max_attempts: int
    progress: dict[str, object] | None = None
    result: dict[str, object] | None = None
    last_error: str | None = None
    celery_task_id: str | None = None
    created_at: str
    started_at: str | None = None
    finished_at: str | None = None


class SessionEventResponse(BaseModel):
    id: int
    session_id: str
    event_type: str
    payload: dict[str, object]
    actor_type: str
    actor_id: str
    created_at: str


class RuntimeInstanceResponse(BaseModel):
    id: str
    session_id: str
    runtime_type: str
    status: str
    image: str
    external_id: str | None = None
    workspace_path: str
    ports: dict[str, object] = Field(default_factory=dict)
    resource_limits: dict[str, object] = Field(default_factory=dict)
    started_at: str | None = None
    stopped_at: str | None = None


class ToolCallResponse(BaseModel):
    id: str
    session_id: str
    task_id: str | None = None
    step_id: str | None = None
    agent_message_id: str | None = None
    runtime_instance_id: str | None = None
    tool_name: str
    tool_version: str | None = None
    status: str
    arguments: dict[str, object]
    result: dict[str, object] | None = None
    raw_output: str | None = None
    error_message: str | None = None
    policy_decision: dict[str, object]
    runtime_command_id: str | None = None
    duration_ms: int | None = None
    started_at: str | None = None
    completed_at: str | None = None


class TerminalCommandRequest(BaseModel):
    command: list[str] = Field(min_length=1)
    cwd: str = "/workspace"
    timeout_seconds: int | None = Field(default=None, ge=1, le=3600)
    max_output_bytes: int | None = Field(default=None, ge=1, le=10_485_760)


class RuntimeFileEntry(BaseModel):
    name: str
    path: str
    type: str
    size_bytes: int | None = None


class RuntimeFileListResponse(BaseModel):
    path: str
    entries: list[RuntimeFileEntry] = Field(default_factory=list)


class RuntimeFileContentResponse(BaseModel):
    path: str
    content: str
    size_bytes: int


class RuntimeFileWriteRequest(BaseModel):
    path: str
    content: str


class RuntimeFileWriteResponse(BaseModel):
    path: str
    size_bytes: int
