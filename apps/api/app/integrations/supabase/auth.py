from dataclasses import dataclass
from uuid import UUID

import httpx

from app.core.config import get_settings
from app.domain.exceptions import AuthenticationError


@dataclass(frozen=True)
class SupabaseAuthResult:
    supabase_user_id: UUID
    email: str
    access_token: str | None
    refresh_token: str | None
    expires_in: int | None = None
    supabase_session_id: str | None = None


class SupabaseAuthAdapter:
    """Backend-owned adapter for Supabase Auth calls."""

    def __init__(self, base_url: str | None = None, api_key: str | None = None) -> None:
        settings = get_settings()
        self.base_url = (base_url or settings.supabase_url or "").rstrip("/")
        self.api_key = api_key or settings.supabase_anon_key or settings.supabase_service_role_key

    def sign_in_with_password(self, *, email: str, password: str) -> SupabaseAuthResult:
        self._require_config()
        response = httpx.post(
            f"{self.base_url}/auth/v1/token?grant_type=password",
            headers=self._headers(),
            json={"email": email, "password": password},
            timeout=15,
        )
        if response.status_code >= 400:
            raise AuthenticationError("Invalid email or password.")
        return self._parse_auth_response(response.json())

    def refresh_session(self, *, refresh_token: str) -> SupabaseAuthResult:
        self._require_config()
        response = httpx.post(
            f"{self.base_url}/auth/v1/token?grant_type=refresh_token",
            headers=self._headers(),
            json={"refresh_token": refresh_token},
            timeout=15,
        )
        if response.status_code >= 400:
            raise AuthenticationError("Supabase session refresh failed.")
        return self._parse_auth_response(response.json())

    def sign_out(self, *, access_token: str | None = None) -> None:
        if not access_token:
            return
        self._require_config()
        httpx.post(
            f"{self.base_url}/auth/v1/logout",
            headers=self._headers(access_token=access_token),
            timeout=15,
        )

    def _headers(self, *, access_token: str | None = None) -> dict[str, str]:
        headers = {"apikey": self.api_key or "", "Content-Type": "application/json"}
        if access_token:
            headers["Authorization"] = f"Bearer {access_token}"
        return headers

    def _require_config(self) -> None:
        if not self.base_url or not self.api_key:
            raise AuthenticationError("Supabase Auth is not configured.")

    def _parse_auth_response(self, payload: dict[str, object]) -> SupabaseAuthResult:
        user = payload.get("user")
        if not isinstance(user, dict):
            raise AuthenticationError("Supabase Auth response did not include a user.")

        user_id = user.get("id")
        email = user.get("email")
        if not isinstance(user_id, str) or not isinstance(email, str):
            raise AuthenticationError("Supabase Auth response is missing user identity.")

        access_token = payload.get("access_token")
        refresh_token = payload.get("refresh_token")
        expires_in = payload.get("expires_in")
        session_id = payload.get("session_id")

        return SupabaseAuthResult(
            supabase_user_id=UUID(user_id),
            email=email,
            access_token=access_token if isinstance(access_token, str) else None,
            refresh_token=refresh_token if isinstance(refresh_token, str) else None,
            expires_in=expires_in if isinstance(expires_in, int) else None,
            supabase_session_id=session_id if isinstance(session_id, str) else None,
        )
