from dataclasses import dataclass
from typing import Protocol

from supabase import create_client

from app.core.config import Settings, get_settings
from app.domain.exceptions import DomainError


@dataclass(frozen=True)
class StoredObject:
    key: str
    size_bytes: int
    content_type: str | None = None


class StorageAdapter(Protocol):
    def upload_bytes(
        self,
        *,
        key: str,
        content: bytes,
        content_type: str | None = None,
    ) -> StoredObject:
        raise NotImplementedError

    def download_bytes(self, *, key: str) -> bytes:
        raise NotImplementedError


class SupabaseStorageAdapter:
    def __init__(self, settings: Settings | None = None) -> None:
        self.settings = settings or get_settings()
        if not self.settings.supabase_url:
            raise DomainError("SUPABASE_URL is required for artifact storage.")
        key = self.settings.supabase_service_role_key or self.settings.supabase_anon_key
        if not key:
            raise DomainError("Supabase service role or anon key is required for artifact storage.")
        self.bucket = self.settings.supabase_storage_bucket
        self.client = create_client(self.settings.supabase_url, key)

    def upload_bytes(
        self,
        *,
        key: str,
        content: bytes,
        content_type: str | None = None,
    ) -> StoredObject:
        bucket = self.client.storage.from_(self.bucket)
        options = {"content-type": content_type or "application/octet-stream", "upsert": "true"}
        try:
            bucket.upload(key, content, file_options=options)
        except Exception:
            self._ensure_bucket()
            try:
                bucket.upload(key, content, file_options=options)
            except Exception as exc:
                raise DomainError(f"Artifact upload failed: {exc}") from exc
        return StoredObject(key=key, size_bytes=len(content), content_type=content_type)

    def download_bytes(self, *, key: str) -> bytes:
        try:
            return self.client.storage.from_(self.bucket).download(key)
        except Exception as exc:
            raise DomainError(f"Artifact download failed: {exc}") from exc

    def _ensure_bucket(self) -> None:
        try:
            self.client.storage.create_bucket(
                self.bucket,
                options={"public": False},
            )
        except Exception:
            return


class InMemoryStorageAdapter:
    def __init__(self) -> None:
        self.objects: dict[str, bytes] = {}
        self.content_types: dict[str, str | None] = {}

    def upload_bytes(
        self,
        *,
        key: str,
        content: bytes,
        content_type: str | None = None,
    ) -> StoredObject:
        self.objects[key] = content
        self.content_types[key] = content_type
        return StoredObject(key=key, size_bytes=len(content), content_type=content_type)

    def download_bytes(self, *, key: str) -> bytes:
        try:
            return self.objects[key]
        except KeyError as exc:
            raise DomainError("Stored object was not found.") from exc
