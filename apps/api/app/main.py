from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.core.config import get_settings
from app.core.errors import register_exception_handlers
from app.core.middleware import request_context_middleware
from app.realtime.router import websocket_router


def create_app() -> FastAPI:
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        docs_url="/docs" if settings.enable_docs else None,
        redoc_url="/redoc" if settings.enable_docs else None,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.middleware("http")(request_context_middleware)

    app.include_router(api_router, prefix=settings.api_v1_prefix)
    app.include_router(websocket_router, prefix=settings.ws_v1_prefix)
    register_exception_handlers(app)

    @app.get("/health", tags=["health"])
    def root_health() -> dict[str, str]:
        return {
            "service": "api",
            "status": "ok",
            "environment": settings.environment,
        }

    return app


app = create_app()
