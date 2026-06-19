import hashlib
import re
import uuid

from app.core.config import Settings
from app.integrations.storage import StorageAdapter
from app.models.review import FileAsset
from app.repositories.review import ReviewRepository


class ArtifactWriter:
    def __init__(
        self,
        *,
        repository: ReviewRepository,
        storage: StorageAdapter,
        settings: Settings,
    ) -> None:
        self.repository = repository
        self.storage = storage
        self.settings = settings

    def store_bytes(
        self,
        *,
        workspace_id: uuid.UUID,
        prefix: str,
        filename: str,
        content: bytes,
        mime_type: str | None,
        metadata: dict[str, object] | None = None,
        created_by: uuid.UUID | None = None,
    ) -> FileAsset:
        safe_filename = _safe_filename(filename)
        storage_key = f"{workspace_id}/{prefix.strip('/')}/{uuid.uuid4()}-{safe_filename}"
        stored = self.storage.upload_bytes(
            key=storage_key,
            content=content,
            content_type=mime_type,
        )
        return self.repository.create_file_asset(
            workspace_id=workspace_id,
            storage_backend=self.settings.artifact_storage_backend,
            storage_key=stored.key,
            filename=safe_filename,
            mime_type=mime_type,
            size_bytes=stored.size_bytes,
            sha256=hashlib.sha256(content).hexdigest(),
            metadata=metadata or {},
            created_by=created_by,
        )


def _safe_filename(value: str) -> str:
    cleaned = re.sub(r"[^A-Za-z0-9._-]+", "-", value.strip()).strip("-")
    return cleaned or "artifact.bin"
