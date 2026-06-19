"""phase4 sandbox runtime

Revision ID: 20260618_0004
Revises: 20260617_0003
Create Date: 2026-06-18 00:00:00
"""

import sqlalchemy as sa
from alembic import op

revision = "20260618_0004"
down_revision = "20260617_0003"
branch_labels = None
depends_on = None

PHASE4_ROLE_PERMISSIONS = {
    "Owner": [
        "files.read",
        "files.write",
        "runtime_instances.manage",
        "runtime_instances.read",
        "tool_calls.execute",
        "tool_calls.read",
    ],
    "Admin": [
        "files.read",
        "files.write",
        "runtime_instances.manage",
        "runtime_instances.read",
        "tool_calls.execute",
        "tool_calls.read",
    ],
    "Operator": [
        "files.read",
        "files.write",
        "runtime_instances.manage",
        "runtime_instances.read",
        "tool_calls.execute",
        "tool_calls.read",
    ],
    "Reviewer": [
        "runtime_instances.read",
        "tool_calls.read",
    ],
    "Viewer": [
        "runtime_instances.read",
        "tool_calls.read",
    ],
}


def _json_type():
    return sa.JSON()


def _uuid_type():
    return sa.UUID()


def _seed_phase4_permissions() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    for role_name, permissions in PHASE4_ROLE_PERMISSIONS.items():
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

    op.create_table(
        "runtime_instances",
        sa.Column("id", uuid_type, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("workspace_id", uuid_type, sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("session_id", uuid_type, sa.ForeignKey("sessions.id"), nullable=False),
        sa.Column("runtime_type", sa.String(50), nullable=False, server_default="docker"),
        sa.Column("status", sa.String(50), nullable=False, server_default="starting"),
        sa.Column("image", sa.String(255), nullable=False),
        sa.Column("external_id", sa.String(255), nullable=True),
        sa.Column("workspace_path", sa.String(255), nullable=False, server_default="/workspace"),
        sa.Column("ports", json_type, nullable=False, server_default=sa.text("'{}'")),
        sa.Column("resource_limits", json_type, nullable=False, server_default=sa.text("'{}'")),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("stopped_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        "ix_runtime_instances_session_status",
        "runtime_instances",
        ["session_id", "status"],
    )
    op.create_index(
        "ix_runtime_instances_workspace_status",
        "runtime_instances",
        ["workspace_id", "status"],
    )
    op.create_index(
        "ix_runtime_instances_external_id",
        "runtime_instances",
        ["external_id"],
    )

    op.create_table(
        "tool_calls",
        sa.Column("id", uuid_type, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("workspace_id", uuid_type, sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("session_id", uuid_type, sa.ForeignKey("sessions.id"), nullable=False),
        sa.Column("task_id", uuid_type, sa.ForeignKey("tasks.id"), nullable=True),
        sa.Column("step_id", uuid_type, sa.ForeignKey("steps.id"), nullable=True),
        sa.Column(
            "runtime_instance_id",
            uuid_type,
            sa.ForeignKey("runtime_instances.id"),
            nullable=True,
        ),
        sa.Column("tool_name", sa.String(120), nullable=False),
        sa.Column("tool_version", sa.String(80), nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="queued"),
        sa.Column("arguments", json_type, nullable=False, server_default=sa.text("'{}'")),
        sa.Column("result", json_type, nullable=True),
        sa.Column("raw_output", sa.Text(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("policy_decision", json_type, nullable=False, server_default=sa.text("'{}'")),
        sa.Column("runtime_command_id", sa.String(120), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_tool_calls_session_created", "tool_calls", ["session_id", "created_at"])
    op.create_index("ix_tool_calls_session_status", "tool_calls", ["session_id", "status"])
    op.create_index("ix_tool_calls_runtime_instance", "tool_calls", ["runtime_instance_id"])
    op.create_index("ix_tool_calls_tool_name_created", "tool_calls", ["tool_name", "created_at"])

    _seed_phase4_permissions()


def downgrade() -> None:
    op.drop_index("ix_tool_calls_tool_name_created", table_name="tool_calls")
    op.drop_index("ix_tool_calls_runtime_instance", table_name="tool_calls")
    op.drop_index("ix_tool_calls_session_status", table_name="tool_calls")
    op.drop_index("ix_tool_calls_session_created", table_name="tool_calls")
    op.drop_table("tool_calls")

    op.drop_index("ix_runtime_instances_external_id", table_name="runtime_instances")
    op.drop_index("ix_runtime_instances_workspace_status", table_name="runtime_instances")
    op.drop_index("ix_runtime_instances_session_status", table_name="runtime_instances")
    op.drop_table("runtime_instances")
