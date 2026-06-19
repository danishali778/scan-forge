import uuid

from sqlalchemy.orm import Session

from app.auth.dependencies import AuthContext
from app.domain.exceptions import ConflictError, NotFoundError
from app.domain.ids import parse_uuid
from app.domain.pagination import Page
from app.repositories.control_plane import AuditRepository, UserRepository, WorkspaceRepository
from app.schemas.workspace import UserCreateRequest, UserResponse, UserUpdateRequest
from app.services.audit import AuditRecorder


class UserService:
    def __init__(
        self,
        *,
        db: Session,
        user_repository: UserRepository,
        workspace_repository: WorkspaceRepository,
        audit_repository: AuditRepository,
    ) -> None:
        self.db = db
        self.users = user_repository
        self.workspaces = workspace_repository
        self.audit = AuditRecorder(audit_repository)

    def list_users(self, *, auth: AuthContext) -> Page[UserResponse]:
        users = self.users.list_users(workspace_id=uuid.UUID(auth.workspace_id))
        return Page(items=[self._response(user) for user in users])

    def create_user(self, request: UserCreateRequest, *, auth: AuthContext) -> UserResponse:
        workspace_id = uuid.UUID(auth.workspace_id)
        email = str(request.email).lower()
        role_id = parse_uuid(request.role_id, field_name="role_id")
        role = self.workspaces.get_role(workspace_id=workspace_id, role_id=role_id)
        if role is None:
            raise NotFoundError("Role was not found.")
        if self.users.get_user_by_email(workspace_id=workspace_id, email=email) is not None:
            raise ConflictError("A user with this email already exists.")

        user = self.users.create_invited_user(
            workspace_id=workspace_id,
            email=email,
            name=request.name,
            role_id=role.id,
        )
        self.audit.record(
            auth=auth,
            action="user.invited",
            resource_type="user",
            resource_id=str(user.id),
            after={"email": user.email, "status": user.status, "role_id": str(user.role_id)},
        )
        self.db.commit()
        return self._response(user)

    def update_user(
        self,
        *,
        user_id: str,
        request: UserUpdateRequest,
        auth: AuthContext,
    ) -> UserResponse:
        workspace_id = uuid.UUID(auth.workspace_id)
        user_uuid = parse_uuid(user_id, field_name="user_id")
        user = self.users.get_user(workspace_id=workspace_id, user_id=user_uuid)
        if user is None:
            raise NotFoundError("User was not found.")

        role_id = parse_uuid(request.role_id, field_name="role_id") if request.role_id else None
        if role_id is not None:
            role = self.workspaces.get_role(workspace_id=workspace_id, role_id=role_id)
            if role is None:
                raise NotFoundError("Role was not found.")

        before = {
            "name": user.name,
            "role_id": str(user.role_id),
            "status": user.status,
        }
        user = self.users.update_user(
            user,
            name=request.name,
            role_id=role_id,
            status=request.status,
        )
        after = {
            "name": user.name,
            "role_id": str(user.role_id),
            "status": user.status,
        }
        self.audit.record(
            auth=auth,
            action="user.updated",
            resource_type="user",
            resource_id=str(user.id),
            before=before,
            after=after,
        )
        self.db.commit()
        return self._response(user)

    @staticmethod
    def _response(user) -> UserResponse:
        return UserResponse(
            id=str(user.id),
            email=user.email,
            name=user.name,
            status=user.status,
            role_id=str(user.role_id),
            role=user.role.name,
            supabase_linked=user.supabase_user_id is not None,
        )
