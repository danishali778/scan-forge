from pydantic import BaseModel, Field

TARGET_TYPES = {"domain", "ip", "cidr", "url", "repo", "api", "cloud_account"}


class TargetCreateRequest(BaseModel):
    type: str = Field(pattern="^(domain|ip|cidr|url|repo|api|cloud_account)$")
    value: str
    label: str | None = None
    metadata: dict[str, object] = Field(default_factory=dict)


class TargetUpdateRequest(BaseModel):
    type: str | None = Field(default=None, pattern="^(domain|ip|cidr|url|repo|api|cloud_account)$")
    value: str | None = None
    label: str | None = None
    metadata: dict[str, object] | None = None


class TargetResponse(BaseModel):
    id: str
    workspace_id: str
    project_id: str
    type: str
    value: str
    label: str | None = None
    metadata: dict[str, object]
