from datetime import UTC, datetime, timedelta

from app.core.config import Settings
from app.core.security import TokenCipher, generate_token, hash_token
from app.domain.auth import AuthCookies
from app.domain.exceptions import AuthenticationError
from app.integrations.supabase.auth import SupabaseAuthAdapter, SupabaseAuthResult
from app.models.identity import User
from app.repositories.auth import AuthRepository
from app.services.auth.tokens import is_expired


class AuthSessionManager:
    """Own application session token, CSRF token, and refresh-token rotation logic."""

    def __init__(self, *, repository: AuthRepository, settings: Settings) -> None:
        self.repository = repository
        self.settings = settings

    def issue_for_login(
        self,
        *,
        user: User,
        auth_result: SupabaseAuthResult,
        user_agent: str | None,
    ) -> AuthCookies:
        session_token = generate_token()
        csrf_token = generate_token()
        expires_at = self._expires_at()

        self.repository.create_auth_session(
            workspace_id=user.workspace_id,
            user_id=user.id,
            session_hash=hash_token(session_token),
            csrf_hash=hash_token(csrf_token),
            encrypted_refresh_token=self._cipher().encrypt(auth_result.refresh_token),
            supabase_session_id=auth_result.supabase_session_id,
            expires_at=expires_at,
            user_agent=user_agent,
        )

        return AuthCookies(
            session_token=session_token,
            csrf_token=csrf_token,
            expires_at=expires_at,
        )

    def revoke_by_token(self, session_token: str) -> bool:
        auth_session = self.repository.get_active_session_by_hash(hash_token(session_token))
        if auth_session is None:
            return False

        self.repository.revoke_session(auth_session)
        return True

    def refresh(
        self,
        *,
        session_token: str | None,
        supabase_auth: SupabaseAuthAdapter,
    ) -> AuthCookies:
        if not session_token:
            raise AuthenticationError("Missing application session.")

        auth_session = self.repository.get_active_session_by_hash(hash_token(session_token))
        if auth_session is None or is_expired(auth_session.expires_at):
            raise AuthenticationError("Application session is not active.")

        cipher = self._cipher()
        refresh_token = cipher.decrypt(auth_session.encrypted_refresh_token)
        if not refresh_token:
            raise AuthenticationError("No refresh token is available for this session.")

        auth_result = supabase_auth.refresh_session(refresh_token=refresh_token)
        new_session_token = generate_token()
        new_csrf_token = generate_token()
        expires_at = self._expires_at()

        auth_session.session_hash = hash_token(new_session_token)
        auth_session.csrf_hash = hash_token(new_csrf_token)
        self.repository.update_session_refresh_token(
            auth_session,
            encrypted_refresh_token=cipher.encrypt(auth_result.refresh_token or refresh_token),
            expires_at=expires_at,
        )

        return AuthCookies(
            session_token=new_session_token,
            csrf_token=new_csrf_token,
            expires_at=expires_at,
        )

    def _cipher(self) -> TokenCipher:
        return TokenCipher(self.settings.auth_encryption_key)

    def _expires_at(self) -> datetime:
        return datetime.now(UTC) + timedelta(seconds=self.settings.session_ttl_seconds)
