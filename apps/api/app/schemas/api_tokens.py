from datetime import datetime

from pydantic import BaseModel


class ApiTokenCreateRequest(BaseModel):
    name: str
    expires_at: datetime | None = None


class ApiTokenResponse(BaseModel):
    id: str
    name: str
    token_prefix: str
    status: str
    expires_at: datetime | None = None
    last_used_at: datetime | None = None
    created_at: datetime


class ApiTokenCreateResponse(ApiTokenResponse):
    token: str
