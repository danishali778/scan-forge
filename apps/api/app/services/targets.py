import uuid

from sqlalchemy.orm import Session

from app.auth.dependencies import AuthContext
from app.domain.exceptions import NotFoundError
from app.domain.ids import parse_uuid
from app.domain.pagination import Page
from app.repositories.control_plane import AuditRepository
from app.repositories.projects import ProjectRepository
from app.schemas.targets import TargetCreateRequest, TargetResponse, TargetUpdateRequest
from app.services.audit import AuditRecorder
from app.services.projects.guards import get_project_or_raise


class TargetService:
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

    def list_targets(self, *, project_id: str, auth: AuthContext) -> Page[TargetResponse]:
        workspace_id = uuid.UUID(auth.workspace_id)
        project_uuid = parse_uuid(project_id, field_name="project_id")
        get_project_or_raise(self.repository, workspace_id=workspace_id, project_id=project_uuid)
        targets = self.repository.list_targets(workspace_id=workspace_id, project_id=project_uuid)
        return Page(items=[self._response(target) for target in targets])

    def create_target(
        self,
        *,
        project_id: str,
        request: TargetCreateRequest,
        auth: AuthContext,
    ) -> TargetResponse:
        workspace_id = uuid.UUID(auth.workspace_id)
        project_uuid = parse_uuid(project_id, field_name="project_id")
        get_project_or_raise(self.repository, workspace_id=workspace_id, project_id=project_uuid)

        target = self.repository.create_target(
            workspace_id=workspace_id,
            project_id=project_uuid,
            target_type=request.type,
            value=request.value,
            label=request.label,
            metadata=request.metadata,
        )
        self.audit.record(
            auth=auth,
            action="target.created",
            resource_type="target",
            resource_id=str(target.id),
            after=self._audit_payload(target),
        )
        self.db.commit()
        return self._response(target)

    def get_target(self, *, target_id: str, auth: AuthContext) -> TargetResponse:
        target = self._get_target(target_id=target_id, auth=auth)
        return self._response(target)

    def update_target(
        self,
        *,
        target_id: str,
        request: TargetUpdateRequest,
        auth: AuthContext,
    ) -> TargetResponse:
        target = self._get_target(target_id=target_id, auth=auth)
        before = self._audit_payload(target)
        target = self.repository.update_target(
            target,
            target_type=request.type,
            value=request.value,
            label=request.label,
            metadata=request.metadata,
        )
        self.audit.record(
            auth=auth,
            action="target.updated",
            resource_type="target",
            resource_id=str(target.id),
            before=before,
            after=self._audit_payload(target),
        )
        self.db.commit()
        return self._response(target)

    def delete_target(self, *, target_id: str, auth: AuthContext) -> TargetResponse:
        target = self._get_target(target_id=target_id, auth=auth)
        before = self._audit_payload(target)
        target = self.repository.delete_target(target)
        self.audit.record(
            auth=auth,
            action="target.deleted",
            resource_type="target",
            resource_id=str(target.id),
            before=before,
            after={"deleted": True},
        )
        self.db.commit()
        return self._response(target)

    def _get_target(self, *, target_id: str, auth: AuthContext):
        target_uuid = parse_uuid(target_id, field_name="target_id")
        target = self.repository.get_target(
            workspace_id=uuid.UUID(auth.workspace_id),
            target_id=target_uuid,
        )
        if target is None:
            raise NotFoundError("Target was not found.")
        return target

    @staticmethod
    def _response(target) -> TargetResponse:
        return TargetResponse(
            id=str(target.id),
            workspace_id=str(target.workspace_id),
            project_id=str(target.project_id),
            type=target.type,
            value=target.value,
            label=target.label,
            metadata=target.metadata_json,
        )

    @staticmethod
    def _audit_payload(target) -> dict[str, object]:
        return {
            "project_id": str(target.project_id),
            "type": target.type,
            "value": target.value,
            "label": target.label,
            "metadata": target.metadata_json,
        }
