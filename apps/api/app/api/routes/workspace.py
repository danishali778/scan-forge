from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.dependencies import WorkspaceServiceDep
from app.auth.dependencies import AuthContextDep, CsrfDep, require_permission
from app.domain.pagination import Page
from app.schemas.workspace import RoleResponse, WorkspaceResponse, WorkspaceUpdateRequest

router = APIRouter()

WorkspaceReadDep = Annotated[None, Depends(require_permission("workspaces.read"))]
WorkspaceManageDep = Annotated[None, Depends(require_permission("workspaces.manage"))]
RolesReadDep = Annotated[None, Depends(require_permission("roles.read"))]


@router.get("/workspace", response_model=WorkspaceResponse)
def get_workspace(
    service: WorkspaceServiceDep,
    auth: AuthContextDep,
    _permission: WorkspaceReadDep,
) -> WorkspaceResponse:
    return service.get_workspace(auth=auth)


@router.patch("/workspace", response_model=WorkspaceResponse)
def update_workspace(
    request: WorkspaceUpdateRequest,
    service: WorkspaceServiceDep,
    auth: AuthContextDep,
    _permission: WorkspaceManageDep,
    _: CsrfDep,
) -> WorkspaceResponse:
    return service.update_workspace(request, auth=auth)


@router.get("/roles", response_model=Page[RoleResponse])
def list_roles(
    service: WorkspaceServiceDep,
    auth: AuthContextDep,
    _permission: RolesReadDep,
) -> Page[RoleResponse]:
    return service.list_roles(auth=auth)
