from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "Pentagi Runtime Service"
    app_version: str = "0.1.0"
    environment: str = "local"
    enable_docs: bool = True

    runtime_workspace_root: str = "/var/lib/pentagi-runtime"
    runtime_default_image: str = "pentagi-runtime-python:local"
    runtime_container_label_prefix: str = "pentagi"
    runtime_default_timeout_seconds: int = 300
    runtime_max_output_bytes: int = 1_048_576
    runtime_file_read_max_bytes: int = 1_048_576
    runtime_file_write_max_bytes: int = 1_048_576
    runtime_network_mode: str = "none"
    runtime_allowed_commands: str = "python,python3,pwd,ls,cat,echo,find"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
