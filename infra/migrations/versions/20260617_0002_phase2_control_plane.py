"""phase2 control plane

Revision ID: 20260617_0002
Revises: 20260616_0001
Create Date: 2026-06-17 00:00:00
"""

import sqlalchemy as sa
from alembic import op

revision = "20260617_0002"
down_revision = "20260616_0001"
branch_labels = None
depends_on = None


ALL_PERMISSIONS = [
    "api_tokens.create",
    "api_tokens.read",
    "api_tokens.revoke",
    "audit_events.read",
    "policies.manage",
    "policies.read",
    "projects.create",
    "projects.delete",
    "projects.read",
    "projects.update",
    "provider_profiles.manage",
    "provider_profiles.read",
    "roles.read",
    "scopes.create",
    "scopes.delete",
    "scopes.read",
    "scopes.update",
    "sessions.approve",
    "sessions.create",
    "sessions.read",
    "targets.create",
    "targets.delete",
    "targets.read",
    "targets.update",
    "users.invite",
    "users.manage",
    "users.read",
    "workspaces.manage",
    "workspaces.read",
]


ROLE_PERMISSIONS = {
    "Owner": ALL_PERMISSIONS,
    "Admin": ALL_PERMISSIONS,
    "Operator": [
        "api_tokens.create",
        "api_tokens.read",
        "api_tokens.revoke",
        "policies.read",
        "projects.create",
        "projects.delete",
        "projects.read",
        "projects.update",
        "provider_profiles.read",
        "roles.read",
        "scopes.create",
        "scopes.delete",
        "scopes.read",
        "scopes.update",
        "sessions.approve",
        "sessions.create",
        "sessions.read",
        "targets.create",
        "targets.delete",
        "targets.read",
        "targets.update",
        "users.read",
        "workspaces.read",
    ],
    "Reviewer": [
        "policies.read",
        "projects.read",
        "provider_profiles.read",
        "roles.read",
        "scopes.read",
        "sessions.read",
        "targets.read",
        "users.read",
        "workspaces.read",
    ],
    "Viewer": [
        "policies.read",
        "projects.read",
        "provider_profiles.read",
        "roles.read",
        "scopes.read",
        "sessions.read",
        "targets.read",
        "workspaces.read",
    ],
}


ROLE_DESCRIPTIONS = {
    "Owner": "Workspace owner with full access.",
    "Admin": "Administrative user with full workspace access.",
    "Operator": "Operator who can manage projects, scopes, targets, and sessions.",
    "Reviewer": "Reviewer who can inspect configured projects and session data.",
    "Viewer": "Read-only workspace user.",
}


def _json_type():
    return sa.JSON()


def _uuid_type():
    return sa.UUID()


def _seed_default_roles() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    for role_name, description in ROLE_DESCRIPTIONS.items():
        op.execute(
            sa.text(
                """
                insert into roles (id, workspace_id, name, description, created_at, updated_at)
                select gen_random_uuid(), w.id, :name, :description, now(), now()
                from workspaces w
                where w.deleted_at is null
                  and not exists (
                    select 1 from roles r
                    where r.workspace_id = w.id and r.name = :name
                  )
                """
            ).bindparams(name=role_name, description=description)
        )

    for role_name, permissions in ROLE_PERMISSIONS.items():
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


def upgrade() -> None:
    uuid_type = _uuid_type()
    json_type = _json_type()

    op.add_column(
        "projects",
        sa.Column("status", sa.String(50), nullable=False, server_default="active"),
    )
    op.add_column("projects", sa.Column("created_by", uuid_type, nullable=True))
    op.create_foreign_key(
        "fk_projects_created_by_users",
        "projects",
        "users",
        ["created_by"],
        ["id"],
    )
    op.create_index("ix_projects_workspace_status", "projects", ["workspace_id", "status"])

    op.create_table(
        "api_tokens",
        sa.Column("id", uuid_type, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("workspace_id", uuid_type, sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("user_id", uuid_type, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("token_prefix", sa.String(32), nullable=False),
        sa.Column("token_hash", sa.String(128), nullable=False, unique=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="active"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_api_tokens_workspace_user", "api_tokens", ["workspace_id", "user_id"])
    op.create_index("ix_api_tokens_workspace_status", "api_tokens", ["workspace_id", "status"])
    op.create_index("ix_api_tokens_prefix", "api_tokens", ["token_prefix"])

    op.create_table(
        "audit_events",
        sa.Column("id", uuid_type, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("workspace_id", uuid_type, sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("actor_type", sa.String(50), nullable=False),
        sa.Column("actor_id", sa.String(120), nullable=False),
        sa.Column("action", sa.String(160), nullable=False),
        sa.Column("resource_type", sa.String(80), nullable=False),
        sa.Column("resource_id", sa.String(120), nullable=False),
        sa.Column("ip_address", sa.String(64), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column("before", json_type, nullable=True),
        sa.Column("after", json_type, nullable=True),
        sa.Column("metadata", json_type, nullable=False, server_default=sa.text("'{}'")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        "ix_audit_events_workspace_created",
        "audit_events",
        ["workspace_id", "created_at"],
    )
    op.create_index(
        "ix_audit_events_workspace_action_created",
        "audit_events",
        ["workspace_id", "action", "created_at"],
    )
    op.create_index(
        "ix_audit_events_resource_created",
        "audit_events",
        ["resource_type", "resource_id", "created_at"],
    )

    op.create_table(
        "secrets",
        sa.Column("id", uuid_type, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("workspace_id", uuid_type, sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("secret_type", sa.String(80), nullable=False),
        sa.Column("ciphertext", sa.Text(), nullable=False),
        sa.Column("key_id", sa.String(120), nullable=False, server_default="local-fernet"),
        sa.Column("created_by", uuid_type, sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_secrets_workspace_name_active",
        "secrets",
        ["workspace_id", "name"],
        unique=True,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )
    op.create_index("ix_secrets_workspace_type", "secrets", ["workspace_id", "secret_type"])

    op.create_table(
        "provider_profiles",
        sa.Column("id", uuid_type, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("workspace_id", uuid_type, sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("provider_type", sa.String(80), nullable=False),
        sa.Column("base_url", sa.Text(), nullable=True),
        sa.Column("credential_secret_id", uuid_type, sa.ForeignKey("secrets.id"), nullable=True),
        sa.Column("agent_models", json_type, nullable=False, server_default=sa.text("'{}'")),
        sa.Column("options", json_type, nullable=False, server_default=sa.text("'{}'")),
        sa.Column("budgets", json_type, nullable=False, server_default=sa.text("'{}'")),
        sa.Column("status", sa.String(50), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_provider_profiles_workspace_name_active",
        "provider_profiles",
        ["workspace_id", "name"],
        unique=True,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )
    op.create_index(
        "ix_provider_profiles_workspace_type",
        "provider_profiles",
        ["workspace_id", "provider_type"],
    )
    op.create_index(
        "ix_provider_profiles_workspace_status",
        "provider_profiles",
        ["workspace_id", "status"],
    )

    op.create_table(
        "policies",
        sa.Column("id", uuid_type, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("workspace_id", uuid_type, sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("rules", json_type, nullable=False, server_default=sa.text("'{}'")),
        sa.Column("status", sa.String(50), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_policies_workspace_name_active",
        "policies",
        ["workspace_id", "name"],
        unique=True,
        postgresql_where=sa.text("deleted_at IS NULL"),
    )
    op.create_index("ix_policies_workspace_status", "policies", ["workspace_id", "status"])

    op.create_table(
        "targets",
        sa.Column("id", uuid_type, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("workspace_id", uuid_type, sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("project_id", uuid_type, sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("type", sa.String(50), nullable=False),
        sa.Column("value", sa.Text(), nullable=False),
        sa.Column("label", sa.String(255), nullable=True),
        sa.Column("metadata", json_type, nullable=False, server_default=sa.text("'{}'")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_targets_workspace_project_type",
        "targets",
        ["workspace_id", "project_id", "type"],
    )
    op.create_index("ix_targets_workspace_value", "targets", ["workspace_id", "value"])

    op.create_foreign_key(
        "fk_sessions_provider_profile_id_provider_profiles",
        "sessions",
        "provider_profiles",
        ["provider_profile_id"],
        ["id"],
    )
    op.create_foreign_key(
        "fk_sessions_policy_id_policies",
        "sessions",
        "policies",
        ["policy_id"],
        ["id"],
    )

    _seed_default_roles()


def downgrade() -> None:
    op.drop_constraint("fk_sessions_policy_id_policies", "sessions", type_="foreignkey")
    op.drop_constraint(
        "fk_sessions_provider_profile_id_provider_profiles",
        "sessions",
        type_="foreignkey",
    )

    op.drop_index("ix_targets_workspace_value", table_name="targets")
    op.drop_index("ix_targets_workspace_project_type", table_name="targets")
    op.drop_table("targets")

    op.drop_index("ix_policies_workspace_status", table_name="policies")
    op.drop_index("ix_policies_workspace_name_active", table_name="policies")
    op.drop_table("policies")

    op.drop_index("ix_provider_profiles_workspace_status", table_name="provider_profiles")
    op.drop_index("ix_provider_profiles_workspace_type", table_name="provider_profiles")
    op.drop_index("ix_provider_profiles_workspace_name_active", table_name="provider_profiles")
    op.drop_table("provider_profiles")

    op.drop_index("ix_secrets_workspace_type", table_name="secrets")
    op.drop_index("ix_secrets_workspace_name_active", table_name="secrets")
    op.drop_table("secrets")

    op.drop_index("ix_audit_events_resource_created", table_name="audit_events")
    op.drop_index("ix_audit_events_workspace_action_created", table_name="audit_events")
    op.drop_index("ix_audit_events_workspace_created", table_name="audit_events")
    op.drop_table("audit_events")

    op.drop_index("ix_api_tokens_prefix", table_name="api_tokens")
    op.drop_index("ix_api_tokens_workspace_status", table_name="api_tokens")
    op.drop_index("ix_api_tokens_workspace_user", table_name="api_tokens")
    op.drop_table("api_tokens")

    op.drop_index("ix_projects_workspace_status", table_name="projects")
    op.drop_constraint("fk_projects_created_by_users", "projects", type_="foreignkey")
    op.drop_column("projects", "created_by")
    op.drop_column("projects", "status")
