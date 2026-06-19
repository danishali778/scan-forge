"""phase6 evidence and reporting

Revision ID: 20260618_0006
Revises: 20260618_0005
Create Date: 2026-06-18 00:00:00
"""

import sqlalchemy as sa
from alembic import op

revision = "20260618_0006"
down_revision = "20260618_0005"
branch_labels = None
depends_on = None

PHASE6_ROLE_PERMISSIONS = {
    "Owner": [
        "file_assets.read",
        "evidence.read",
        "evidence.create",
        "evidence.update",
        "evidence.delete",
        "findings.read",
        "findings.create",
        "findings.update",
        "findings.review",
        "findings.delete",
        "reports.read",
        "reports.create",
        "reports.update",
        "reports.finalize",
        "reports.export",
        "reports.delete",
    ],
    "Admin": [
        "file_assets.read",
        "evidence.read",
        "evidence.create",
        "evidence.update",
        "evidence.delete",
        "findings.read",
        "findings.create",
        "findings.update",
        "findings.review",
        "findings.delete",
        "reports.read",
        "reports.create",
        "reports.update",
        "reports.finalize",
        "reports.export",
        "reports.delete",
    ],
    "Operator": [
        "file_assets.read",
        "evidence.read",
        "evidence.create",
        "evidence.update",
        "findings.read",
        "findings.create",
        "findings.update",
        "reports.read",
        "reports.create",
        "reports.update",
        "reports.export",
    ],
    "Reviewer": [
        "file_assets.read",
        "evidence.read",
        "findings.read",
        "findings.review",
        "reports.read",
        "reports.finalize",
        "reports.export",
    ],
    "Viewer": [
        "file_assets.read",
        "evidence.read",
        "findings.read",
        "reports.read",
    ],
}


def _uuid_type():
    return sa.UUID()


def _json_type():
    return sa.JSON()


def _seed_phase6_permissions() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    for role_name, permissions in PHASE6_ROLE_PERMISSIONS.items():
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
        "file_assets",
        sa.Column("id", uuid_type, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("workspace_id", uuid_type, sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("storage_backend", sa.String(50), nullable=False),
        sa.Column("storage_key", sa.String(1024), nullable=False),
        sa.Column("filename", sa.String(255), nullable=False),
        sa.Column("mime_type", sa.String(255), nullable=True),
        sa.Column("size_bytes", sa.BigInteger(), nullable=False),
        sa.Column("sha256", sa.String(64), nullable=False),
        sa.Column("metadata", json_type, nullable=False, server_default=sa.text("'{}'")),
        sa.Column("created_by", uuid_type, sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_file_assets_workspace_sha256", "file_assets", ["workspace_id", "sha256"])
    op.create_index(
        "ix_file_assets_workspace_created",
        "file_assets",
        ["workspace_id", "created_at"],
    )

    op.create_table(
        "evidence",
        sa.Column("id", uuid_type, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("workspace_id", uuid_type, sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("project_id", uuid_type, sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("session_id", uuid_type, sa.ForeignKey("sessions.id"), nullable=False),
        sa.Column("task_id", uuid_type, sa.ForeignKey("tasks.id"), nullable=True),
        sa.Column("step_id", uuid_type, sa.ForeignKey("steps.id"), nullable=True),
        sa.Column("tool_call_id", uuid_type, sa.ForeignKey("tool_calls.id"), nullable=True),
        sa.Column("type", sa.String(50), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("asset_id", uuid_type, sa.ForeignKey("file_assets.id"), nullable=True),
        sa.Column("metadata", json_type, nullable=False, server_default=sa.text("'{}'")),
        sa.Column(
            "created_by_agent",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_evidence_session_created", "evidence", ["session_id", "created_at"])
    op.create_index("ix_evidence_session_type", "evidence", ["session_id", "type"])
    op.create_index("ix_evidence_tool_call", "evidence", ["tool_call_id"])

    op.create_table(
        "findings",
        sa.Column("id", uuid_type, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("workspace_id", uuid_type, sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("project_id", uuid_type, sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("session_id", uuid_type, sa.ForeignKey("sessions.id"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="candidate"),
        sa.Column("severity", sa.String(50), nullable=False),
        sa.Column("confidence", sa.String(50), nullable=False),
        sa.Column("affected_assets", json_type, nullable=False, server_default=sa.text("'{}'")),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("impact", sa.Text(), nullable=False),
        sa.Column("reproduction_steps", sa.Text(), nullable=False),
        sa.Column("remediation", sa.Text(), nullable=False),
        sa.Column("references", json_type, nullable=False, server_default=sa.text("'{}'")),
        sa.Column(
            "created_by_agent",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column("reviewed_by", uuid_type, sa.ForeignKey("users.id"), nullable=True),
        sa.Column("review_note", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_findings_session_severity", "findings", ["session_id", "severity"])
    op.create_index("ix_findings_project_status", "findings", ["project_id", "status"])
    op.create_index("ix_findings_workspace_created", "findings", ["workspace_id", "created_at"])

    op.create_table(
        "finding_evidence",
        sa.Column("finding_id", uuid_type, sa.ForeignKey("findings.id"), primary_key=True),
        sa.Column("evidence_id", uuid_type, sa.ForeignKey("evidence.id"), primary_key=True),
        sa.Column("relationship", sa.String(50), nullable=False, server_default="supporting"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    )

    op.create_table(
        "reports",
        sa.Column("id", uuid_type, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("workspace_id", uuid_type, sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("project_id", uuid_type, sa.ForeignKey("projects.id"), nullable=False),
        sa.Column("session_id", uuid_type, sa.ForeignKey("sessions.id"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="draft"),
        sa.Column("format", sa.String(50), nullable=False, server_default="web"),
        sa.Column("content", json_type, nullable=False, server_default=sa.text("'{}'")),
        sa.Column("asset_id", uuid_type, sa.ForeignKey("file_assets.id"), nullable=True),
        sa.Column("created_by", uuid_type, sa.ForeignKey("users.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_reports_session_created", "reports", ["session_id", "created_at"])
    op.create_index("ix_reports_workspace_status", "reports", ["workspace_id", "status"])

    _seed_phase6_permissions()


def downgrade() -> None:
    op.drop_index("ix_reports_workspace_status", table_name="reports")
    op.drop_index("ix_reports_session_created", table_name="reports")
    op.drop_table("reports")

    op.drop_table("finding_evidence")

    op.drop_index("ix_findings_workspace_created", table_name="findings")
    op.drop_index("ix_findings_project_status", table_name="findings")
    op.drop_index("ix_findings_session_severity", table_name="findings")
    op.drop_table("findings")

    op.drop_index("ix_evidence_tool_call", table_name="evidence")
    op.drop_index("ix_evidence_session_type", table_name="evidence")
    op.drop_index("ix_evidence_session_created", table_name="evidence")
    op.drop_table("evidence")

    op.drop_index("ix_file_assets_workspace_created", table_name="file_assets")
    op.drop_index("ix_file_assets_workspace_sha256", table_name="file_assets")
    op.drop_table("file_assets")
