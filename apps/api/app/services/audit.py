import uuid

from app.auth.dependencies import AuthContext
from app.repositories.control_plane import AuditRepository


class AuditRecorder:
    def __init__(self, repository: AuditRepository) -> None:
        self.repository = repository

    def record(
        self,
        *,
        auth: AuthContext,
        action: str,
        resource_type: str,
        resource_id: str,
        before: dict[str, object] | None = None,
        after: dict[str, object] | None = None,
        metadata: dict[str, object] | None = None,
    ) -> None:
        actor_id = auth.api_token_id if auth.actor_type == "api_token" else auth.user_id
        audit_metadata = dict(metadata or {})
        if auth.actor_type == "api_token":
            audit_metadata["user_id"] = auth.user_id

        self.repository.create_event(
            workspace_id=uuid.UUID(auth.workspace_id),
            actor_type=auth.actor_type,
            actor_id=actor_id or auth.user_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            before=before,
            after=after,
            metadata=audit_metadata,
        )
