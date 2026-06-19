import uuid

from app.domain.exceptions import NotFoundError
from app.models.session import SessionModel
from app.repositories.projects import ProjectRepository
from app.repositories.sessions import SessionRepository


def ensure_project_scope_access(
    repository: ProjectRepository,
    *,
    workspace_id: uuid.UUID,
    project_id: uuid.UUID,
    scope_id: uuid.UUID,
) -> None:
    project = repository.get_project(workspace_id=workspace_id, project_id=project_id)
    if project is None:
        raise NotFoundError("Project not found.")

    scope = repository.get_scope(
        workspace_id=workspace_id,
        project_id=project_id,
        scope_id=scope_id,
    )
    if scope is None:
        raise NotFoundError("Scope not found.")


def get_session_or_raise(
    repository: SessionRepository,
    *,
    workspace_id: uuid.UUID,
    session_id: uuid.UUID,
) -> SessionModel:
    session = repository.get_session(workspace_id=workspace_id, session_id=session_id)
    if session is None:
        raise NotFoundError("Session not found.")
    return session
