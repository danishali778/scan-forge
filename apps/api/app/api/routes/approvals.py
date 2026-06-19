from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.api.dependencies import ApprovalServiceDep
from app.auth.dependencies import AuthContextDep, CsrfDep, require_permission
from app.domain.pagination import Page
from app.schemas.agents import ApprovalResolveRequest, ApprovalResponse

router = APIRouter()

ApprovalsReadDep = Annotated[None, Depends(require_permission("approvals.read"))]
ApprovalsResolveDep = Annotated[None, Depends(require_permission("approvals.resolve"))]


@router.get("", response_model=Page[ApprovalResponse])
def list_approvals(
    service: ApprovalServiceDep,
    auth: AuthContextDep,
    _permission: ApprovalsReadDep,
    status: str | None = Query(default=None),
) -> Page[ApprovalResponse]:
    return service.list_approvals(auth=auth, status=status)


@router.get("/{approval_id}", response_model=ApprovalResponse)
def get_approval(
    approval_id: str,
    service: ApprovalServiceDep,
    auth: AuthContextDep,
    _permission: ApprovalsReadDep,
) -> ApprovalResponse:
    return service.get_approval(approval_id=approval_id, auth=auth)


@router.post("/{approval_id}/approve", response_model=ApprovalResponse)
def approve_request(
    approval_id: str,
    request: ApprovalResolveRequest,
    service: ApprovalServiceDep,
    auth: AuthContextDep,
    _permission: ApprovalsResolveDep,
    _: CsrfDep,
) -> ApprovalResponse:
    return service.approve(approval_id=approval_id, request=request, auth=auth)


@router.post("/{approval_id}/deny", response_model=ApprovalResponse)
def deny_request(
    approval_id: str,
    request: ApprovalResolveRequest,
    service: ApprovalServiceDep,
    auth: AuthContextDep,
    _permission: ApprovalsResolveDep,
    _: CsrfDep,
) -> ApprovalResponse:
    return service.deny(approval_id=approval_id, request=request, auth=auth)
