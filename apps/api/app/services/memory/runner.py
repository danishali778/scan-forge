import uuid

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.domain.exceptions import DomainError
from app.integrations.providers import EmbeddingRequest
from app.repositories.control_plane import ConfigurationRepository
from app.repositories.memory import MemoryRepository
from app.repositories.sessions import SessionRepository
from app.services.memory.chunking import chunk_text
from app.services.memory.providers import load_embedding_provider
from app.services.memory.scanner import scan_for_secrets


class MemoryEmbedDocumentRunner:
    def __init__(self, *, db: Session, worker_id: str) -> None:
        self.db = db
        self.memory = MemoryRepository(db)
        self.sessions = SessionRepository(db)
        self.configuration = ConfigurationRepository(db)
        self.worker_id = worker_id
        self.settings = get_settings()

    def run(self, *, job_id: str) -> bool:
        job = self.sessions.get_job_by_id(job_id=uuid.UUID(job_id))
        if job is None:
            return False
        if job.status == "succeeded":
            return True

        claimed = self.sessions.claim_job(job, worker_id=self.worker_id)
        if claimed is None:
            return False

        self._emit_job_event(claimed, "running")
        self.db.commit()

        try:
            self._run(claimed.id)
            return True
        except Exception as exc:
            self.db.rollback()
            self._mark_failed(job_id=claimed.id, error=str(exc))
            raise

    def _run(self, job_id: uuid.UUID) -> None:
        job = self.sessions.get_job_by_id(job_id=job_id)
        if job is None:
            raise RuntimeError("Memory embedding job was not found.")
        document_id = job.payload.get("document_id")
        if not isinstance(document_id, str):
            raise RuntimeError("Memory embedding job is missing document_id.")

        document = self.memory.get_document(
            workspace_id=job.workspace_id,
            document_id=uuid.UUID(document_id),
        )
        if document is None:
            raise RuntimeError("Memory document was not found.")
        if document.status != "approved":
            raise DomainError("Only approved memory can be embedded.")
        if document.provider_profile_id is None:
            raise DomainError("Memory embedding requires a provider profile.")

        scan = scan_for_secrets(document.content)
        if scan.status == "flagged":
            document.metadata_json = {
                **document.metadata_json,
                "secret_scan_reasons": scan.reasons,
            }
            self.memory.update_document(
                document,
                embedding_status="blocked",
                secret_scan_status="flagged",
            )
            self.sessions.fail_job(job, error="Memory content appears to contain secrets.")
            self._emit_document_event(
                document,
                "memory.embedding_failed",
                {"reason": "secret_scan"},
            )
            self._emit_job_event(job, "failed")
            self.db.commit()
            return

        provider = load_embedding_provider(
            repository=self.configuration,
            workspace_id=document.workspace_id,
            provider_profile_id=document.provider_profile_id,
            settings=self.settings,
        )
        chunks = chunk_text(document.content, settings=self.settings)
        if not chunks:
            raise DomainError("Memory document has no content to embed.")

        self.memory.delete_chunks_for_document(document_id=document.id)
        for index, chunk_content in enumerate(chunks):
            chunk = self.memory.create_chunk(
                workspace_id=document.workspace_id,
                document_id=document.id,
                chunk_index=index,
                content=chunk_content,
                metadata={"title": document.title},
            )
            response = provider.client.embed(
                EmbeddingRequest(input=chunk_content, model=provider.model)
            )
            if len(response.embedding) != self.settings.memory_embedding_dimensions:
                raise DomainError("Embedding provider returned an unexpected dimension.")
            self.memory.create_embedding(
                chunk_id=chunk.id,
                workspace_id=document.workspace_id,
                embedding_provider=response.provider_type,
                embedding_model=response.model,
                embedding_dimensions=len(response.embedding),
                embedding=response.embedding,
            )

        self.memory.update_document(
            document,
            embedding_status="embedded",
            secret_scan_status="clean",
        )
        self._emit_document_event(
            document,
            "memory.embedding_created",
            {"document_id": str(document.id), "chunk_count": len(chunks)},
        )
        self.sessions.succeed_job(
            job,
            result={"document_id": str(document.id), "chunk_count": len(chunks)},
        )
        self._emit_job_event(job, "succeeded")
        self.db.commit()

    def _mark_failed(self, *, job_id: uuid.UUID, error: str) -> None:
        job = self.sessions.get_job_by_id(job_id=job_id)
        if job is None:
            return
        self.sessions.fail_job(job, error=error)
        document_id = job.payload.get("document_id")
        if isinstance(document_id, str):
            document = self.memory.get_document(
                workspace_id=job.workspace_id,
                document_id=uuid.UUID(document_id),
            )
            if document is not None:
                self.memory.update_document(document, embedding_status="failed")
                self._emit_document_event(
                    document,
                    "memory.embedding_failed",
                    {"document_id": str(document.id), "error": error[:240]},
                )
        self._emit_job_event(job, "failed")
        self.db.commit()

    def _emit_document_event(
        self,
        document,
        event_type: str,
        payload: dict[str, object],
    ) -> None:
        if document.session_id is None:
            return
        self.sessions.create_event(
            workspace_id=document.workspace_id,
            session_id=document.session_id,
            event_type=event_type,
            payload=payload,
            actor_type="system",
            actor_id=self.worker_id,
        )

    def _emit_job_event(self, job, status: str) -> None:
        if job.session_id is None:
            return
        self.sessions.create_event(
            workspace_id=job.workspace_id,
            session_id=job.session_id,
            event_type="job.updated",
            payload={"job_id": str(job.id), "status": status, "type": job.type},
            actor_type="system",
            actor_id=self.worker_id,
        )
