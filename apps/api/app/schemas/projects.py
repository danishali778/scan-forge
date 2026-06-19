from pydantic import BaseModel, Field


class ProjectCreateRequest(BaseModel):
    name: str
    description: str | None = None
    metadata: dict[str, object] = Field(default_factory=dict)


class ProjectResponse(BaseModel):
    id: str
    name: str
    description: str | None = None
    status: str
    created_by: str | None = None
    metadata: dict[str, object]


class ScopeCreateRequest(BaseModel):
    name: str
    description: str | None = None
    rules: dict[str, object] = Field(default_factory=dict)


class ScopeResponse(BaseModel):
    id: str
    project_id: str
    name: str
    description: str | None = None
    rules: dict[str, object]
