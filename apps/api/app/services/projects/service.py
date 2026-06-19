import uuid

from sqlalchemy.orm import Session

from app.auth.dependencies import AuthContext
from app.domain.ids import parse_uuid
from app.domain.pagination import Page
from app.repositories.control_plane import AuditRepository
from app.repositories.projects import ProjectRepository
from app.schemas.projects import (
    ProjectCreateRequest,
    ProjectResponse,
    ScopeCreateRequest,
    ScopeResponse,
)
from app.services.audit import AuditRecorder
from app.services.projects.guards import get_project_or_raise
from app.services.projects.mappers import project_response, scope_response


class ProjectService:
    def __init__(
        self,
        *,
        db: Session,
        repository: ProjectRepository,
        audit_repository: AuditRepository,
    ) -> None:
        self.db = db
        self.repository = repository
        self.audit = AuditRecorder(audit_repository)

    def list_projects(self, *, auth: AuthContext) -> Page[ProjectResponse]:
        projects = self.repository.list_projects(workspace_id=uuid.UUID(auth.workspace_id))
        return Page(items=[project_response(project) for project in projects])

    def create_project(
        self,
        request: ProjectCreateRequest,
        *,
        auth: AuthContext,
    ) -> ProjectResponse:
        project = self.repository.create_project(
            workspace_id=uuid.UUID(auth.workspace_id),
            name=request.name,
            description=request.description,
            metadata=request.metadata,
            created_by=uuid.UUID(auth.user_id),
        )
        self.audit.record(
            auth=auth,
            action="project.created",
            resource_type="project",
            resource_id=str(project.id),
            after={
                "name": project.name,
                "description": project.description,
                "metadata": project.metadata_json,
            },
        )
        self.db.commit()
        return project_response(project)

    def list_scopes(self, *, project_id: str, auth: AuthContext) -> Page[ScopeResponse]:
        workspace_id = uuid.UUID(auth.workspace_id)
        project_uuid = parse_uuid(project_id, field_name="project_id")
        get_project_or_raise(
            self.repository,
            workspace_id=workspace_id,
            project_id=project_uuid,
        )
        scopes = self.repository.list_scopes(workspace_id=workspace_id, project_id=project_uuid)
        return Page(items=[scope_response(scope) for scope in scopes])

    def create_scope(
        self,
        *,
        project_id: str,
        request: ScopeCreateRequest,
        auth: AuthContext,
    ) -> ScopeResponse:
        workspace_id = uuid.UUID(auth.workspace_id)
        project_uuid = parse_uuid(project_id, field_name="project_id")
        get_project_or_raise(
            self.repository,
            workspace_id=workspace_id,
            project_id=project_uuid,
        )
        scope = self.repository.create_scope(
            workspace_id=workspace_id,
            project_id=project_uuid,
            name=request.name,
            description=request.description,
            rules=request.rules,
        )
        self.audit.record(
            auth=auth,
            action="scope.created",
            resource_type="scope",
            resource_id=str(scope.id),
            after={
                "project_id": str(scope.project_id),
                "name": scope.name,
                "description": scope.description,
                "rules": scope.rules,
            },
        )
        self.db.commit()
        return scope_response(scope)
