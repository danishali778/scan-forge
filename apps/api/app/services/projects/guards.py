import uuid

from app.domain.exceptions import NotFoundError
from app.models.project import Project
from app.repositories.projects import ProjectRepository


def get_project_or_raise(
    repository: ProjectRepository,
    *,
    workspace_id: uuid.UUID,
    project_id: uuid.UUID,
) -> Project:
    project = repository.get_project(workspace_id=workspace_id, project_id=project_id)
    if project is None:
        raise NotFoundError("Project not found.")
    return project
