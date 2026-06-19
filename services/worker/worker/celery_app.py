from celery import Celery

from worker.config import get_settings

settings = get_settings()

celery_app = Celery(
    "scopeforge_worker",
    broker=settings.celery_broker_url,
    include=[
        "worker.tasks.health",
        "worker.tasks.agents",
        "worker.tasks.sessions",
        "worker.tasks.tools",
        "worker.tasks.review",
        "worker.tasks.memory",
    ],
)

celery_app.conf.update(
    task_ignore_result=True,
    result_backend=None,
    task_track_started=True,
    worker_send_task_events=True,
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)
