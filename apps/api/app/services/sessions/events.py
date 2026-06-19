import uuid

from app.models.session import SessionModel
from app.repositories.sessions import SessionRepository


def emit_session_created(
    repository: SessionRepository,
    *,
    workspace_id: uuid.UUID,
    session: SessionModel,
    actor_id: str,
) -> None:
    repository.create_event(
        workspace_id=workspace_id,
        session_id=session.id,
        event_type="session.created",
        payload={
            "session_id": str(session.id),
            "title": session.title,
            "status": session.status,
        },
        actor_type="user",
        actor_id=actor_id,
    )
