"""phase7 memory and knowledge

Revision ID: 20260618_0007
Revises: 20260618_0006
Create Date: 2026-06-18 00:00:00
"""

import json

import sqlalchemy as sa
from alembic import op

revision = "20260618_0007"
down_revision = "20260618_0006"
branch_labels = None
depends_on = None

EMBEDDING_DIMENSIONS = 1536

PHASE7_ROLE_PERMISSIONS = {
    "Owner": [
        "memory.read",
        "memory.search",
        "memory.create",
        "memory.update",
        "memory.review",
        "memory.promote",
        "memory.delete",
    ],
    "Admin": [
        "memory.read",
        "memory.search",
        "memory.create",
        "memory.update",
        "memory.review",
        "memory.promote",
        "memory.delete",
    ],
    "Operator": ["memory.read", "memory.search", "memory.create", "memory.update"],
    "Reviewer": ["memory.read", "memory.search", "memory.review", "memory.promote"],
    "Viewer": ["memory.read", "memory.search"],
}

MEMORY_TOOL_DEFINITIONS = [
    {
        "name": "memory.search",
        "version": "1.0.0",
        "description": "Search approved scoped memory.",
        "category": "memory",
        "risk_level": "low",
        "runtime_type": "builtin",
        "input_schema": {
            "type": "object",
            "properties": {"query": {"type": "string"}, "limit": {"type": "integer"}},
            "required": ["query"],
        },
        "output_schema": {},
        "enabled": True,
    },
    {
        "name": "memory.propose",
        "version": "1.0.0",
        "description": "Create candidate memory for human review.",
        "category": "memory",
        "risk_level": "low",
        "runtime_type": "builtin",
        "input_schema": {
            "type": "object",
            "properties": {
                "title": {"type": "string"},
                "summary": {"type": "string"},
                "content": {"type": "string"},
            },
            "required": ["title", "summary", "content"],
        },
        "output_schema": {},
        "enabled": True,
    },
]


def _uuid_type():
    return sa.UUID()


def _json_type():
    return sa.JSON()


def _seed_phase7_permissions() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return
    for role_name, permissions in PHASE7_ROLE_PERMISSIONS.items():
        for permission in permissions:
            op.execute(
                sa.text(
                    """
                    insert into role_permissions (id, role_id, permission)
                    select gen_random_uuid(), r.id, :permission
                    from roles r
                    where r.name = :role_name
                      and not exists (
                        select 1 from role_permissions rp
                        where rp.role_id = r.id and rp.permission = :permission
                      )
                    """
                ).bindparams(role_name=role_name, permission=permission)
            )


def _seed_memory_tools() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return
    for tool in MEMORY_TOOL_DEFINITIONS:
        op.execute(
            sa.text(
                """
                insert into tool_definitions (
                    id, workspace_id, name, version, description, category,
                    risk_level, runtime_type, input_schema, output_schema,
                    enabled, created_at, updated_at
                )
                select gen_random_uuid(), null, :name, :version, :description, :category,
                       :risk_level, :runtime_type, cast(:input_schema as json),
                       cast(:output_schema as json), :enabled, now(), now()
                where not exists (
                    select 1 from tool_definitions
                    where name = :name and version = :version and workspace_id is null
                )
                """
            ).bindparams(
                name=tool["name"],
                version=tool["version"],
                description=tool["description"],
                category=tool["category"],
                risk_level=tool["risk_level"],
                runtime_type=tool["runtime_type"],
                input_schema=json.dumps(tool["input_schema"]),
                output_schema=json.dumps(tool["output_schema"]),
                enabled=tool["enabled"],
            )
        )


def _enable_pgvector_if_available() -> bool:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return False
    op.execute(
        """
        do $$
        begin
            create extension if not exists vector;
        exception
            when undefined_file then
                raise notice 'pgvector extension is not available; using text fallback';
        end $$;
        """
    )
    return bool(
        bind.scalar(sa.text("select exists(select 1 from pg_extension where extname = 'vector')"))
    )


def upgrade() -> None:
    uuid_type = _uuid_type()
    json_type = _json_type()
    vector_available = _enable_pgvector_if_available()

    op.create_table(
        "memory_documents",
        sa.Column("id", uuid_type, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("workspace_id", uuid_type, sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("project_id", uuid_type, sa.ForeignKey("projects.id"), nullable=True),
        sa.Column("session_id", uuid_type, sa.ForeignKey("sessions.id"), nullable=True),
        sa.Column("source_evidence_id", uuid_type, sa.ForeignKey("evidence.id"), nullable=True),
        sa.Column("source_finding_id", uuid_type, sa.ForeignKey("findings.id"), nullable=True),
        sa.Column(
            "provider_profile_id",
            uuid_type,
            sa.ForeignKey("provider_profiles.id"),
            nullable=True,
        ),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("source_type", sa.String(50), nullable=False),
        sa.Column("visibility", sa.String(50), nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="candidate"),
        sa.Column("embedding_status", sa.String(50), nullable=False, server_default="pending"),
        sa.Column("secret_scan_status", sa.String(50), nullable=False, server_default="pending"),
        sa.Column("metadata", json_type, nullable=False, server_default=sa.text("'{}'")),
        sa.Column("created_by", uuid_type, sa.ForeignKey("users.id"), nullable=True),
        sa.Column("reviewed_by", uuid_type, sa.ForeignKey("users.id"), nullable=True),
        sa.Column("review_note", sa.Text(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_memory_documents_workspace_status",
        "memory_documents",
        ["workspace_id", "status"],
    )
    op.create_index(
        "ix_memory_documents_workspace_visibility",
        "memory_documents",
        ["workspace_id", "visibility"],
    )
    op.create_index(
        "ix_memory_documents_project_status",
        "memory_documents",
        ["project_id", "status"],
    )
    op.create_index(
        "ix_memory_documents_session_status",
        "memory_documents",
        ["session_id", "status"],
    )

    op.create_table(
        "memory_chunks",
        sa.Column("id", uuid_type, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("workspace_id", uuid_type, sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column(
            "document_id",
            uuid_type,
            sa.ForeignKey("memory_documents.id"),
            nullable=False,
        ),
        sa.Column("chunk_index", sa.Integer(), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("token_count", sa.Integer(), nullable=True),
        sa.Column("metadata", json_type, nullable=False, server_default=sa.text("'{}'")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        "ix_memory_chunks_document_index",
        "memory_chunks",
        ["document_id", "chunk_index"],
        unique=True,
    )
    op.create_index(
        "ix_memory_chunks_workspace_document",
        "memory_chunks",
        ["workspace_id", "document_id"],
    )

    op.create_table(
        "memory_embeddings",
        sa.Column("chunk_id", uuid_type, sa.ForeignKey("memory_chunks.id"), primary_key=True),
        sa.Column("workspace_id", uuid_type, sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("embedding_provider", sa.String(80), nullable=False),
        sa.Column("embedding_model", sa.String(255), nullable=False),
        sa.Column("embedding_dimensions", sa.Integer(), nullable=False),
        sa.Column("embedding", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        "ix_memory_embeddings_workspace_model",
        "memory_embeddings",
        ["workspace_id", "embedding_model"],
    )
    op.create_index(
        "ix_memory_embeddings_workspace_chunk",
        "memory_embeddings",
        ["workspace_id", "chunk_id"],
    )
    if vector_available:
        op.execute(
            f"""
            alter table memory_embeddings
            alter column embedding type vector({EMBEDDING_DIMENSIONS})
            using embedding::vector
            """
        )
        op.execute(
            """
            create index ix_memory_embeddings_embedding_vector
            on memory_embeddings
            using ivfflat (embedding vector_cosine_ops)
            with (lists = 100)
            """
        )

    _seed_phase7_permissions()
    _seed_memory_tools()


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute("drop index if exists ix_memory_embeddings_embedding_vector")

    op.drop_index("ix_memory_embeddings_workspace_chunk", table_name="memory_embeddings")
    op.drop_index("ix_memory_embeddings_workspace_model", table_name="memory_embeddings")
    op.drop_table("memory_embeddings")

    op.drop_index("ix_memory_chunks_workspace_document", table_name="memory_chunks")
    op.drop_index("ix_memory_chunks_document_index", table_name="memory_chunks")
    op.drop_table("memory_chunks")

    op.drop_index("ix_memory_documents_session_status", table_name="memory_documents")
    op.drop_index("ix_memory_documents_project_status", table_name="memory_documents")
    op.drop_index("ix_memory_documents_workspace_visibility", table_name="memory_documents")
    op.drop_index("ix_memory_documents_workspace_status", table_name="memory_documents")
    op.drop_table("memory_documents")
