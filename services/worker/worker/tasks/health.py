from worker.celery_app import celery_app
from worker.config import get_settings


@celery_app.task(name="worker.health")
def health_check() -> dict[str, str]:
    settings = get_settings()
    return {
        "service": "worker",
        "status": "ok",
        "environment": settings.environment,
    }

