import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base, JsonDict, SoftDeleteMixin, TimestampMixin, uuid_pk


class MemoryDocument(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "memory_documents"

    id: Mapped[uuid.UUID] = uuid_pk()
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id"), nullable=False)
    project_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("projects.id"), nullable=True)
    session_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("sessions.id"), nullable=True)
    source_evidence_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("evidence.id"),
        nullable=True,
    )
    source_finding_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("findings.id"),
        nullable=True,
    )
    provider_profile_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("provider_profiles.id"),
        nullable=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    source_type: Mapped[str] = mapped_column(String(50), nullable=False)
    visibility: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="candidate", nullable=False)
    embedding_status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)
    secret_scan_status: Mapped[str] = mapped_column(String(50), default="pending", nullable=False)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(
        "metadata",
        JsonDict,
        default=dict,
        nullable=False,
    )
    created_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    reviewed_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    review_note: Mapped[str | None] = mapped_column(Text, nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    __table_args__ = (
        Index("ix_memory_documents_workspace_status", "workspace_id", "status"),
        Index("ix_memory_documents_workspace_visibility", "workspace_id", "visibility"),
        Index("ix_memory_documents_project_status", "project_id", "status"),
        Index("ix_memory_documents_session_status", "session_id", "status"),
    )


class MemoryChunk(Base):
    __tablename__ = "memory_chunks"

    id: Mapped[uuid.UUID] = uuid_pk()
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id"), nullable=False)
    document_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("memory_documents.id"),
        nullable=False,
    )
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    token_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(
        "metadata",
        JsonDict,
        default=dict,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("ix_memory_chunks_document_index", "document_id", "chunk_index", unique=True),
        Index("ix_memory_chunks_workspace_document", "workspace_id", "document_id"),
    )


class MemoryEmbedding(Base):
    __tablename__ = "memory_embeddings"

    chunk_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("memory_chunks.id"),
        primary_key=True,
    )
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id"), nullable=False)
    embedding_provider: Mapped[str] = mapped_column(String(80), nullable=False)
    embedding_model: Mapped[str] = mapped_column(String(255), nullable=False)
    embedding_dimensions: Mapped[int] = mapped_column(Integer, nullable=False)
    embedding: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("ix_memory_embeddings_workspace_model", "workspace_id", "embedding_model"),
        Index("ix_memory_embeddings_workspace_chunk", "workspace_id", "chunk_id"),
    )
