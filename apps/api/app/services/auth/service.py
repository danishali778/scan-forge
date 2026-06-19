import uuid

from sqlalchemy.orm import Session

from app.auth.dependencies import AuthContext
from app.core.config import Settings
from app.domain.auth import AuthCookies, AuthLoginResult
from app.integrations.supabase.auth import SupabaseAuthAdapter
from app.repositories.auth import AuthRepository
from app.repositories.control_plane import AuditRepository
from app.schemas.auth import CurrentUserResponse, LoginRequest, LogoutResponse, RefreshResponse
from app.services.auth.bootstrap import AuthBootstrapper
from app.services.auth.responses import build_auth_response, build_current_user_response
from app.services.auth.sessions import AuthSessionManager


class AuthService:
    """Backend-mediated auth orchestration boundary."""

    def __init__(
        self,
        *,
        db: Session,
        repository: AuthRepository,
        audit_repository: AuditRepository,
        supabase_auth: SupabaseAuthAdapter,
        settings: Settings,
    ) -> None:
        self.db = db
        self.repository = repository
        self.audit_repository = audit_repository
        self.supabase_auth = supabase_auth
        self.bootstrapper = AuthBootstrapper(repository)
        self.sessions = AuthSessionManager(repository=repository, settings=settings)

    def login(self, request: LoginRequest, *, user_agent: str | None = None) -> AuthLoginResult:
        auth_result = self.supabase_auth.sign_in_with_password(
            email=str(request.email),
            password=request.password,
        )
        user = self.bootstrapper.resolve_user(auth_result)
        permissions = self.repository.list_permissions(user.role_id)
        cookies = self.sessions.issue_for_login(
            user=user,
            auth_result=auth_result,
            user_agent=user_agent,
        )
        self.audit_repository.create_event(
            workspace_id=user.workspace_id,
            actor_type="user_session",
            actor_id=str(user.id),
            action="auth.login",
            resource_type="user",
            resource_id=str(user.id),
            metadata={"email": user.email},
            user_agent=user_agent,
        )
        self.db.commit()

        return AuthLoginResult(
            response=build_auth_response(user=user, permissions=permissions),
            cookies=cookies,
        )

    def logout(
        self,
        *,
        session_token: str | None = None,
        auth_context: AuthContext | None = None,
    ) -> LogoutResponse:
        if session_token and self.sessions.revoke_by_token(session_token):
            if auth_context is not None:
                self.audit_repository.create_event(
                    workspace_id=uuid.UUID(auth_context.workspace_id),
                    actor_type=auth_context.actor_type,
                    actor_id=auth_context.user_id,
                    action="auth.logout",
                    resource_type="auth_session",
                    resource_id=auth_context.auth_session_id or auth_context.user_id,
                )
            self.db.commit()
        return LogoutResponse()

    def refresh(self, *, session_token: str | None) -> tuple[RefreshResponse, AuthCookies]:
        cookies = self.sessions.refresh(
            session_token=session_token,
            supabase_auth=self.supabase_auth,
        )
        self.db.commit()
        return RefreshResponse(), cookies

    def current_user(self, auth_context: AuthContext | None = None) -> CurrentUserResponse:
        return build_current_user_response(auth_context)
