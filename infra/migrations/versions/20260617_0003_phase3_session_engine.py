"""phase3 session engine

Revision ID: 20260617_0003
Revises: 20260617_0002
Create Date: 2026-06-17 00:00:00
"""

import sqlalchemy as sa
from alembic import op

revision = "20260617_0003"
down_revision = "20260617_0002"
branch_labels = None
depends_on = None

PHASE3_ROLE_PERMISSIONS = {
    "Owner": [
        "jobs.read",
        "sessions.archive",
        "sessions.pause",
        "sessions.resume",
        "sessions.start",
        "sessions.stop",
        "tasks.read",
    ],
    "Admin": [
        "jobs.read",
        "sessions.archive",
        "sessions.pause",
        "sessions.resume",
        "sessions.start",
        "sessions.stop",
        "tasks.read",
    ],
    "Operator": [
        "jobs.read",
        "sessions.archive",
        "sessions.pause",
        "sessions.resume",
        "sessions.start",
        "sessions.stop",
        "tasks.read",
    ],
    "Reviewer": ["tasks.read"],
    "Viewer": ["tasks.read"],
}


def _json_type():
    return sa.JSON()


def _uuid_type():
    return sa.UUID()


def _seed_phase3_permissions() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return

    for role_name, permissions in PHASE3_ROLE_PERMISSIONS.items():
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
        "tasks",
        sa.Column("id", uuid_type, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("workspace_id", uuid_type, sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("session_id", uuid_type, sa.ForeignKey("sessions.id"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="created"),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("result_summary", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_tasks_session_position", "tasks", ["session_id", "position"])
    op.create_index("ix_tasks_workspace_status", "tasks", ["workspace_id", "status"])

    op.create_table(
        "steps",
        sa.Column("id", uuid_type, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("workspace_id", uuid_type, sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("session_id", uuid_type, sa.ForeignKey("sessions.id"), nullable=False),
        sa.Column("task_id", uuid_type, sa.ForeignKey("tasks.id"), nullable=False),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("status", sa.String(50), nullable=False, server_default="created"),
        sa.Column("agent_role", sa.String(80), nullable=True),
        sa.Column("position", sa.Integer(), nullable=False),
        sa.Column("input", sa.Text(), nullable=True),
        sa.Column("result", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_steps_task_position", "steps", ["task_id", "position"])
    op.create_index("ix_steps_session_status", "steps", ["session_id", "status"])

    op.create_table(
        "jobs",
        sa.Column("id", uuid_type, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("workspace_id", uuid_type, sa.ForeignKey("workspaces.id"), nullable=False),
        sa.Column("session_id", uuid_type, sa.ForeignKey("sessions.id"), nullable=True),
        sa.Column("type", sa.String(120), nullable=False),
        sa.Column("status", sa.String(50), nullable=False, server_default="queued"),
        sa.Column("payload", json_type, nullable=False, server_default=sa.text("'{}'")),
        sa.Column("celery_task_id", sa.String(255), nullable=True),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("max_attempts", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("progress", json_type, nullable=True),
        sa.Column("result", json_type, nullable=True),
        sa.Column("locked_by", sa.String(255), nullable=True),
        sa.Column("locked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("run_after", sa.DateTime(timezone=True), nullable=False),
        sa.Column("last_error", sa.Text(), nullable=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_index("ix_jobs_status_run_after", "jobs", ["status", "run_after"])
    op.create_index("ix_jobs_session_created", "jobs", ["session_id", "created_at"])
    op.create_index("ix_jobs_celery_task_id", "jobs", ["celery_task_id"])

    _seed_phase3_permissions()


def downgrade() -> None:
    op.drop_index("ix_jobs_celery_task_id", table_name="jobs")
    op.drop_index("ix_jobs_session_created", table_name="jobs")
    op.drop_index("ix_jobs_status_run_after", table_name="jobs")
    op.drop_table("jobs")

    op.drop_index("ix_steps_session_status", table_name="steps")
    op.drop_index("ix_steps_task_position", table_name="steps")
    op.drop_table("steps")

    op.drop_index("ix_tasks_workspace_status", table_name="tasks")
    op.drop_index("ix_tasks_session_position", table_name="tasks")
    op.drop_table("tasks")
