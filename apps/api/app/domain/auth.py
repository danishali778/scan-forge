from dataclasses import dataclass
from datetime import datetime

from app.schemas.auth import AuthResponse


@dataclass(frozen=True)
class AuthCookies:
    session_token: str
    csrf_token: str
    expires_at: datetime


@dataclass(frozen=True)
class AuthLoginResult:
    response: AuthResponse
    cookies: AuthCookies

