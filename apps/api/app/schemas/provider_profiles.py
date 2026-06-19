from pydantic import BaseModel, Field


class ProviderProfileCreateRequest(BaseModel):
    name: str
    provider_type: str
    base_url: str | None = None
    api_key: str | None = None
    agent_models: dict[str, object] = Field(default_factory=dict)
    options: dict[str, object] = Field(default_factory=dict)
    budgets: dict[str, object] = Field(default_factory=dict)


class ProviderProfileUpdateRequest(BaseModel):
    name: str | None = None
    provider_type: str | None = None
    base_url: str | None = None
    api_key: str | None = None
    agent_models: dict[str, object] | None = None
    options: dict[str, object] | None = None
    budgets: dict[str, object] | None = None
    status: str | None = Field(default=None, pattern="^(active|disabled)$")


class ProviderProfileResponse(BaseModel):
    id: str
    name: str
    provider_type: str
    base_url: str | None = None
    agent_models: dict[str, object]
    options: dict[str, object]
    budgets: dict[str, object]
    status: str
    has_credential: bool
