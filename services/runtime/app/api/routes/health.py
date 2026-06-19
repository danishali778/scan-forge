from fastapi import APIRouter

from app.core.config import get_settings
from app.services.docker_runtime import get_runtime_manager

router = APIRouter()


@router.get("/health")
def health() -> dict[str, object]:
    settings = get_settings()
    docker_available = False
    active_runtimes = 0
    try:
        manager = get_runtime_manager()
        docker_available = manager.docker_available()
        active_runtimes = manager.active_runtime_count()
    except Exception:
        docker_available = False
    return {
        "service": "runtime",
        "status": "ok" if docker_available else "degraded",
        "environment": settings.environment,
        "docker_available": docker_available,
        "active_runtimes": active_runtimes,
    }
