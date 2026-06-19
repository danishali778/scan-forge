from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "ScopeForge API"
    app_version: str = "0.1.0"
    environment: str = "local"
    enable_docs: bool = True

    api_v1_prefix: str = "/api/v1"
    ws_v1_prefix: str = "/ws/v1"
    cors_origins_raw: str = Field(
        default="http://localhost:5173",
        validation_alias="CORS_ORIGINS",
    )

    supabase_url: str | None = None
    supabase_anon_key: str | None = None
    supabase_service_role_key: str | None = None

    database_url: str | None = None
    redis_url: str = "redis://redis:6379/0"
    celery_broker_url: str = "redis://redis:6379/0"
    runtime_service_url: str = "http://runtime:8001"
    job_stale_seconds: int = 900
    agent_max_turns_per_job: int = 3
    artifact_storage_backend: str = "supabase"
    supabase_storage_bucket: str = "scopeforge-artifacts"
    evidence_inline_max_bytes: int = 32_768
    report_export_storage_prefix: str = "reports"
    memory_embedding_dimensions: int = 1536
    memory_chunk_max_chars: int = 2000
    memory_chunk_overlap_chars: int = 200
    memory_search_default_limit: int = 5
    memory_search_max_limit: int = 20
    replay_max_events: int = 5000
    replay_payload_max_bytes: int = 32_768
    analytics_default_window_days: int = 30
    analytics_max_window_days: int = 365
    runtime_default_timeout_seconds: int = 300
    runtime_max_output_bytes: int = 1_048_576
    runtime_allowed_commands_raw: str = Field(
        default="python,python3,pwd,ls,cat,echo,find",
        validation_alias="RUNTIME_ALLOWED_COMMANDS",
    )

    session_cookie_name: str = "app_session"
    csrf_cookie_name: str = "app_csrf"
    csrf_header_name: str = "X-CSRF-Token"
    auth_encryption_key: str | None = None
    session_ttl_seconds: int = 60 * 60 * 8
    refresh_session_ttl_seconds: int = 60 * 60 * 24 * 30
    cookie_secure: bool = False
    cookie_samesite: str = "lax"
    request_id_header_name: str = "X-Request-ID"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origins(self) -> list[str]:
        return [
            origin.strip()
            for origin in self.cors_origins_raw.split(",")
            if origin.strip()
        ]

    @property
    def runtime_allowed_commands(self) -> set[str]:
        return {
            command.strip()
            for command in self.runtime_allowed_commands_raw.split(",")
            if command.strip()
        }


@lru_cache
def get_settings() -> Settings:
    return Settings()
