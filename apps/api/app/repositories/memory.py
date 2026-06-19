import json
import math
import uuid
from dataclasses import dataclass
from datetime import UTC, datetime

import sqlalchemy as sa
from sqlalchemy import select

from app.models.memory import MemoryChunk, MemoryDocument, MemoryEmbedding
from app.repositories.base import BaseRepository


@dataclass(frozen=True)
class MemorySearchRow:
    document: MemoryDocument
    chunk: MemoryChunk
    score: float


class MemoryRepository(BaseRepository):
    def create_document(
        self,
        *,
        workspace_id: uuid.UUID,
        title: str,
        summary: str,
        content: str,
        source_type: str,
        visibility: str,
        project_id: uuid.UUID | None = None,
        session_id: uuid.UUID | None = None,
        source_evidence_id: uuid.UUID | None = None,
        source_finding_id: uuid.UUID | None = None,
        provider_profile_id: uuid.UUID | None = None,
        metadata: dict[str, object] | None = None,
        created_by: uuid.UUID | None = None,
        status: str = "candidate",
        embedding_status: str = "pending",
        secret_scan_status: str = "pending",
    ) -> MemoryDocument:
        document = MemoryDocument(
            workspace_id=workspace_id,
            project_id=project_id,
            session_id=session_id,
            source_evidence_id=source_evidence_id,
            source_finding_id=source_finding_id,
            provider_profile_id=provider_profile_id,
            title=title,
            summary=summary,
            content=content,
            source_type=source_type,
            visibility=visibility,
            status=status,
            embedding_status=embedding_status,
            secret_scan_status=secret_scan_status,
            metadata_json=metadata or {},
            created_by=created_by,
        )
        self.db.add(document)
        self.db.flush()
        return document

    def list_documents(
        self,
        *,
        workspace_id: uuid.UUID,
        status: str | None = None,
        visibility: str | None = None,
        project_id: uuid.UUID | None = None,
        session_id: uuid.UUID | None = None,
        limit: int = 100,
    ) -> list[MemoryDocument]:
        statement = select(MemoryDocument).where(
            MemoryDocument.workspace_id == workspace_id,
            MemoryDocument.deleted_at.is_(None),
        )
        if status is not None:
            statement = statement.where(MemoryDocument.status == status)
        if visibility is not None:
            statement = statement.where(MemoryDocument.visibility == visibility)
        if project_id is not None:
            statement = statement.where(MemoryDocument.project_id == project_id)
        if session_id is not None:
            statement = statement.where(MemoryDocument.session_id == session_id)
        return list(
            self.db.scalars(statement.order_by(MemoryDocument.created_at.desc()).limit(limit))
        )

    def get_document(
        self,
        *,
        workspace_id: uuid.UUID,
        document_id: uuid.UUID,
    ) -> MemoryDocument | None:
        return self.db.scalar(
            select(MemoryDocument).where(
                MemoryDocument.workspace_id == workspace_id,
                MemoryDocument.id == document_id,
                MemoryDocument.deleted_at.is_(None),
            )
        )

    def update_document(
        self,
        document: MemoryDocument,
        *,
        title: str | None = None,
        summary: str | None = None,
        content: str | None = None,
        visibility: str | None = None,
        metadata: dict[str, object] | None = None,
        provider_profile_id: uuid.UUID | None = None,
        status: str | None = None,
        embedding_status: str | None = None,
        secret_scan_status: str | None = None,
    ) -> MemoryDocument:
        if title is not None:
            document.title = title
        if summary is not None:
            document.summary = summary
        if content is not None:
            document.content = content
        if visibility is not None:
            document.visibility = visibility
        if metadata is not None:
            document.metadata_json = metadata
        if provider_profile_id is not None:
            document.provider_profile_id = provider_profile_id
        if status is not None:
            document.status = status
        if embedding_status is not None:
            document.embedding_status = embedding_status
        if secret_scan_status is not None:
            document.secret_scan_status = secret_scan_status
        self.db.add(document)
        self.db.flush()
        return document

    def review_document(
        self,
        document: MemoryDocument,
        *,
        status: str,
        reviewed_by: uuid.UUID,
        review_note: str | None,
        embedding_status: str | None = None,
        secret_scan_status: str | None = None,
    ) -> MemoryDocument:
        document.status = status
        document.reviewed_by = reviewed_by
        document.review_note = review_note
        document.reviewed_at = datetime.now(UTC)
        if embedding_status is not None:
            document.embedding_status = embedding_status
        if secret_scan_status is not None:
            document.secret_scan_status = secret_scan_status
        self.db.add(document)
        self.db.flush()
        return document

    def promote_document(self, document: MemoryDocument, *, visibility: str) -> MemoryDocument:
        document.visibility = visibility
        if visibility == "workspace":
            document.session_id = None
            document.project_id = None
        if visibility == "project":
            document.session_id = None
        self.db.add(document)
        self.db.flush()
        return document

    def delete_document(self, document: MemoryDocument) -> MemoryDocument:
        document.deleted_at = datetime.now(UTC)
        self.db.add(document)
        self.db.flush()
        return document

    def delete_chunks_for_document(self, *, document_id: uuid.UUID) -> None:
        chunks = list(
            self.db.scalars(
                select(MemoryChunk).where(MemoryChunk.document_id == document_id)
            )
        )
        for chunk in chunks:
            embedding = self.db.get(MemoryEmbedding, chunk.id)
            if embedding is not None:
                self.db.delete(embedding)
            self.db.delete(chunk)
        self.db.flush()

    def create_chunk(
        self,
        *,
        workspace_id: uuid.UUID,
        document_id: uuid.UUID,
        chunk_index: int,
        content: str,
        metadata: dict[str, object] | None = None,
    ) -> MemoryChunk:
        chunk = MemoryChunk(
            workspace_id=workspace_id,
            document_id=document_id,
            chunk_index=chunk_index,
            content=content,
            token_count=max(1, len(content.split())),
            metadata_json=metadata or {},
            created_at=datetime.now(UTC),
        )
        self.db.add(chunk)
        self.db.flush()
        return chunk

    def create_embedding(
        self,
        *,
        chunk_id: uuid.UUID,
        workspace_id: uuid.UUID,
        embedding_provider: str,
        embedding_model: str,
        embedding_dimensions: int,
        embedding: list[float],
    ) -> MemoryEmbedding:
        vector = vector_to_db(embedding)
        if self._uses_pgvector():
            self.db.execute(
                sa.text(
                    """
                    insert into memory_embeddings (
                        chunk_id, workspace_id, embedding_provider, embedding_model,
                        embedding_dimensions, embedding, created_at
                    )
                    values (
                        :chunk_id, :workspace_id, :embedding_provider, :embedding_model,
                        :embedding_dimensions, cast(:embedding as vector), :created_at
                    )
                    """
                ),
                {
                    "chunk_id": chunk_id,
                    "workspace_id": workspace_id,
                    "embedding_provider": embedding_provider,
                    "embedding_model": embedding_model,
                    "embedding_dimensions": embedding_dimensions,
                    "embedding": vector,
                    "created_at": datetime.now(UTC),
                },
            )
            self.db.flush()
            value = self.db.get(MemoryEmbedding, chunk_id)
            if value is None:
                raise RuntimeError("Memory embedding insert failed.")
            return value

        value = MemoryEmbedding(
            chunk_id=chunk_id,
            workspace_id=workspace_id,
            embedding_provider=embedding_provider,
            embedding_model=embedding_model,
            embedding_dimensions=embedding_dimensions,
            embedding=vector,
            created_at=datetime.now(UTC),
        )
        self.db.add(value)
        self.db.flush()
        return value

    def search(
        self,
        *,
        workspace_id: uuid.UUID,
        query_embedding: list[float],
        limit: int,
        project_id: uuid.UUID | None = None,
        session_id: uuid.UUID | None = None,
        visibility: list[str] | None = None,
        embedding_model: str | None = None,
    ) -> list[MemorySearchRow]:
        if self._uses_pgvector():
            return self._search_postgres(
                workspace_id=workspace_id,
                query_embedding=query_embedding,
                limit=limit,
                project_id=project_id,
                session_id=session_id,
                visibility=visibility,
                embedding_model=embedding_model,
            )
        return self._search_python(
            workspace_id=workspace_id,
            query_embedding=query_embedding,
            limit=limit,
            project_id=project_id,
            session_id=session_id,
            visibility=visibility,
            embedding_model=embedding_model,
        )

    def _search_python(
        self,
        *,
        workspace_id: uuid.UUID,
        query_embedding: list[float],
        limit: int,
        project_id: uuid.UUID | None,
        session_id: uuid.UUID | None,
        visibility: list[str] | None,
        embedding_model: str | None,
    ) -> list[MemorySearchRow]:
        statement = (
            select(MemoryDocument, MemoryChunk, MemoryEmbedding)
            .join(MemoryChunk, MemoryChunk.document_id == MemoryDocument.id)
            .join(MemoryEmbedding, MemoryEmbedding.chunk_id == MemoryChunk.id)
            .where(
                MemoryDocument.workspace_id == workspace_id,
                MemoryDocument.status == "approved",
                MemoryDocument.deleted_at.is_(None),
            )
        )
        if visibility:
            statement = statement.where(MemoryDocument.visibility.in_(visibility))
        if project_id is not None:
            statement = statement.where(
                sa.or_(
                    MemoryDocument.visibility == "workspace",
                    MemoryDocument.project_id == project_id,
                )
            )
        if session_id is not None:
            statement = statement.where(
                sa.or_(
                    MemoryDocument.visibility != "session",
                    MemoryDocument.session_id == session_id,
                )
            )
        if embedding_model is not None:
            statement = statement.where(MemoryEmbedding.embedding_model == embedding_model)

        rows = []
        for document, chunk, embedding in self.db.execute(statement).all():
            score = cosine_similarity(query_embedding, db_to_vector(embedding.embedding))
            rows.append(MemorySearchRow(document=document, chunk=chunk, score=score))
        return sorted(rows, key=lambda item: item.score, reverse=True)[:limit]

    def _search_postgres(
        self,
        *,
        workspace_id: uuid.UUID,
        query_embedding: list[float],
        limit: int,
        project_id: uuid.UUID | None,
        session_id: uuid.UUID | None,
        visibility: list[str] | None,
        embedding_model: str | None,
    ) -> list[MemorySearchRow]:
        filters = [
            "d.workspace_id = :workspace_id",
            "d.status = 'approved'",
            "d.deleted_at is null",
        ]
        params: dict[str, object] = {
            "workspace_id": workspace_id,
            "query_embedding": vector_to_db(query_embedding),
            "limit": limit,
        }
        if visibility:
            names = []
            for index, value in enumerate(visibility):
                key = f"visibility_{index}"
                params[key] = value
                names.append(f":{key}")
            filters.append(f"d.visibility in ({', '.join(names)})")
        if project_id is not None:
            filters.append("(d.visibility = 'workspace' or d.project_id = :project_id)")
            params["project_id"] = project_id
        if session_id is not None:
            filters.append("(d.visibility <> 'session' or d.session_id = :session_id)")
            params["session_id"] = session_id
        if embedding_model is not None:
            filters.append("e.embedding_model = :embedding_model")
            params["embedding_model"] = embedding_model

        rows = self.db.execute(
            sa.text(
                f"""
                select d.id as document_id, c.id as chunk_id,
                       1 - (e.embedding <=> cast(:query_embedding as vector)) as score
                from memory_documents d
                join memory_chunks c on c.document_id = d.id
                join memory_embeddings e on e.chunk_id = c.id
                where {' and '.join(filters)}
                order by e.embedding <=> cast(:query_embedding as vector)
                limit :limit
                """
            ),
            params,
        ).mappings()

        results: list[MemorySearchRow] = []
        for row in rows:
            document = self.db.get(MemoryDocument, row["document_id"])
            chunk = self.db.get(MemoryChunk, row["chunk_id"])
            if document is not None and chunk is not None:
                results.append(
                    MemorySearchRow(document=document, chunk=chunk, score=float(row["score"]))
                )
        return results

    def _uses_pgvector(self) -> bool:
        if self.db.bind is None or self.db.bind.dialect.name != "postgresql":
            return False
        return bool(
            self.db.scalar(
                sa.text("select exists(select 1 from pg_extension where extname = 'vector')")
            )
        )


def vector_to_db(values: list[float]) -> str:
    return "[" + ",".join(f"{value:.8f}" for value in values) + "]"


def db_to_vector(value: str) -> list[float]:
    text = value.strip()
    if text.startswith("[") and text.endswith("]"):
        text = text[1:-1]
    if not text:
        return []
    try:
        return [float(item) for item in text.split(",")]
    except ValueError:
        data = json.loads(value)
        return [float(item) for item in data]


def cosine_similarity(left: list[float], right: list[float]) -> float:
    if not left or not right or len(left) != len(right):
        return 0.0
    numerator = sum(a * b for a, b in zip(left, right, strict=True))
    left_norm = math.sqrt(sum(a * a for a in left))
    right_norm = math.sqrt(sum(b * b for b in right))
    denominator = left_norm * right_norm
    if denominator == 0:
        return 0.0
    return numerator / denominator
