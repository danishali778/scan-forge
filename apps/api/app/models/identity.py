import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Any

from sqlalchemy import DateTime, ForeignKey, Index, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, SoftDeleteMixin, TimestampMixin, json_dict, uuid_pk

if TYPE_CHECKING:
    pass


class Workspace(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "workspaces"

    id: Mapped[uuid.UUID] = uuid_pk()
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    slug: Mapped[str] = mapped_column(String(255), nullable=False)
    settings: Mapped[dict[str, Any]] = json_dict()

    users: Mapped[list["User"]] = relationship(back_populates="workspace")

    __table_args__ = (
        Index(
            "ix_workspaces_slug_active",
            "slug",
            unique=True,
            postgresql_where=text("deleted_at IS NULL"),
        ),
    )


class Role(Base, TimestampMixin):
    __tablename__ = "roles"

    id: Mapped[uuid.UUID] = uuid_pk()
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    permissions: Mapped[list["RolePermission"]] = relationship(
        back_populates="role",
        cascade="all, delete-orphan",
    )

    __table_args__ = (Index("ix_roles_workspace_name", "workspace_id", "name", unique=True),)


class RolePermission(Base):
    __tablename__ = "role_permissions"

    id: Mapped[uuid.UUID] = uuid_pk()
    role_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("roles.id"), nullable=False)
    permission: Mapped[str] = mapped_column(String(160), nullable=False)

    role: Mapped[Role] = relationship(back_populates="permissions")

    __table_args__ = (
        Index("ix_role_permissions_role_permission", "role_id", "permission", unique=True),
    )


class User(Base, TimestampMixin, SoftDeleteMixin):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = uuid_pk()
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id"), nullable=False)
    supabase_user_id: Mapped[uuid.UUID | None] = mapped_column(nullable=True)
    email: Mapped[str] = mapped_column(String(320), nullable=False)
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    type: Mapped[str] = mapped_column(String(50), default="human", nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="active", nullable=False)
    role_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("roles.id"), nullable=False)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    workspace: Mapped[Workspace] = relationship(back_populates="users")
    role: Mapped[Role] = relationship()

    __table_args__ = (
        Index(
            "ix_users_workspace_email_active",
            "workspace_id",
            "email",
            unique=True,
            postgresql_where=text("deleted_at IS NULL"),
        ),
        Index(
            "ix_users_workspace_supabase_user_active",
            "workspace_id",
            "supabase_user_id",
            unique=True,
            postgresql_where=text("supabase_user_id IS NOT NULL AND deleted_at IS NULL"),
        ),
        Index("ix_users_workspace_role", "workspace_id", "role_id"),
    )


class AuthSession(Base):
    __tablename__ = "auth_sessions"

    id: Mapped[uuid.UUID] = uuid_pk()
    workspace_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("workspaces.id"), nullable=False)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id"), nullable=False)
    session_hash: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    csrf_hash: Mapped[str] = mapped_column(String(128), nullable=False)
    supabase_session_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    encrypted_refresh_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    ip_hash: Mapped[str | None] = mapped_column(String(128), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(50), default="active", nullable=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    last_seen_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped[User] = relationship()

    __table_args__ = (
        Index("ix_auth_sessions_user_status", "user_id", "status"),
        Index("ix_auth_sessions_workspace_status_created", "workspace_id", "status", "created_at"),
    )
