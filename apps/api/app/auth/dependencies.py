from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Annotated

from fastapi import Depends, Request
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.core.security import constant_time_equal, hash_token
from app.db.session import get_db_session
from app.domain.exceptions import AuthenticationError, CsrfError, PermissionDeniedError
from app.models.identity import User
from app.repositories.auth import AuthRepository


@dataclass(frozen=True)
class AuthContext:
    user_id: str
    email: str
    workspace_id: str
    role_id: str
    role: str
    actor_type: str
    auth_session_id: str | None
    api_token_id: str | None
    csrf_hash: str | None
    permissions: frozenset[str]


def _is_expired(value: datetime) -> bool:
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value < datetime.now(UTC)


def build_auth_context_from_session_token(db: Session, session_token: str | None) -> AuthContext:
    if not session_token:
        raise AuthenticationError("Missing application session.")

    repository = AuthRepository(db)
    auth_session = repository.get_active_session_by_hash(hash_token(session_token))
    if auth_session is None or _is_expired(auth_session.expires_at):
        raise AuthenticationError("Application session is not active.")

    user = db.get(User, auth_session.user_id)
    if user is None or user.status != "active" or user.deleted_at is not None:
        raise AuthenticationError("Application user is not active.")

    permissions = repository.list_permissions(user.role_id)
    return AuthContext(
        user_id=str(user.id),
        email=user.email,
        workspace_id=str(user.workspace_id),
        role_id=str(user.role_id),
        role=user.role.name,
        actor_type="user_session",
        auth_session_id=str(auth_session.id),
        api_token_id=None,
        csrf_hash=auth_session.csrf_hash,
        permissions=frozenset(permissions),
    )


def build_auth_context_from_api_token(db: Session, bearer_token: str | None) -> AuthContext:
    if not bearer_token:
        raise AuthenticationError("Missing API token.")

    repository = AuthRepository(db)
    api_token = repository.get_active_api_token_by_hash(hash_token(bearer_token))
    if api_token is None:
        raise AuthenticationError("API token is not active.")
    if api_token.expires_at is not None and _is_expired(api_token.expires_at):
        raise AuthenticationError("API token is expired.")

    user = db.get(User, api_token.user_id)
    if user is None or user.status != "active" or user.deleted_at is not None:
        raise AuthenticationError("API token user is not active.")

    repository.mark_api_token_used(api_token)
    db.commit()
    permissions = repository.list_permissions(user.role_id)
    return AuthContext(
        user_id=str(user.id),
        email=user.email,
        workspace_id=str(user.workspace_id),
        role_id=str(user.role_id),
        role=user.role.name,
        actor_type="api_token",
        auth_session_id=None,
        api_token_id=str(api_token.id),
        csrf_hash=None,
        permissions=frozenset(permissions),
    )


def _bearer_token(request: Request) -> str | None:
    authorization = request.headers.get("authorization")
    if not authorization:
        return None
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise AuthenticationError("Authorization header must use Bearer token.")
    return token


def get_optional_auth_context(
    request: Request,
    db: Annotated[Session, Depends(get_db_session)],
) -> AuthContext | None:
    bearer_token = _bearer_token(request)
    if bearer_token:
        return build_auth_context_from_api_token(db, bearer_token)
    session_cookie = request.cookies.get(get_settings().session_cookie_name)
    if not session_cookie:
        return None
    return build_auth_context_from_session_token(db, session_cookie)


def get_auth_context(
    request: Request,
    db: Annotated[Session, Depends(get_db_session)],
) -> AuthContext:
    bearer_token = _bearer_token(request)
    if bearer_token:
        return build_auth_context_from_api_token(db, bearer_token)
    session_cookie = request.cookies.get(get_settings().session_cookie_name)
    return build_auth_context_from_session_token(db, session_cookie)


def require_csrf(request: Request, auth: Annotated[AuthContext, Depends(get_auth_context)]) -> None:
    if auth.actor_type == "api_token":
        return
    settings = get_settings()
    csrf_cookie = request.cookies.get(settings.csrf_cookie_name)
    csrf_header = request.headers.get(settings.csrf_header_name)
    if not csrf_cookie or not csrf_header:
        raise CsrfError("CSRF token is required.")
    if not constant_time_equal(csrf_cookie, csrf_header):
        raise CsrfError("CSRF token is invalid.")
    if not constant_time_equal(hash_token(csrf_header), auth.csrf_hash):
        raise CsrfError("CSRF token is not bound to the active session.")


def require_permission(permission: str):
    def dependency(auth: Annotated[AuthContext, Depends(get_auth_context)]) -> None:
        if permission not in auth.permissions:
            raise PermissionDeniedError(f"Missing required permission: {permission}.")

    return dependency


AuthContextDep = Annotated[AuthContext, Depends(get_auth_context)]
OptionalAuthContextDep = Annotated[AuthContext | None, Depends(get_optional_auth_context)]
CsrfDep = Annotated[None, Depends(require_csrf)]
