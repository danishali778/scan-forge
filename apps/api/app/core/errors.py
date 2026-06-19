from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse

from app.domain.exceptions import (
    AuthenticationError,
    ConflictError,
    CsrfError,
    DomainError,
    NotFoundError,
    NotImplementedFeatureError,
    PermissionDeniedError,
)


def _request_id(request: Request) -> str | None:
    return getattr(request.state, "request_id", None) or request.headers.get("x-request-id")


def error_response(
    request: Request,
    *,
    status_code: int,
    code: str,
    message: str,
    details: dict[str, object] | None = None,
) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "error": {
                "code": code,
                "message": message,
                "details": details or {},
                "request_id": _request_id(request),
            }
        },
    )


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(NotImplementedFeatureError)
    async def not_implemented_handler(
        request: Request,
        exc: NotImplementedFeatureError,
    ) -> JSONResponse:
        return error_response(
            request,
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            code="not_implemented",
            message=str(exc),
        )

    @app.exception_handler(AuthenticationError)
    async def authentication_handler(request: Request, exc: AuthenticationError) -> JSONResponse:
        return error_response(
            request,
            status_code=status.HTTP_401_UNAUTHORIZED,
            code="unauthenticated",
            message=str(exc),
        )

    @app.exception_handler(CsrfError)
    async def csrf_handler(request: Request, exc: CsrfError) -> JSONResponse:
        return error_response(
            request,
            status_code=status.HTTP_403_FORBIDDEN,
            code="csrf_failed",
            message=str(exc),
        )

    @app.exception_handler(PermissionDeniedError)
    async def permission_handler(request: Request, exc: PermissionDeniedError) -> JSONResponse:
        return error_response(
            request,
            status_code=status.HTTP_403_FORBIDDEN,
            code="permission_denied",
            message=str(exc),
        )

    @app.exception_handler(NotFoundError)
    async def not_found_handler(request: Request, exc: NotFoundError) -> JSONResponse:
        return error_response(
            request,
            status_code=status.HTTP_404_NOT_FOUND,
            code="not_found",
            message=str(exc),
        )

    @app.exception_handler(ConflictError)
    async def conflict_handler(request: Request, exc: ConflictError) -> JSONResponse:
        return error_response(
            request,
            status_code=status.HTTP_409_CONFLICT,
            code="conflict",
            message=str(exc),
        )

    @app.exception_handler(DomainError)
    async def domain_handler(request: Request, exc: DomainError) -> JSONResponse:
        return error_response(
            request,
            status_code=status.HTTP_400_BAD_REQUEST,
            code="domain_error",
            message=str(exc),
        )
