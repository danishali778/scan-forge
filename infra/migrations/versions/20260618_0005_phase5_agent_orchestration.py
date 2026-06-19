"""phase5 agent orchestration

Revision ID: 20260618_0005
Revises: 20260618_0004
Create Date: 2026-06-18 00:00:00
"""

import json

import sqlalchemy as sa
from alembic import op

revision = "20260618_0005"
down_revision = "20260618_0004"
branch_labels = None
depends_on = None

PHASE5_ROLE_PERMISSIONS = {
    "Owner": [
        "agents.execute",
        "agents.read",
        "approvals.read",
        "approvals.resolve",
        "tools.read",
    ],
    "Admin": [
        "agents.execute",
        "agents.read",
        "approvals.read",
        "approvals.resolve",
        "tools.read",
    ],
    "Operator": [
        "agents.execute",
        "agents.read",
        "approvals.read",
        "approvals.resolve",
        "tools.read",
    ],
    "Reviewer": ["agents.read", "approvals.read", "tools.read"],
    "Viewer": ["agents.read", "approvals.read", "tools.read"],
}

BUILT_IN_TOOLS = [
    {
        "name": "terminal.execute",
        "version": "1.0.0",
        "description": "Execute an approved command in the session runtime.",
        "category": "runtime",
        "risk_level": "medium",
        "runtime_type": "container",
        "input_schema": {
            "type": "object",
            "required": ["command"],
            "properties": {
                "command": {"type": "array", "items": {"type": "string"}, "minItems": 1},
                "cwd": {"type": "string", "default": "/workspace"},
                "timeout_seconds": {"type": "integer", "minimum": 1},
                "max_output_bytes": {"type": "integer", "minimum": 1},
            },
        },
    },
    {
        "name": "file.list",
        "version": "1.0.0",
        "description": "List files inside the session workspace.",
        "category": "runtime",
        "risk_level": "low",
        "runtime_type": "container",
        "input_schema": {"type": "object", "properties": {"path": {"type": "string"}}},
    },
    {
        "name": "file.read",
        "version": "1.0.0",
        "description": "Read a text file inside the session workspace.",
        "category": "runtime",
        "risk_level": "low",
        "runtime_type": "container",
        "input_schema": {
            "type": "object",
            "required": ["path"],
            "properties": {"path": {"type": "string"}},
        },
    },
    {
        "name": "file.write",
        "version": "1.0.0",
        "description": "Write a text file inside the session workspace.",
        "category": "runtime",
        "risk_level": "medium",
        "runtime_type": "container",
        "input_schema": {
            "type": "object",
            "required": ["path", "content"],
            "properties": {"path": {"type": "string"}, "content": {"type": "string"}},
        },
    },
    {
        "name": "step.complete",
        "version": "1.0.0",
        "description": "Mark the current step complete with a short summary.",
        "category": "session",
        "risk_level": "low",
        "runtime_type": "builtin",
        "input_schema": {
            "type": "object",
            "required": ["summary"],
            "properties": {"summary": {"type": "string"}},
        },
    },
]


def _json_type():
    return sa.JSON()


def _uuid_type():
    return sa.UUID()


def _seed_phase5_permissions() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    for role_name, permissions in PHASE5_ROLE_PERMISSIONS.items():
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


def _seed_tool_definitions() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    for tool in BUILT_IN_TOOLS:
        op.execute(
            sa.text(
                """
                insert into tool_definitions (
                    id, workspace_id, name, version, description, category, risk_level,
                    runtime_type, input_schema, output_schema, enabled,
                    created_at, updated_at, deleted_at
                )
                select
                    gen_random_uuid(), null, :name, :version, :description, :category,
                    :risk_level, :runtime_type, cast(:input_schema as json),
                    cast('{}' as json), true, now(), now(), null
                where not exists (
                    select 1 from tool_definitions
                    where name = :name and version = :version
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
            )
        )


def upgrade() -> None:
    uuid_type = _uuid_type()
    json_type = _json_type()

    op.create_table(
        "agent_messages",
        sa.Column("id", uuid_type, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("workspace_id", uuid_type, sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("session_id", uuid_type, sa.ForeignKey("sessions.id"), nullable=False),
        sa.Column("task_id", uuid_type, sa.ForeignKey("tasks.id"), nullable=True),
        sa.Column("step_id", uuid_type, sa.ForeignKey("steps.id"), nullable=True),
        sa.Column("agent_role", sa.String(80), nullable=False),
        sa.Column("message_type", sa.String(50), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("metadata", json_type, nullable=False, server_default=sa.text("'{}'")),
        sa.Column("token_input", sa.Integer(), nullable=True),
        sa.Column("token_output", sa.Integer(), nullable=True),
        sa.Column("cost_input", sa.Numeric(12, 6), nullable=True),
        sa.Column("cost_output", sa.Numeric(12, 6), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        "ix_agent_messages_session_created",
        "agent_messages",
        ["session_id", "created_at"],
    )
    op.create_index(
        "ix_agent_messages_session_role_created",
        "agent_messages",
        ["session_id", "agent_role", "created_at"],
    )

    op.add_column("tool_calls", sa.Column("agent_message_id", uuid_type, nullable=True))
    op.create_foreign_key(
        "fk_tool_calls_agent_message_id_agent_messages",
        "tool_calls",
        "agent_messages",
        ["agent_message_id"],
        ["id"],
    )

    op.create_table(
        "policy_decisions",
        sa.Column("id", uuid_type, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("workspace_id", uuid_type, sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("session_id", uuid_type, sa.ForeignKey("sessions.id"), nullable=False),
        sa.Column("task_id", uuid_type, sa.ForeignKey("tasks.id"), nullable=True),
        sa.Column("step_id", uuid_type, sa.ForeignKey("steps.id"), nullable=True),
        sa.Column("tool_call_id", uuid_type, sa.ForeignKey("tool_calls.id"), nullable=True),
        sa.Column("action_type", sa.String(80), nullable=False),
        sa.Column("tool_name", sa.String(120), nullable=False),
        sa.Column("decision", sa.String(50), nullable=False),
        sa.Column("risk_level", sa.String(50), nullable=False),
        sa.Column("reasons", json_type, nullable=False, server_default=sa.text("'{}'")),
        sa.Column("matched_rules", json_type, nullable=False, server_default=sa.text("'{}'")),
        sa.Column("constraints", json_type, nullable=False, server_default=sa.text("'{}'")),
        sa.Column("input_summary", json_type, nullable=False, server_default=sa.text("'{}'")),
        sa.Column("actor_type", sa.String(50), nullable=False),
        sa.Column("actor_id", sa.String(120), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index(
        "ix_policy_decisions_session_created",
        "policy_decisions",
        ["session_id", "created_at"],
    )
    op.create_index(
        "ix_policy_decisions_workspace_decision",
        "policy_decisions",
        ["workspace_id", "decision"],
    )
    op.create_index("ix_policy_decisions_tool_call", "policy_decisions", ["tool_call_id"])

    op.create_table(
        "approval_requests",
        sa.Column("id", uuid_type, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("workspace_id", uuid_type, sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("session_id", uuid_type, sa.ForeignKey("sessions.id"), nullable=False),
        sa.Column("task_id", uuid_type, sa.ForeignKey("tasks.id"), nullable=True),
        sa.Column("step_id", uuid_type, sa.ForeignKey("steps.id"), nullable=True),
        sa.Column("tool_call_id", uuid_type, sa.ForeignKey("tool_calls.id"), nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="pending"),
        sa.Column("risk_level", sa.String(50), nullable=False),
        sa.Column("reason", sa.Text(), nullable=False),
        sa.Column("requested_action", json_type, nullable=False, server_default=sa.text("'{}'")),
        sa.Column("requested_by_agent", sa.String(80), nullable=False),
        sa.Column("resolved_by", uuid_type, sa.ForeignKey("users.id"), nullable=True),
        sa.Column("resolution_note", sa.Text(), nullable=True),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_approval_requests_session_status",
        "approval_requests",
        ["session_id", "status"],
    )
    op.create_index(
        "ix_approval_requests_workspace_status_created",
        "approval_requests",
        ["workspace_id", "status", "created_at"],
    )

    op.create_table(
        "tool_definitions",
        sa.Column("id", uuid_type, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("workspace_id", uuid_type, sa.ForeignKey("workspaces.id"), nullable=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("version", sa.String(50), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("category", sa.String(80), nullable=False),
        sa.Column("risk_level", sa.String(50), nullable=False),
        sa.Column("runtime_type", sa.String(80), nullable=False),
        sa.Column("input_schema", json_type, nullable=False, server_default=sa.text("'{}'")),
        sa.Column("output_schema", json_type, nullable=False, server_default=sa.text("'{}'")),
        sa.Column("enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index(
        "ix_tool_definitions_name_version",
        "tool_definitions",
        ["name", "version"],
        unique=True,
    )
    op.create_index(
        "ix_tool_definitions_workspace_enabled",
        "tool_definitions",
        ["workspace_id", "enabled"],
    )

    _seed_tool_definitions()
    _seed_phase5_permissions()


def downgrade() -> None:
    op.drop_index("ix_tool_definitions_workspace_enabled", table_name="tool_definitions")
    op.drop_index("ix_tool_definitions_name_version", table_name="tool_definitions")
    op.drop_table("tool_definitions")

    op.drop_index("ix_approval_requests_workspace_status_created", table_name="approval_requests")
    op.drop_index("ix_approval_requests_session_status", table_name="approval_requests")
    op.drop_table("approval_requests")

    op.drop_index("ix_policy_decisions_tool_call", table_name="policy_decisions")
    op.drop_index("ix_policy_decisions_workspace_decision", table_name="policy_decisions")
    op.drop_index("ix_policy_decisions_session_created", table_name="policy_decisions")
    op.drop_table("policy_decisions")

    op.drop_constraint(
        "fk_tool_calls_agent_message_id_agent_messages",
        "tool_calls",
        type_="foreignkey",
    )
    op.drop_column("tool_calls", "agent_message_id")

    op.drop_index("ix_agent_messages_session_role_created", table_name="agent_messages")
    op.drop_index("ix_agent_messages_session_created", table_name="agent_messages")
    op.drop_table("agent_messages")
