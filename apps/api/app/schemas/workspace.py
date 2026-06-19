from pydantic import BaseModel, EmailStr, Field


class WorkspaceResponse(BaseModel):
    id: str
    name: str
    slug: str
    settings: dict[str, object]


class WorkspaceUpdateRequest(BaseModel):
    name: str | None = None
    settings: dict[str, object] | None = None


class RoleResponse(BaseModel):
    id: str
    name: str
    description: str | None = None
    permissions: list[str]


class UserCreateRequest(BaseModel):
    email: EmailStr
    name: str | None = None
    role_id: str


class UserUpdateRequest(BaseModel):
    name: str | None = None
    role_id: str | None = None
    status: str | None = Field(default=None, pattern="^(active|invited|blocked)$")


class UserResponse(BaseModel):
    id: str
    email: EmailStr
    name: str | None = None
    status: str
    role_id: str
    role: str
    supabase_linked: bool
