import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, ForeignKey, Index, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, JsonDict, SoftDeleteMixin, TimestampMixin, json_dict, uuid_pk

if TYPE_CHECKING:
    from app.models.identity import User


class ApiToken(Base, SoftDeleteMixin):
    __tablename__ = "api_tokens"

    id: Mapped[uuid.UUID] = uuid_pk()
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    token_prefix: Mapped[str] = mapped_column(String(32), nullable=False)
    token_hash: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="active", nullable=False)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship()

    __table_args__ = (
        Index("ix_api_tokens_workspace_user", "workspace_id", "user_id"),
        Index("ix_api_tokens_workspace_status", "workspace_id", "status"),
        Index("ix_api_tokens_prefix", "token_prefix"),
    )


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id: Mapped[uuid.UUID] = uuid_pk()
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id"), nullable=False)
    actor_type: Mapped[str] = mapped_column(String(50), nullable=False)
    actor_id: Mapped[str] = mapped_column(String(120), nullable=False)
    action: Mapped[str] = mapped_column(String(160), nullable=False)
    resource_type: Mapped[str] = mapped_column(String(80), nullable=False)
    resource_id: Mapped[str] = mapped_column(String(120), nullable=False)
    ip_address: Mapped[str | None] = mapped_column(String(64), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
    before_json: Mapped[dict[str, Any] | None] = mapped_column("before", JsonDict, nullable=True)
    after_json: Mapped[dict[str, Any] | None] = mapped_column("after", JsonDict, nullable=True)
    metadata_json: Mapped[dict[str, Any]] = mapped_column(
        "metadata",
        JsonDict,
        default=dict,
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("ix_audit_events_workspace_created", "workspace_id", "created_at"),
        Index("ix_audit_events_workspace_action_created", "workspace_id", "action", "created_at"),
        Index("ix_audit_events_resource_created", "resource_type", "resource_id", "created_at"),
    )


class Secret(Base, SoftDeleteMixin):
    __tablename__ = "secrets"

    id: Mapped[uuid.UUID] = uuid_pk()
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    secret_type: Mapped[str] = mapped_column(String(80), nullable=False)
    ciphertext: Mapped[str] = mapped_column(Text, nullable=False)
    key_id: Mapped[str] = mapped_column(String(120), default="local-fernet", nullable=False)
    created_by: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index(
            "ix_secrets_workspace_name_active",
            "workspace_id",
            "name",
            unique=True,
            postgresql_where=text("deleted_at IS NULL"),
        ),
        Index("ix_secrets_workspace_type", "workspace_id", "secret_type"),
    )


class ProviderProfile(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "provider_profiles"

    id: Mapped[uuid.UUID] = uuid_pk()
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    provider_type: Mapped[str] = mapped_column(String(80), nullable=False)
    base_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    credential_secret_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("secrets.id"),
        nullable=True,
    )
    agent_models: Mapped[dict[str, Any]] = json_dict()
    options: Mapped[dict[str, Any]] = json_dict()
    budgets: Mapped[dict[str, Any]] = json_dict()
    status: Mapped[str] = mapped_column(String(50), default="active", nullable=False)

    credential_secret: Mapped[Secret | None] = relationship()

    __table_args__ = (
        Index(
            "ix_provider_profiles_workspace_name_active",
            "workspace_id",
            "name",
            unique=True,
            postgresql_where=text("deleted_at IS NULL"),
        ),
        Index("ix_provider_profiles_workspace_type", "workspace_id", "provider_type"),
        Index("ix_provider_profiles_workspace_status", "workspace_id", "status"),
    )


class Policy(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "policies"

    id: Mapped[uuid.UUID] = uuid_pk()
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    rules: Mapped[dict[str, Any]] = json_dict()
    status: Mapped[str] = mapped_column(String(50), default="active", nullable=False)

    __table_args__ = (
        Index(
            "ix_policies_workspace_name_active",
            "workspace_id",
            "name",
            unique=True,
            postgresql_where=text("deleted_at IS NULL"),
        ),
        Index("ix_policies_workspace_status", "workspace_id", "status"),
    )
