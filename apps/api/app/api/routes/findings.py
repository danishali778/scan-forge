from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.api.dependencies import ReviewServiceDep
from app.auth.dependencies import AuthContextDep, CsrfDep, require_permission
from app.domain.pagination import Page
from app.schemas.review import (
    CandidateFindingRequest,
    FindingCreateRequest,
    FindingEvidenceAttachRequest,
    FindingResponse,
    FindingReviewRequest,
    FindingUpdateRequest,
)
from app.schemas.sessions import JobResponse

router = APIRouter()

FindingsReadDep = Annotated[None, Depends(require_permission("findings.read"))]
FindingsCreateDep = Annotated[None, Depends(require_permission("findings.create"))]
FindingsUpdateDep = Annotated[None, Depends(require_permission("findings.update"))]
FindingsReviewDep = Annotated[None, Depends(require_permission("findings.review"))]
FindingsDeleteDep = Annotated[None, Depends(require_permission("findings.delete"))]


@router.get("/sessions/{session_id}/findings", response_model=Page[FindingResponse])
def list_session_findings(
    session_id: str,
    service: ReviewServiceDep,
    auth: AuthContextDep,
    _permission: FindingsReadDep,
) -> Page[FindingResponse]:
    return service.list_findings(session_id=session_id, auth=auth)


@router.post(
    "/sessions/{session_id}/findings",
    status_code=status.HTTP_201_CREATED,
    response_model=FindingResponse,
)
def create_finding(
    session_id: str,
    request: FindingCreateRequest,
    service: ReviewServiceDep,
    auth: AuthContextDep,
    _permission: FindingsCreateDep,
    _: CsrfDep,
) -> FindingResponse:
    return service.create_finding(request, session_id=session_id, auth=auth)


@router.post("/evidence/{evidence_id}/candidate-finding", response_model=JobResponse)
def propose_candidate_finding(
    evidence_id: str,
    request: CandidateFindingRequest,
    service: ReviewServiceDep,
    auth: AuthContextDep,
    _permission: FindingsCreateDep,
    _: CsrfDep,
) -> JobResponse:
    return service.create_candidate_finding_job(
        evidence_id=evidence_id,
        request=request,
        auth=auth,
    )


@router.get("/findings/{finding_id}", response_model=FindingResponse)
def get_finding(
    finding_id: str,
    service: ReviewServiceDep,
    auth: AuthContextDep,
    _permission: FindingsReadDep,
) -> FindingResponse:
    return service.get_finding(finding_id=finding_id, auth=auth)


@router.patch("/findings/{finding_id}", response_model=FindingResponse)
def update_finding(
    finding_id: str,
    request: FindingUpdateRequest,
    service: ReviewServiceDep,
    auth: AuthContextDep,
    _permission: FindingsUpdateDep,
    _: CsrfDep,
) -> FindingResponse:
    return service.update_finding(finding_id=finding_id, request=request, auth=auth)


@router.delete("/findings/{finding_id}", response_model=FindingResponse)
def delete_finding(
    finding_id: str,
    service: ReviewServiceDep,
    auth: AuthContextDep,
    _permission: FindingsDeleteDep,
    _: CsrfDep,
) -> FindingResponse:
    return service.delete_finding(finding_id=finding_id, auth=auth)


@router.post("/findings/{finding_id}/review", response_model=FindingResponse)
def review_finding(
    finding_id: str,
    request: FindingReviewRequest,
    service: ReviewServiceDep,
    auth: AuthContextDep,
    _permission: FindingsReviewDep,
    _: CsrfDep,
) -> FindingResponse:
    return service.review_finding(finding_id=finding_id, request=request, auth=auth)


@router.post("/findings/{finding_id}/evidence", response_model=FindingResponse)
def attach_finding_evidence(
    finding_id: str,
    request: FindingEvidenceAttachRequest,
    service: ReviewServiceDep,
    auth: AuthContextDep,
    _permission: FindingsUpdateDep,
    _: CsrfDep,
) -> FindingResponse:
    return service.attach_finding_evidence(
        finding_id=finding_id,
        request=request,
        auth=auth,
    )


@router.delete("/findings/{finding_id}/evidence/{evidence_id}", response_model=FindingResponse)
def detach_finding_evidence(
    finding_id: str,
    evidence_id: str,
    service: ReviewServiceDep,
    auth: AuthContextDep,
    _permission: FindingsUpdateDep,
    _: CsrfDep,
) -> FindingResponse:
    return service.detach_finding_evidence(
        finding_id=finding_id,
        evidence_id=evidence_id,
        auth=auth,
    )
