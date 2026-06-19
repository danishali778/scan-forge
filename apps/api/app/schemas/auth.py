from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshResponse(BaseModel):
    status: str = "ok"


class LogoutResponse(BaseModel):
    status: str = "ok"


class AuthUserResponse(BaseModel):
    id: str
    email: EmailStr
    workspace_id: str
    role: str
    permissions: list[str]


class AuthResponse(BaseModel):
    user: AuthUserResponse


class CurrentUserResponse(BaseModel):
    authenticated: bool
    user_id: str | None = None
    email: EmailStr | None = None
    workspace_id: str | None = None
    role: str | None = None
    permissions: list[str] = []
