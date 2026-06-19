import uuid

from sqlalchemy.orm import Session

from app.auth.dependencies import AuthContext
from app.domain.exceptions import NotFoundError
from app.domain.pagination import Page
from app.repositories.control_plane import AuditRepository, WorkspaceRepository
from app.schemas.workspace import (
    RoleResponse,
    WorkspaceResponse,
    WorkspaceUpdateRequest,
)
from app.services.audit import AuditRecorder


class WorkspaceService:
    def __init__(
        self,
        *,
        db: Session,
        repository: WorkspaceRepository,
        audit_repository: AuditRepository,
    ) -> None:
        self.db = db
        self.repository = repository
        self.audit = AuditRecorder(audit_repository)

    def get_workspace(self, *, auth: AuthContext) -> WorkspaceResponse:
        workspace = self.repository.get_workspace(workspace_id=uuid.UUID(auth.workspace_id))
        if workspace is None:
            raise NotFoundError("Workspace was not found.")
        return WorkspaceResponse(
            id=str(workspace.id),
            name=workspace.name,
            slug=workspace.slug,
            settings=workspace.settings,
        )

    def update_workspace(
        self,
        request: WorkspaceUpdateRequest,
        *,
        auth: AuthContext,
    ) -> WorkspaceResponse:
        workspace = self.repository.get_workspace(workspace_id=uuid.UUID(auth.workspace_id))
        if workspace is None:
            raise NotFoundError("Workspace was not found.")

        before = {"name": workspace.name, "settings": workspace.settings}
        workspace = self.repository.update_workspace(
            workspace,
            name=request.name,
            settings=request.settings,
        )
        after = {"name": workspace.name, "settings": workspace.settings}
        self.audit.record(
            auth=auth,
            action="workspace.updated",
            resource_type="workspace",
            resource_id=str(workspace.id),
            before=before,
            after=after,
        )
        self.db.commit()
        return WorkspaceResponse(
            id=str(workspace.id),
            name=workspace.name,
            slug=workspace.slug,
            settings=workspace.settings,
        )

    def list_roles(self, *, auth: AuthContext) -> Page[RoleResponse]:
        roles = self.repository.list_roles(workspace_id=uuid.UUID(auth.workspace_id))
        return Page(
            items=[
                RoleResponse(
                    id=str(role.id),
                    name=role.name,
                    description=role.description,
                    permissions=sorted(permission.permission for permission in role.permissions),
                )
                for role in roles
            ]
        )
