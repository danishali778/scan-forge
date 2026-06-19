from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    environment: str = "local"
    celery_broker_url: str = "redis://redis:6379/0"
    redis_url: str = "redis://redis:6379/0"
    database_url: str | None = None
    runtime_service_url: str = "http://runtime:8001"
    job_stale_seconds: int = 900

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
