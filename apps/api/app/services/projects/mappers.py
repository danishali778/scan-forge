from app.models.project import Project, Scope
from app.schemas.projects import ProjectResponse, ScopeResponse


def project_response(project: Project) -> ProjectResponse:
    return ProjectResponse(
        id=str(project.id),
        name=project.name,
        description=project.description,
        status=project.status,
        created_by=str(project.created_by) if project.created_by else None,
        metadata=project.metadata_json,
    )


def scope_response(scope: Scope) -> ScopeResponse:
    return ScopeResponse(
        id=str(scope.id),
        project_id=str(scope.project_id),
        name=scope.name,
        description=scope.description,
        rules=scope.rules,
    )
