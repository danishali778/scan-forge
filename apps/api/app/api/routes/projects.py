from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.api.dependencies import ProjectServiceDep
from app.auth.dependencies import AuthContextDep, CsrfDep, require_permission
from app.domain.pagination import Page
from app.schemas.projects import (
    ProjectCreateRequest,
    ProjectResponse,
    ScopeCreateRequest,
    ScopeResponse,
)

router = APIRouter()

ProjectsReadDep = Annotated[None, Depends(require_permission("projects.read"))]
ProjectsCreateDep = Annotated[None, Depends(require_permission("projects.create"))]
ScopesReadDep = Annotated[None, Depends(require_permission("scopes.read"))]
ScopesCreateDep = Annotated[None, Depends(require_permission("scopes.create"))]


@router.get("", response_model=Page[ProjectResponse])
def list_projects(
    service: ProjectServiceDep,
    auth: AuthContextDep,
    _permission: ProjectsReadDep,
) -> Page[ProjectResponse]:
    return service.list_projects(auth=auth)


@router.post("", status_code=status.HTTP_201_CREATED, response_model=ProjectResponse)
def create_project(
    request: ProjectCreateRequest,
    service: ProjectServiceDep,
    auth: AuthContextDep,
    _permission: ProjectsCreateDep,
    _: CsrfDep,
) -> ProjectResponse:
    return service.create_project(request, auth=auth)


@router.get("/{project_id}/scopes", response_model=Page[ScopeResponse])
def list_scopes(
    project_id: str,
    service: ProjectServiceDep,
    auth: AuthContextDep,
    _permission: ScopesReadDep,
) -> Page[ScopeResponse]:
    return service.list_scopes(project_id=project_id, auth=auth)


@router.post(
    "/{project_id}/scopes",
    status_code=status.HTTP_201_CREATED,
    response_model=ScopeResponse,
)
def create_scope(
    project_id: str,
    request: ScopeCreateRequest,
    service: ProjectServiceDep,
    auth: AuthContextDep,
    _permission: ScopesCreateDep,
    _: CsrfDep,
) -> ScopeResponse:
    return service.create_scope(project_id=project_id, request=request, auth=auth)
