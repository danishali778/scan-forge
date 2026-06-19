from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.api.dependencies import ProviderProfileServiceDep
from app.auth.dependencies import AuthContextDep, CsrfDep, require_permission
from app.domain.pagination import Page
from app.schemas.provider_profiles import (
    ProviderProfileCreateRequest,
    ProviderProfileResponse,
    ProviderProfileUpdateRequest,
)

router = APIRouter()

ProviderProfilesReadDep = Annotated[None, Depends(require_permission("provider_profiles.read"))]
ProviderProfilesManageDep = Annotated[
    None,
    Depends(require_permission("provider_profiles.manage")),
]


@router.get("", response_model=Page[ProviderProfileResponse])
def list_provider_profiles(
    service: ProviderProfileServiceDep,
    auth: AuthContextDep,
    _permission: ProviderProfilesReadDep,
) -> Page[ProviderProfileResponse]:
    return service.list_profiles(auth=auth)


@router.post("", status_code=status.HTTP_201_CREATED, response_model=ProviderProfileResponse)
def create_provider_profile(
    request: ProviderProfileCreateRequest,
    service: ProviderProfileServiceDep,
    auth: AuthContextDep,
    _permission: ProviderProfilesManageDep,
    _: CsrfDep,
) -> ProviderProfileResponse:
    return service.create_profile(request, auth=auth)


@router.get("/{profile_id}", response_model=ProviderProfileResponse)
def get_provider_profile(
    profile_id: str,
    service: ProviderProfileServiceDep,
    auth: AuthContextDep,
    _permission: ProviderProfilesReadDep,
) -> ProviderProfileResponse:
    return service.get_profile(profile_id=profile_id, auth=auth)


@router.patch("/{profile_id}", response_model=ProviderProfileResponse)
def update_provider_profile(
    profile_id: str,
    request: ProviderProfileUpdateRequest,
    service: ProviderProfileServiceDep,
    auth: AuthContextDep,
    _permission: ProviderProfilesManageDep,
    _: CsrfDep,
) -> ProviderProfileResponse:
    return service.update_profile(profile_id=profile_id, request=request, auth=auth)


@router.delete("/{profile_id}", response_model=ProviderProfileResponse)
def delete_provider_profile(
    profile_id: str,
    service: ProviderProfileServiceDep,
    auth: AuthContextDep,
    _permission: ProviderProfilesManageDep,
    _: CsrfDep,
) -> ProviderProfileResponse:
    return service.delete_profile(profile_id=profile_id, auth=auth)
