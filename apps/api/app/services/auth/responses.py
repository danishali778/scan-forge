from app.auth.dependencies import AuthContext
from app.models.identity import User
from app.schemas.auth import AuthResponse, AuthUserResponse, CurrentUserResponse


def build_auth_response(*, user: User, permissions: list[str]) -> AuthResponse:
    return AuthResponse(
        user=AuthUserResponse(
            id=str(user.id),
            email=user.email,
            workspace_id=str(user.workspace_id),
            role=user.role.name,
            permissions=permissions,
        )
    )


def build_current_user_response(auth_context: AuthContext | None) -> CurrentUserResponse:
    if auth_context is None:
        return CurrentUserResponse(authenticated=False)

    return CurrentUserResponse(
        authenticated=True,
        user_id=auth_context.user_id,
        email=auth_context.email,
        workspace_id=auth_context.workspace_id,
        role=auth_context.role,
        permissions=sorted(auth_context.permissions),
    )
