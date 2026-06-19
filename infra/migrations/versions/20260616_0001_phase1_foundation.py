"""phase1 foundation

Revision ID: 20260616_0001
Revises:
Create Date: 2026-06-16 00:00:00
"""

import sqlalchemy as sa
from alembic import op

revision = "20260616_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute('CREATE EXTENSION IF NOT EXISTS "pgcrypto"')

    uuid_type = sa.UUID()
    json_type = sa.JSON()

    op.create_table(
        "workspaces",
        sa.Column("id", uuid_type, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("slug", sa.String(255), nullable=False),
        sa.Column("settings", json_type, nullable=False, server_default=sa.text("'{}'")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_workspaces_slug_active",
        "workspaces",
        ["slug"],
        unique=True,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )

    op.create_table(
        "roles",
        sa.Column("id", uuid_type, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("workspace_id", uuid_type, sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_roles_workspace_name", "roles", ["workspace_id", "name"], unique=True)

    op.create_table(
        "role_permissions",
        sa.Column("id", uuid_type, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("role_id", uuid_type, sa.ForeignKey("roles.id"), nullable=False),
        sa.Column("permission", sa.String(160), nullable=False),
    )
    op.create_index(
        "ix_role_permissions_role_permission",
        "role_permissions",
        ["role_id", "permission"],
        unique=True,
    )

    op.create_table(
        "users",
        sa.Column("id", uuid_type, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("workspace_id", uuid_type, sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("supabase_user_id", uuid_type, nullable=True),
        sa.Column("email", sa.String(320), nullable=False),
        sa.Column("name", sa.String(255), nullable=True),
        sa.Column("type", sa.String(50), nullable=False, server_default="human"),
        sa.Column("status", sa.String(50), nullable=False, server_default="active"),
        sa.Column("role_id", uuid_type, sa.ForeignKey("roles.id"), nullable=False),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_users_workspace_email_active",
        "users",
        ["workspace_id", "email"],
        unique=True,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )
    op.create_index(
        "ix_users_workspace_supabase_user_active",
        "users",
        ["workspace_id", "supabase_user_id"],
        unique=True,
        postgresql_where=sa.text("supabase_user_id IS NOT NULL AND deleted_at IS NULL"),
    )
    op.create_index("ix_users_workspace_role", "users", ["workspace_id", "role_id"])

    op.create_table(
        "auth_sessions",
        sa.Column("id", uuid_type, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("workspace_id", uuid_type, sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("user_id", uuid_type, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("session_hash", sa.String(128), nullable=False, unique=True),
        sa.Column("csrf_hash", sa.String(128), nullable=False),
        sa.Column("supabase_session_id", sa.String(255), nullable=True),
        sa.Column("encrypted_refresh_token", sa.Text(), nullable=True),
        sa.Column("ip_hash", sa.String(128), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="active"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_auth_sessions_user_status", "auth_sessions", ["user_id", "status"])
    op.create_index(
        "ix_auth_sessions_workspace_status_created",
        "auth_sessions",
        ["workspace_id", "status", "created_at"],
    )

    op.create_table(
        "projects",
        sa.Column("id", uuid_type, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("workspace_id", uuid_type, sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("metadata", json_type, nullable=False, server_default=sa.text("'{}'")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_projects_workspace_name_active",
        "projects",
        ["workspace_id", "name"],
        unique=True,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )
    op.create_index("ix_projects_workspace_created", "projects", ["workspace_id", "created_at"])

    op.create_table(
        "scopes",
        sa.Column("id", uuid_type, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("workspace_id", uuid_type, sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("project_id", uuid_type, sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("rules", json_type, nullable=False, server_default=sa.text("'{}'")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_scopes_project_name_active",
        "scopes",
        ["project_id", "name"],
        unique=True,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )
    op.create_index("ix_scopes_workspace_project", "scopes", ["workspace_id", "project_id"])

    op.create_table(
        "sessions",
        sa.Column("id", uuid_type, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("workspace_id", uuid_type, sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("project_id", uuid_type, sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("scope_id", uuid_type, sa.ForeignKey("scopes.id"), nullable=False),
        sa.Column("provider_profile_id", uuid_type, nullable=True),
        sa.Column("policy_id", uuid_type, nullable=True),
        sa.Column("created_by", uuid_type, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("objective", sa.Text(), nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="draft"),
        sa.Column("mode", sa.String(50), nullable=False, server_default="assisted"),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("metadata", json_type, nullable=False, server_default=sa.text("'{}'")),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_sessions_workspace_project_created",
        "sessions",
        ["workspace_id", "project_id", "created_at"],
    )
    op.create_index("ix_sessions_workspace_status", "sessions", ["workspace_id", "status"])
    op.create_index(
        "ix_sessions_workspace_creator_created",
        "sessions",
        ["workspace_id", "created_by", "created_at"],
    )

    op.create_table(
        "session_events",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("workspace_id", uuid_type, sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("session_id", uuid_type, sa.ForeignKey("sessions.id"), nullable=False),
        sa.Column("event_type", sa.String(120), nullable=False),
        sa.Column("payload", json_type, nullable=False, server_default=sa.text("'{}'")),
        sa.Column("actor_type", sa.String(50), nullable=False),
        sa.Column("actor_id", sa.String(120), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_session_events_session_id", "session_events", ["session_id", "id"])
    op.create_index(
        "ix_session_events_workspace_created",
        "session_events",
        ["workspace_id", "created_at"],
    )
    op.create_index(
        "ix_session_events_type_created",
        "session_events",
        ["event_type", "created_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_session_events_type_created", table_name="session_events")
    op.drop_index("ix_session_events_workspace_created", table_name="session_events")
    op.drop_index("ix_session_events_session_id", table_name="session_events")
    op.drop_table("session_events")

    op.drop_index("ix_sessions_workspace_creator_created", table_name="sessions")
    op.drop_index("ix_sessions_workspace_status", table_name="sessions")
    op.drop_index("ix_sessions_workspace_project_created", table_name="sessions")
    op.drop_table("sessions")

    op.drop_index("ix_scopes_workspace_project", table_name="scopes")
    op.drop_index("ix_scopes_project_name_active", table_name="scopes")
    op.drop_table("scopes")

    op.drop_index("ix_projects_workspace_created", table_name="projects")
    op.drop_index("ix_projects_workspace_name_active", table_name="projects")
    op.drop_table("projects")

    op.drop_index("ix_auth_sessions_workspace_status_created", table_name="auth_sessions")
    op.drop_index("ix_auth_sessions_user_status", table_name="auth_sessions")
    op.drop_table("auth_sessions")

    op.drop_index("ix_users_workspace_role", table_name="users")
    op.drop_index("ix_users_workspace_supabase_user_active", table_name="users")
    op.drop_index("ix_users_workspace_email_active", table_name="users")
    op.drop_table("users")

    op.drop_index("ix_role_permissions_role_permission", table_name="role_permissions")
    op.drop_table("role_permissions")

    op.drop_index("ix_roles_workspace_name", table_name="roles")
    op.drop_table("roles")

    op.drop_index("ix_workspaces_slug_active", table_name="workspaces")
    op.drop_table("workspaces")
