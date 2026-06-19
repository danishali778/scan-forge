from pydantic import BaseModel, Field


class AnalyticsWindow(BaseModel):
    from_date: str
    to_date: str
    project_id: str | None = None


class CountItem(BaseModel):
    key: str
    count: int


class ToolAnalyticsItem(BaseModel):
    tool_name: str
    count: int
    succeeded: int
    failed: int
    average_duration_ms: float | None = None


class ProjectFindingItem(BaseModel):
    project_id: str
    count: int


class AnalyticsOverviewResponse(BaseModel):
    window: AnalyticsWindow
    session_count: int
    session_status_counts: list[CountItem] = Field(default_factory=list)
    finding_severity_counts: list[CountItem] = Field(default_factory=list)
    tool_call_count: int
    tool_success_rate: float | None = None
    approval_counts: list[CountItem] = Field(default_factory=list)
    job_failure_count: int


class AnalyticsSessionsResponse(BaseModel):
    window: AnalyticsWindow
    total: int
    status_counts: list[CountItem] = Field(default_factory=list)
    average_duration_seconds: float | None = None
    completed_count: int
    failed_count: int
    stopped_count: int


class AnalyticsToolsResponse(BaseModel):
    window: AnalyticsWindow
    total: int
    status_counts: list[CountItem] = Field(default_factory=list)
    by_tool: list[ToolAnalyticsItem] = Field(default_factory=list)
    top_failed_tools: list[ToolAnalyticsItem] = Field(default_factory=list)


class AnalyticsFindingsResponse(BaseModel):
    window: AnalyticsWindow
    total: int
    by_severity: list[CountItem] = Field(default_factory=list)
    by_status: list[CountItem] = Field(default_factory=list)
    by_confidence: list[CountItem] = Field(default_factory=list)
    by_project: list[ProjectFindingItem] = Field(default_factory=list)


class AnalyticsApprovalsResponse(BaseModel):
    window: AnalyticsWindow
    total: int
    status_counts: list[CountItem] = Field(default_factory=list)
    average_resolution_seconds: float | None = None
    pending_count: int
    approved_count: int
    denied_count: int

