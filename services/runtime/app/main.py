from fastapi import FastAPI

from app.api.router import api_router
from app.core.config import get_settings


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        docs_url="/docs" if settings.enable_docs else None,
        redoc_url="/redoc" if settings.enable_docs else None,
    )
    app.include_router(api_router, prefix="/internal/runtime")

    @app.get("/health", tags=["health"])
    def root_health() -> dict[str, str]:
        return {
            "service": "runtime",
            "status": "ok",
            "environment": settings.environment,
        }

    return app


app = create_app()

