from pydantic import BaseModel, Field


class ToolDefinitionResponse(BaseModel):
    id: str
    name: str
    version: str
    description: str
    category: str
    risk_level: str
    runtime_type: str
    input_schema: dict[str, object]
    output_schema: dict[str, object]
    enabled: bool


class AgentMessageResponse(BaseModel):
    id: str
    session_id: str
    task_id: str | None = None
    step_id: str | None = None
    agent_role: str
    message_type: str
    content: str
    metadata: dict[str, object]
    token_input: int | None = None
    token_output: int | None = None
    created_at: str


class AgentRunRequest(BaseModel):
    max_turns: int | None = Field(default=None, ge=1, le=10)


class AgentRunResponse(BaseModel):
    job_id: str
    session_id: str
    status: str


class ApprovalResponse(BaseModel):
    id: str
    session_id: str
    task_id: str | None = None
    step_id: str | None = None
    tool_call_id: str | None = None
    status: str
    risk_level: str
    reason: str
    requested_action: dict[str, object]
    requested_by_agent: str
    resolved_by: str | None = None
    resolution_note: str | None = None
    created_at: str
    resolved_at: str | None = None


class ApprovalResolveRequest(BaseModel):
    note: str | None = None
