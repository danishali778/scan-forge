from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.api.dependencies import TargetServiceDep
from app.auth.dependencies import AuthContextDep, CsrfDep, require_permission
from app.domain.pagination import Page
from app.schemas.targets import TargetCreateRequest, TargetResponse, TargetUpdateRequest

router = APIRouter()

TargetsReadDep = Annotated[None, Depends(require_permission("targets.read"))]
TargetsCreateDep = Annotated[None, Depends(require_permission("targets.create"))]
TargetsUpdateDep = Annotated[None, Depends(require_permission("targets.update"))]
TargetsDeleteDep = Annotated[None, Depends(require_permission("targets.delete"))]


@router.get("/projects/{project_id}/targets", response_model=Page[TargetResponse])
def list_targets(
    project_id: str,
    service: TargetServiceDep,
    auth: AuthContextDep,
    _permission: TargetsReadDep,
) -> Page[TargetResponse]:
    return service.list_targets(project_id=project_id, auth=auth)


@router.post(
    "/projects/{project_id}/targets",
    status_code=status.HTTP_201_CREATED,
    response_model=TargetResponse,
)
def create_target(
    project_id: str,
    request: TargetCreateRequest,
    service: TargetServiceDep,
    auth: AuthContextDep,
    _permission: TargetsCreateDep,
    _: CsrfDep,
) -> TargetResponse:
    return service.create_target(project_id=project_id, request=request, auth=auth)


@router.get("/targets/{target_id}", response_model=TargetResponse)
def get_target(
    target_id: str,
    service: TargetServiceDep,
    auth: AuthContextDep,
    _permission: TargetsReadDep,
) -> TargetResponse:
    return service.get_target(target_id=target_id, auth=auth)


@router.patch("/targets/{target_id}", response_model=TargetResponse)
def update_target(
    target_id: str,
    request: TargetUpdateRequest,
    service: TargetServiceDep,
    auth: AuthContextDep,
    _permission: TargetsUpdateDep,
    _: CsrfDep,
) -> TargetResponse:
    return service.update_target(target_id=target_id, request=request, auth=auth)


@router.delete("/targets/{target_id}", response_model=TargetResponse)
def delete_target(
    target_id: str,
    service: TargetServiceDep,
    auth: AuthContextDep,
    _permission: TargetsDeleteDep,
    _: CsrfDep,
) -> TargetResponse:
    return service.delete_target(target_id=target_id, auth=auth)
