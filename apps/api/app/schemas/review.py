from pydantic import BaseModel, Field


class FileAssetResponse(BaseModel):
    id: str
    storage_backend: str
    storage_key: str
    filename: str
    mime_type: str | None = None
    size_bytes: int
    sha256: str
    metadata: dict[str, object]
    created_at: str


class FileAssetContentResponse(BaseModel):
    id: str
    filename: str
    mime_type: str | None = None
    content: str
    size_bytes: int


class EvidenceCreateRequest(BaseModel):
    type: str = "note"
    title: str
    summary: str
    content: str | None = None
    task_id: str | None = None
    step_id: str | None = None
    tool_call_id: str | None = None
    metadata: dict[str, object] = Field(default_factory=dict)


class EvidenceFromToolCallRequest(BaseModel):
    tool_call_id: str
    title: str | None = None
    summary: str | None = None


class EvidenceFromFileRequest(BaseModel):
    path: str
    title: str
    summary: str
    task_id: str | None = None
    step_id: str | None = None


class EvidenceUpdateRequest(BaseModel):
    title: str | None = None
    summary: str | None = None
    content: str | None = None
    metadata: dict[str, object] | None = None


class EvidenceResponse(BaseModel):
    id: str
    project_id: str
    session_id: str
    task_id: str | None = None
    step_id: str | None = None
    tool_call_id: str | None = None
    type: str
    title: str
    summary: str
    content: str | None = None
    asset_id: str | None = None
    metadata: dict[str, object]
    created_by_agent: bool
    created_at: str


class FindingCreateRequest(BaseModel):
    title: str
    severity: str
    confidence: str = "medium"
    affected_assets: list[object] = Field(default_factory=list)
    description: str
    impact: str
    reproduction_steps: str
    remediation: str
    references: list[object] = Field(default_factory=list)
    evidence_ids: list[str] = Field(default_factory=list)


class CandidateFindingRequest(BaseModel):
    evidence_ids: list[str] | None = None


class FindingUpdateRequest(BaseModel):
    title: str | None = None
    severity: str | None = None
    confidence: str | None = None
    affected_assets: list[object] | None = None
    description: str | None = None
    impact: str | None = None
    reproduction_steps: str | None = None
    remediation: str | None = None
    references: list[object] | None = None
    status: str | None = None


class FindingReviewRequest(BaseModel):
    status: str
    review_note: str | None = None


class FindingEvidenceAttachRequest(BaseModel):
    evidence_id: str
    relationship: str = "supporting"


class FindingResponse(BaseModel):
    id: str
    project_id: str
    session_id: str
    title: str
    status: str
    severity: str
    confidence: str
    affected_assets: list[object]
    description: str
    impact: str
    reproduction_steps: str
    remediation: str
    references: list[object]
    evidence_ids: list[str] = Field(default_factory=list)
    created_by_agent: bool
    reviewed_by: str | None = None
    review_note: str | None = None
    created_at: str
    updated_at: str


class ReportCreateRequest(BaseModel):
    title: str | None = None


class ReportUpdateRequest(BaseModel):
    title: str | None = None


class ReportResponse(BaseModel):
    id: str
    project_id: str
    session_id: str
    title: str
    status: str
    format: str
    content: dict[str, object]
    asset_id: str | None = None
    created_at: str
    updated_at: str


class ReportExportResponse(BaseModel):
    report_id: str
    format: str
    filename: str
    content: str
    asset_id: str
