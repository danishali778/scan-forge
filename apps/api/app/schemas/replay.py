from typing import Any

from pydantic import BaseModel, Field

from app.schemas.review import FileAssetResponse


class ReplaySessionSummary(BaseModel):
    id: str
    title: str
    status: str


class ReplaySummary(BaseModel):
    event_count: int
    counts_by_category: dict[str, int] = Field(default_factory=dict)
    first_event_id: int | None = None
    last_event_id: int | None = None
    first_event_at: str | None = None
    last_event_at: str | None = None
    session_status: str
    task_count: int
    tool_call_count: int
    evidence_count: int
    finding_count: int
    approval_count: int


class ReplayFrame(BaseModel):
    event_id: int
    timestamp: str
    event_type: str
    category: str
    title: str
    actor_type: str
    actor_id: str
    resource_type: str | None = None
    resource_id: str | None = None
    task_id: str | None = None
    step_id: str | None = None
    summary: str
    payload: dict[str, Any]
    payload_truncated: bool = False


class SessionReplayResponse(BaseModel):
    session: ReplaySessionSummary
    summary: ReplaySummary
    frames: list[ReplayFrame] = Field(default_factory=list)


class SessionReplayExportResponse(BaseModel):
    file_asset: FileAssetResponse

