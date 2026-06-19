"""phase8 replay and analytics permissions

Revision ID: 20260619_0008
Revises: 20260618_0007
Create Date: 2026-06-19 00:00:00
"""

import sqlalchemy as sa
from alembic import op

revision = "20260619_0008"
down_revision = "20260618_0007"
branch_labels = None
depends_on = None

PHASE8_ROLE_PERMISSIONS = {
    "Owner": ["session_replay.read", "session_replay.export", "analytics.read"],
    "Admin": ["session_replay.read", "session_replay.export", "analytics.read"],
    "Operator": ["session_replay.read", "session_replay.export", "analytics.read"],
    "Reviewer": ["session_replay.read", "session_replay.export", "analytics.read"],
    "Viewer": ["session_replay.read", "analytics.read"],
}


def _seed_phase8_permissions() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return
    for role_name, permissions in PHASE8_ROLE_PERMISSIONS.items():
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
    _seed_phase8_permissions()


def downgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name != "postgresql":
        return
    permissions = [
        "session_replay.read",
        "session_replay.export",
        "analytics.read",
    ]
    op.execute(
        sa.text(
            """
            delete from role_permissions
            where permission in :permissions
            """
        ).bindparams(sa.bindparam("permissions", permissions, expanding=True))
    )
