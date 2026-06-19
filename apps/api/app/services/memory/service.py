import uuid

from sqlalchemy.orm import Session

from app.auth.dependencies import AuthContext
from app.core.config import Settings
from app.domain.exceptions import ConflictError, DomainError, NotFoundError
from app.domain.ids import parse_uuid
from app.domain.pagination import Page
from app.integrations.providers import EmbeddingRequest
from app.integrations.queue import QueueClient
from app.models.memory import MemoryDocument
from app.repositories.control_plane import AuditRepository, ConfigurationRepository
from app.repositories.memory import MemoryRepository
from app.repositories.projects import ProjectRepository
from app.repositories.review import ReviewRepository
from app.repositories.sessions import SessionRepository
from app.schemas.memory import (
    MemoryCandidateRequest,
    MemoryCreateRequest,
    MemoryDocumentResponse,
    MemoryPromoteRequest,
    MemoryReviewRequest,
    MemorySearchRequest,
    MemorySearchResponse,
    MemorySearchResult,
    MemoryUpdateRequest,
)
from app.schemas.sessions import JobResponse
from app.services.audit import AuditRecorder
from app.services.memory.providers import load_embedding_provider
from app.services.memory.scanner import scan_for_secrets
from app.services.sessions.mappers import job_response

VISIBILITIES = {"session", "project", "workspace"}
SOURCE_TYPES = {"manual", "agent", "evidence", "finding", "report"}


class MemoryService:
    def __init__(
        self,
        *,
        db: Session,
        memory_repository: MemoryRepository,
        session_repository: SessionRepository,
        project_repository: ProjectRepository,
        review_repository: ReviewRepository,
        configuration_repository: ConfigurationRepository,
        audit_repository: AuditRepository,
        queue_client: QueueClient,
        settings: Settings,
    ) -> None:
        self.db = db
        self.memory = memory_repository
        self.sessions = session_repository
        self.projects = project_repository
        self.review = review_repository
        self.configuration = configuration_repository
        self.audit = AuditRecorder(audit_repository)
        self.queue = queue_client
        self.settings = settings

    def list_documents(
        self,
        *,
        auth: AuthContext,
        status: str | None = None,
        visibility: str | None = None,
    ) -> Page[MemoryDocumentResponse]:
        documents = self.memory.list_documents(
            workspace_id=uuid.UUID(auth.workspace_id),
            status=status,
            visibility=visibility,
        )
        return Page(items=[memory_document_response(document) for document in documents])

    def create_document(
        self,
        request: MemoryCreateRequest,
        *,
        auth: AuthContext,
    ) -> MemoryDocumentResponse:
        workspace_id = uuid.UUID(auth.workspace_id)
        self._validate_visibility(request.visibility)
        self._validate_source_type(request.source_type)
        project_id, session_id = self._resolve_project_session(
            workspace_id=workspace_id,
            project_id=request.project_id,
            session_id=request.session_id,
        )
        scan = scan_for_secrets(request.content)
        document = self.memory.create_document(
            workspace_id=workspace_id,
            project_id=project_id,
            session_id=session_id,
            provider_profile_id=_optional_uuid(request.provider_profile_id, "provider_profile_id"),
            title=request.title,
            summary=request.summary,
            content=request.content,
            source_type=request.source_type,
            visibility=request.visibility,
            metadata={
                **request.metadata,
                "secret_scan_reasons": scan.reasons,
            },
            created_by=uuid.UUID(auth.user_id),
            embedding_status="blocked" if scan.status == "flagged" else "pending",
            secret_scan_status=scan.status,
        )
        self._emit(
            document=document,
            event_type="memory.document_created",
            payload={"document_id": str(document.id), "status": document.status},
            auth=auth,
        )
        self.audit.record(
            auth=auth,
            action="memory.document_created",
            resource_type="memory_document",
            resource_id=str(document.id),
            after=self._audit_payload(document),
        )
        self.db.commit()
        return memory_document_response(document)

    def create_from_evidence(
        self,
        *,
        evidence_id: str,
        request: MemoryCandidateRequest,
        auth: AuthContext,
    ) -> MemoryDocumentResponse:
        workspace_id = uuid.UUID(auth.workspace_id)
        evidence = self.review.get_evidence(
            workspace_id=workspace_id,
            evidence_id=parse_uuid(evidence_id, field_name="evidence_id"),
        )
        if evidence is None:
            raise NotFoundError("Evidence was not found.")
        content = request.content or evidence.content or evidence.summary
        create_request = MemoryCreateRequest(
            title=request.title or evidence.title,
            summary=request.summary or evidence.summary,
            content=content,
            visibility=request.visibility,
            project_id=str(evidence.project_id),
            session_id=str(evidence.session_id),
            source_type="evidence",
            metadata=request.metadata,
            provider_profile_id=request.provider_profile_id,
        )
        response = self.create_document(create_request, auth=auth)
        document = self._get_document(document_id=response.id, auth=auth)
        document.source_evidence_id = evidence.id
        self.db.add(document)
        self.db.commit()
        return memory_document_response(document)

    def create_from_finding(
        self,
        *,
        finding_id: str,
        request: MemoryCandidateRequest,
        auth: AuthContext,
    ) -> MemoryDocumentResponse:
        workspace_id = uuid.UUID(auth.workspace_id)
        finding = self.review.get_finding(
            workspace_id=workspace_id,
            finding_id=parse_uuid(finding_id, field_name="finding_id"),
        )
        if finding is None:
            raise NotFoundError("Finding was not found.")
        content = request.content or "\n\n".join(
            [
                finding.description,
                finding.impact,
                finding.reproduction_steps,
                finding.remediation,
            ]
        )
        create_request = MemoryCreateRequest(
            title=request.title or finding.title,
            summary=request.summary or finding.impact[:240],
            content=content,
            visibility=request.visibility,
            project_id=str(finding.project_id),
            session_id=str(finding.session_id),
            source_type="finding",
            metadata=request.metadata,
            provider_profile_id=request.provider_profile_id,
        )
        response = self.create_document(create_request, auth=auth)
        document = self._get_document(document_id=response.id, auth=auth)
        document.source_finding_id = finding.id
        self.db.add(document)
        self.db.commit()
        return memory_document_response(document)

    def get_document(self, *, document_id: str, auth: AuthContext) -> MemoryDocumentResponse:
        return memory_document_response(self._get_document(document_id=document_id, auth=auth))

    def update_document(
        self,
        *,
        document_id: str,
        request: MemoryUpdateRequest,
        auth: AuthContext,
    ) -> MemoryDocumentResponse:
        document = self._get_document(document_id=document_id, auth=auth)
        if request.visibility is not None:
            self._validate_visibility(request.visibility)
        metadata = request.metadata
        embedding_status = None
        secret_scan_status = None
        if request.content is not None:
            scan = scan_for_secrets(request.content)
            metadata = {
                **document.metadata_json,
                **(metadata or {}),
                "secret_scan_reasons": scan.reasons,
            }
            embedding_status = "blocked" if scan.status == "flagged" else "pending"
            secret_scan_status = scan.status
            self.memory.delete_chunks_for_document(document_id=document.id)
        document = self.memory.update_document(
            document,
            title=request.title,
            summary=request.summary,
            content=request.content,
            visibility=request.visibility,
            metadata=metadata,
            provider_profile_id=_optional_uuid(request.provider_profile_id, "provider_profile_id")
            if request.provider_profile_id
            else None,
            embedding_status=embedding_status,
            secret_scan_status=secret_scan_status,
        )
        self._emit(
            document=document,
            event_type="memory.document_updated",
            payload={"document_id": str(document.id)},
            auth=auth,
        )
        self.audit.record(
            auth=auth,
            action="memory.document_updated",
            resource_type="memory_document",
            resource_id=str(document.id),
            after=self._audit_payload(document),
        )
        self.db.commit()
        return memory_document_response(document)

    def delete_document(self, *, document_id: str, auth: AuthContext) -> MemoryDocumentResponse:
        document = self.memory.delete_document(
            self._get_document(document_id=document_id, auth=auth)
        )
        self._emit(
            document=document,
            event_type="memory.document_deleted",
            payload={"document_id": str(document.id)},
            auth=auth,
        )
        self.audit.record(
            auth=auth,
            action="memory.document_deleted",
            resource_type="memory_document",
            resource_id=str(document.id),
            after={"deleted": True},
        )
        self.db.commit()
        return memory_document_response(document)

    def approve_document(
        self,
        *,
        document_id: str,
        request: MemoryReviewRequest,
        auth: AuthContext,
    ) -> JobResponse:
        document = self._get_document(document_id=document_id, auth=auth)
        provider_profile_id = (
            _optional_uuid(request.provider_profile_id, "provider_profile_id")
            if request.provider_profile_id
            else document.provider_profile_id
        )
        scan = scan_for_secrets(document.content)
        if scan.status == "flagged":
            self.memory.review_document(
                document,
                status="candidate",
                reviewed_by=uuid.UUID(auth.user_id),
                review_note=request.review_note,
                embedding_status="blocked",
                secret_scan_status="flagged",
            )
            document.metadata_json = {**document.metadata_json, "secret_scan_reasons": scan.reasons}
            self.db.add(document)
            self.db.commit()
            raise ConflictError("Memory content appears to contain secrets and cannot be approved.")
        if provider_profile_id is None:
            raise DomainError("Approving memory requires an embedding provider profile.")
        document.provider_profile_id = provider_profile_id
        self.memory.review_document(
            document,
            status="approved",
            reviewed_by=uuid.UUID(auth.user_id),
            review_note=request.review_note,
            embedding_status="pending",
            secret_scan_status="clean",
        )
        job = self.sessions.create_job(
            workspace_id=document.workspace_id,
            session_id=document.session_id,
            job_type="embed_memory",
            payload={"document_id": str(document.id)},
        )
        self._emit(
            document=document,
            event_type="memory.document_reviewed",
            payload={"document_id": str(document.id), "status": "approved"},
            auth=auth,
        )
        self._emit(
            document=document,
            event_type="job.updated",
            payload={"job_id": str(job.id), "status": "queued", "type": job.type},
            auth=auth,
        )
        self.audit.record(
            auth=auth,
            action="memory.document_approved",
            resource_type="memory_document",
            resource_id=str(document.id),
            after=self._audit_payload(document),
        )
        self.db.commit()
        celery_task_id = self.queue.enqueue_memory_embed(job_id=str(job.id))
        self.sessions.mark_job_enqueued(job, celery_task_id=celery_task_id)
        self.db.commit()
        return job_response(job)

    def reject_document(
        self,
        *,
        document_id: str,
        request: MemoryReviewRequest,
        auth: AuthContext,
    ) -> MemoryDocumentResponse:
        document = self.memory.review_document(
            self._get_document(document_id=document_id, auth=auth),
            status="rejected",
            reviewed_by=uuid.UUID(auth.user_id),
            review_note=request.review_note,
        )
        self._emit(
            document=document,
            event_type="memory.document_reviewed",
            payload={"document_id": str(document.id), "status": "rejected"},
            auth=auth,
        )
        self.audit.record(
            auth=auth,
            action="memory.document_rejected",
            resource_type="memory_document",
            resource_id=str(document.id),
            after=self._audit_payload(document),
        )
        self.db.commit()
        return memory_document_response(document)

    def promote_document(
        self,
        *,
        document_id: str,
        request: MemoryPromoteRequest,
        auth: AuthContext,
    ) -> MemoryDocumentResponse:
        document = self._get_document(document_id=document_id, auth=auth)
        if document.status != "approved":
            raise ConflictError("Only approved memory can be promoted.")
        if request.visibility not in {"project", "workspace"}:
            raise DomainError("Memory can only be promoted to project or workspace.")
        if request.visibility == "project" and document.project_id is None:
            raise ConflictError("Project memory requires a project.")
        original_session_id = document.session_id
        document = self.memory.promote_document(document, visibility=request.visibility)
        if request.review_note:
            document.review_note = request.review_note
        if original_session_id is not None:
            self.sessions.create_event(
                workspace_id=document.workspace_id,
                session_id=original_session_id,
                event_type="memory.document_promoted",
                payload={"document_id": str(document.id), "visibility": document.visibility},
                actor_type=auth.actor_type,
                actor_id=auth.api_token_id or auth.user_id,
            )
        self.audit.record(
            auth=auth,
            action="memory.document_promoted",
            resource_type="memory_document",
            resource_id=str(document.id),
            after=self._audit_payload(document),
        )
        self.db.commit()
        return memory_document_response(document)

    def search(
        self,
        request: MemorySearchRequest,
        *,
        auth: AuthContext,
    ) -> MemorySearchResponse:
        workspace_id = uuid.UUID(auth.workspace_id)
        return MemorySearchResponse(
            items=self.search_results(
                workspace_id=workspace_id,
                query=request.query,
                project_id=_optional_uuid(request.project_id, "project_id"),
                session_id=_optional_uuid(request.session_id, "session_id"),
                visibility=request.visibility,
                limit=request.limit,
                provider_profile_id=_optional_uuid(
                    request.provider_profile_id,
                    "provider_profile_id",
                ),
            )
        )

    def search_results(
        self,
        *,
        workspace_id: uuid.UUID,
        query: str,
        project_id: uuid.UUID | None,
        session_id: uuid.UUID | None,
        visibility: list[str] | None = None,
        limit: int | None = None,
        provider_profile_id: uuid.UUID | None = None,
    ) -> list[MemorySearchResult]:
        provider = load_embedding_provider(
            repository=self.configuration,
            workspace_id=workspace_id,
            provider_profile_id=provider_profile_id,
            settings=self.settings,
        )
        response = provider.client.embed(EmbeddingRequest(input=query, model=provider.model))
        self._validate_embedding_dimensions(response.embedding)
        search_limit = min(
            limit or self.settings.memory_search_default_limit,
            self.settings.memory_search_max_limit,
        )
        rows = self.memory.search(
            workspace_id=workspace_id,
            query_embedding=response.embedding,
            project_id=project_id,
            session_id=session_id,
            visibility=visibility,
            limit=search_limit,
            embedding_model=response.model,
        )
        return [
            MemorySearchResult(
                document_id=str(row.document.id),
                chunk_id=str(row.chunk.id),
                title=row.document.title,
                summary=row.document.summary,
                content=row.chunk.content,
                visibility=row.document.visibility,
                score=row.score,
                source_type=row.document.source_type,
            )
            for row in rows
        ]

    def search_context_for_session(self, *, session, query: str) -> list[dict[str, object]]:
        if session.provider_profile_id is None:
            return []
        try:
            results = self.search_results(
                workspace_id=session.workspace_id,
                query=query,
                project_id=session.project_id,
                session_id=session.id,
                visibility=["session", "project", "workspace"],
                limit=self.settings.memory_search_default_limit,
                provider_profile_id=session.provider_profile_id,
            )
        except DomainError:
            return []
        return [result.model_dump() for result in results]

    def _resolve_project_session(
        self,
        *,
        workspace_id: uuid.UUID,
        project_id: str | None,
        session_id: str | None,
    ) -> tuple[uuid.UUID | None, uuid.UUID | None]:
        parsed_project_id = _optional_uuid(project_id, "project_id")
        parsed_session_id = _optional_uuid(session_id, "session_id")
        if parsed_session_id is not None:
            session = self.sessions.get_session(
                workspace_id=workspace_id,
                session_id=parsed_session_id,
            )
            if session is None:
                raise NotFoundError("Session was not found.")
            if parsed_project_id is not None and parsed_project_id != session.project_id:
                raise ConflictError("Memory project_id must match the session project.")
            return session.project_id, session.id
        if parsed_project_id is not None:
            project = self.projects.get_project(
                workspace_id=workspace_id,
                project_id=parsed_project_id,
            )
            if project is None:
                raise NotFoundError("Project was not found.")
        return parsed_project_id, None

    def _get_document(self, *, document_id: str, auth: AuthContext) -> MemoryDocument:
        document = self.memory.get_document(
            workspace_id=uuid.UUID(auth.workspace_id),
            document_id=parse_uuid(document_id, field_name="document_id"),
        )
        if document is None:
            raise NotFoundError("Memory document was not found.")
        return document

    def _emit(
        self,
        *,
        document: MemoryDocument,
        event_type: str,
        payload: dict[str, object],
        auth: AuthContext,
    ) -> None:
        if document.session_id is None:
            return
        self.sessions.create_event(
            workspace_id=document.workspace_id,
            session_id=document.session_id,
            event_type=event_type,
            payload=payload,
            actor_type=auth.actor_type,
            actor_id=auth.api_token_id or auth.user_id,
        )

    def _validate_embedding_dimensions(self, embedding: list[float]) -> None:
        if len(embedding) != self.settings.memory_embedding_dimensions:
            raise DomainError("Embedding provider returned an unexpected dimension.")

    @staticmethod
    def _validate_visibility(value: str) -> None:
        if value not in VISIBILITIES:
            raise DomainError("Memory visibility must be session, project, or workspace.")

    @staticmethod
    def _validate_source_type(value: str) -> None:
        if value not in SOURCE_TYPES:
            raise DomainError("Unsupported memory source type.")

    @staticmethod
    def _audit_payload(document: MemoryDocument) -> dict[str, object]:
        return {
            "title": document.title,
            "source_type": document.source_type,
            "visibility": document.visibility,
            "status": document.status,
            "embedding_status": document.embedding_status,
            "secret_scan_status": document.secret_scan_status,
        }


def memory_document_response(document: MemoryDocument) -> MemoryDocumentResponse:
    return MemoryDocumentResponse(
        id=str(document.id),
        project_id=str(document.project_id) if document.project_id else None,
        session_id=str(document.session_id) if document.session_id else None,
        source_evidence_id=(
            str(document.source_evidence_id) if document.source_evidence_id else None
        ),
        source_finding_id=str(document.source_finding_id) if document.source_finding_id else None,
        provider_profile_id=(
            str(document.provider_profile_id) if document.provider_profile_id else None
        ),
        title=document.title,
        summary=document.summary,
        content=document.content,
        source_type=document.source_type,
        visibility=document.visibility,
        status=document.status,
        embedding_status=document.embedding_status,
        secret_scan_status=document.secret_scan_status,
        metadata=document.metadata_json,
        created_by=str(document.created_by) if document.created_by else None,
        reviewed_by=str(document.reviewed_by) if document.reviewed_by else None,
        review_note=document.review_note,
        reviewed_at=document.reviewed_at.isoformat() if document.reviewed_at else None,
        created_at=document.created_at.isoformat(),
        updated_at=document.updated_at.isoformat(),
    )


def _optional_uuid(value: str | None, field_name: str) -> uuid.UUID | None:
    return parse_uuid(value, field_name=field_name) if value else None
