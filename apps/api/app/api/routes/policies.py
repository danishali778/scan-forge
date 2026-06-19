from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.api.dependencies import PolicyServiceDep
from app.auth.dependencies import AuthContextDep, CsrfDep, require_permission
from app.domain.pagination import Page
from app.schemas.policies import PolicyCreateRequest, PolicyResponse, PolicyUpdateRequest

router = APIRouter()

PoliciesReadDep = Annotated[None, Depends(require_permission("policies.read"))]
PoliciesManageDep = Annotated[None, Depends(require_permission("policies.manage"))]


@router.get("", response_model=Page[PolicyResponse])
def list_policies(
    service: PolicyServiceDep,
    auth: AuthContextDep,
    _permission: PoliciesReadDep,
) -> Page[PolicyResponse]:
    return service.list_policies(auth=auth)


@router.post("", status_code=status.HTTP_201_CREATED, response_model=PolicyResponse)
def create_policy(
    request: PolicyCreateRequest,
    service: PolicyServiceDep,
    auth: AuthContextDep,
    _permission: PoliciesManageDep,
    _: CsrfDep,
) -> PolicyResponse:
    return service.create_policy(request, auth=auth)


@router.get("/{policy_id}", response_model=PolicyResponse)
def get_policy(
    policy_id: str,
    service: PolicyServiceDep,
    auth: AuthContextDep,
    _permission: PoliciesReadDep,
) -> PolicyResponse:
    return service.get_policy(policy_id=policy_id, auth=auth)


@router.patch("/{policy_id}", response_model=PolicyResponse)
def update_policy(
    policy_id: str,
    request: PolicyUpdateRequest,
    service: PolicyServiceDep,
    auth: AuthContextDep,
    _permission: PoliciesManageDep,
    _: CsrfDep,
) -> PolicyResponse:
    return service.update_policy(policy_id=policy_id, request=request, auth=auth)


@router.delete("/{policy_id}", response_model=PolicyResponse)
def delete_policy(
    policy_id: str,
    service: PolicyServiceDep,
    auth: AuthContextDep,
    _permission: PoliciesManageDep,
    _: CsrfDep,
) -> PolicyResponse:
    return service.delete_policy(policy_id=policy_id, auth=auth)
