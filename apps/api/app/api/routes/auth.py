from fastapi import APIRouter, Request, Response

from app.api.dependencies import AuthServiceDep
from app.auth.dependencies import AuthContextDep, CsrfDep, OptionalAuthContextDep
from app.core.config import get_settings
from app.schemas.auth import (
    AuthResponse,
    CurrentUserResponse,
    LoginRequest,
    LogoutResponse,
    RefreshResponse,
)

router = APIRouter()


def _set_auth_cookies(response: Response, *, session_token: str, csrf_token: str) -> None:
    settings = get_settings()
    response.set_cookie(
        settings.session_cookie_name,
        session_token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        path="/",
        max_age=settings.session_ttl_seconds,
    )
    response.set_cookie(
        settings.csrf_cookie_name,
        csrf_token,
        httponly=False,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        path="/",
        max_age=settings.session_ttl_seconds,
    )


def _clear_auth_cookies(response: Response) -> None:
    settings = get_settings()
    response.delete_cookie(settings.session_cookie_name, path="/")
    response.delete_cookie(settings.csrf_cookie_name, path="/")


@router.post("/login", response_model=AuthResponse)
def login(
    request: LoginRequest,
    fastapi_request: Request,
    response: Response,
    service: AuthServiceDep,
) -> AuthResponse:
    result = service.login(request, user_agent=fastapi_request.headers.get("user-agent"))
    _set_auth_cookies(
        response,
        session_token=result.cookies.session_token,
        csrf_token=result.cookies.csrf_token,
    )
    return result.response


@router.post("/refresh", response_model=RefreshResponse)
def refresh(
    fastapi_request: Request,
    response: Response,
    service: AuthServiceDep,
    _: CsrfDep,
) -> RefreshResponse:
    settings = get_settings()
    result, cookies = service.refresh(
        session_token=fastapi_request.cookies.get(settings.session_cookie_name)
    )
    _set_auth_cookies(
        response,
        session_token=cookies.session_token,
        csrf_token=cookies.csrf_token,
    )
    return result


@router.post("/logout", response_model=LogoutResponse)
def logout(
    fastapi_request: Request,
    response: Response,
    service: AuthServiceDep,
    auth: AuthContextDep,
    _: CsrfDep,
) -> LogoutResponse:
    settings = get_settings()
    result = service.logout(
        session_token=fastapi_request.cookies.get(settings.session_cookie_name),
        auth_context=auth,
    )
    _clear_auth_cookies(response)
    return result


@router.get("/me", response_model=CurrentUserResponse)
def me(service: AuthServiceDep, auth: OptionalAuthContextDep) -> CurrentUserResponse:
    return service.current_user(auth)
