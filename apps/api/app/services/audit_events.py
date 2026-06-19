import uuid

from sqlalchemy.orm import Session

from app.auth.dependencies import AuthContext
from app.domain.pagination import Page
from app.repositories.control_plane import AuditRepository
from app.schemas.audit import AuditEventResponse


class AuditEventService:
    def __init__(self, *, db: Session, repository: AuditRepository) -> None:
        self.db = db
        self.repository = repository

    def list_events(
        self,
        *,
        auth: AuthContext,
        action: str | None = None,
        resource_type: str | None = None,
        limit: int = 50,
    ) -> Page[AuditEventResponse]:
        events = self.repository.list_events(
            workspace_id=uuid.UUID(auth.workspace_id),
            action=action,
            resource_type=resource_type,
            limit=min(limit, 200),
        )
        return Page(
            items=[
                AuditEventResponse(
                    id=str(event.id),
                    actor_type=event.actor_type,
                    actor_id=event.actor_id,
                    action=event.action,
                    resource_type=event.resource_type,
                    resource_id=event.resource_id,
                    before=event.before_json,
                    after=event.after_json,
                    metadata=event.metadata_json,
                    created_at=event.created_at,
                )
                for event in events
            ]
        )
