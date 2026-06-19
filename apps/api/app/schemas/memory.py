from pydantic import BaseModel, Field


class MemoryCreateRequest(BaseModel):
    title: str
    summary: str
    content: str
    visibility: str = "session"
    project_id: str | None = None
    session_id: str | None = None
    source_type: str = "manual"
    metadata: dict[str, object] = Field(default_factory=dict)
    provider_profile_id: str | None = None


class MemoryUpdateRequest(BaseModel):
    title: str | None = None
    summary: str | None = None
    content: str | None = None
    visibility: str | None = None
    metadata: dict[str, object] | None = None
    provider_profile_id: str | None = None


class MemoryReviewRequest(BaseModel):
    review_note: str | None = None
    provider_profile_id: str | None = None


class MemoryPromoteRequest(BaseModel):
    visibility: str
    review_note: str | None = None


class MemorySearchRequest(BaseModel):
    query: str
    project_id: str | None = None
    session_id: str | None = None
    visibility: list[str] = Field(default_factory=lambda: ["session", "project", "workspace"])
    limit: int | None = None
    provider_profile_id: str | None = None


class MemoryCandidateRequest(BaseModel):
    title: str | None = None
    summary: str | None = None
    content: str | None = None
    visibility: str = "session"
    provider_profile_id: str | None = None
    metadata: dict[str, object] = Field(default_factory=dict)


class MemoryDocumentResponse(BaseModel):
    id: str
    project_id: str | None = None
    session_id: str | None = None
    source_evidence_id: str | None = None
    source_finding_id: str | None = None
    provider_profile_id: str | None = None
    title: str
    summary: str
    content: str
    source_type: str
    visibility: str
    status: str
    embedding_status: str
    secret_scan_status: str
    metadata: dict[str, object]
    created_by: str | None = None
    reviewed_by: str | None = None
    review_note: str | None = None
    reviewed_at: str | None = None
    created_at: str
    updated_at: str


class MemorySearchResult(BaseModel):
    document_id: str
    chunk_id: str
    title: str
    summary: str
    content: str
    visibility: str
    score: float
    source_type: str


class MemorySearchResponse(BaseModel):
    items: list[MemorySearchResult] = Field(default_factory=list)
