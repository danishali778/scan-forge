from pydantic import BaseModel, Field


class PolicyCreateRequest(BaseModel):
    name: str
    description: str | None = None
    rules: dict[str, object] = Field(default_factory=dict)


class PolicyUpdateRequest(BaseModel):
    name: str | None = None
    description: str | None = None
    rules: dict[str, object] | None = None
    status: str | None = Field(default=None, pattern="^(active|disabled)$")


class PolicyResponse(BaseModel):
    id: str
    name: str
    description: str | None = None
    rules: dict[str, object]
    status: str
