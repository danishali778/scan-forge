from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.api.dependencies import UserServiceDep
from app.auth.dependencies import AuthContextDep, CsrfDep, require_permission
from app.domain.pagination import Page
from app.schemas.workspace import UserCreateRequest, UserResponse, UserUpdateRequest

router = APIRouter()

UsersReadDep = Annotated[None, Depends(require_permission("users.read"))]
UsersInviteDep = Annotated[None, Depends(require_permission("users.invite"))]
UsersManageDep = Annotated[None, Depends(require_permission("users.manage"))]


@router.get("", response_model=Page[UserResponse])
def list_users(
    service: UserServiceDep,
    auth: AuthContextDep,
    _permission: UsersReadDep,
) -> Page[UserResponse]:
    return service.list_users(auth=auth)


@router.post("", status_code=status.HTTP_201_CREATED, response_model=UserResponse)
def create_user(
    request: UserCreateRequest,
    service: UserServiceDep,
    auth: AuthContextDep,
    _permission: UsersInviteDep,
    _: CsrfDep,
) -> UserResponse:
    return service.create_user(request, auth=auth)


@router.patch("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: str,
    request: UserUpdateRequest,
    service: UserServiceDep,
    auth: AuthContextDep,
    _permission: UsersManageDep,
    _: CsrfDep,
) -> UserResponse:
    return service.update_user(user_id=user_id, request=request, auth=auth)
