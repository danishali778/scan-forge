from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.api.dependencies import MemoryServiceDep
from app.auth.dependencies import AuthContextDep, CsrfDep, require_permission
from app.domain.pagination import Page
from app.schemas.memory import (
    MemoryCandidateRequest,
    MemoryCreateRequest,
    MemoryDocumentResponse,
    MemoryPromoteRequest,
    MemoryReviewRequest,
    MemorySearchRequest,
    MemorySearchResponse,
    MemoryUpdateRequest,
)
from app.schemas.sessions import JobResponse

router = APIRouter()

MemoryReadDep = Annotated[None, Depends(require_permission("memory.read"))]
MemorySearchDep = Annotated[None, Depends(require_permission("memory.search"))]
MemoryCreateDep = Annotated[None, Depends(require_permission("memory.create"))]
MemoryUpdateDep = Annotated[None, Depends(require_permission("memory.update"))]
MemoryReviewDep = Annotated[None, Depends(require_permission("memory.review"))]
MemoryPromoteDep = Annotated[None, Depends(require_permission("memory.promote"))]
MemoryDeleteDep = Annotated[None, Depends(require_permission("memory.delete"))]


@router.get("/memory", response_model=Page[MemoryDocumentResponse])
def list_memory(
    service: MemoryServiceDep,
    auth: AuthContextDep,
    _permission: MemoryReadDep,
    status: str | None = None,
    visibility: str | None = None,
) -> Page[MemoryDocumentResponse]:
    return service.list_documents(auth=auth, status=status, visibility=visibility)


@router.post(
    "/memory",
    status_code=status.HTTP_201_CREATED,
    response_model=MemoryDocumentResponse,
)
def create_memory(
    request: MemoryCreateRequest,
    service: MemoryServiceDep,
    auth: AuthContextDep,
    _permission: MemoryCreateDep,
    _: CsrfDep,
) -> MemoryDocumentResponse:
    return service.create_document(request, auth=auth)


@router.post("/memory/search", response_model=MemorySearchResponse)
def search_memory(
    request: MemorySearchRequest,
    service: MemoryServiceDep,
    auth: AuthContextDep,
    _permission: MemorySearchDep,
) -> MemorySearchResponse:
    return service.search(request, auth=auth)


@router.get("/memory/{document_id}", response_model=MemoryDocumentResponse)
def get_memory(
    document_id: str,
    service: MemoryServiceDep,
    auth: AuthContextDep,
    _permission: MemoryReadDep,
) -> MemoryDocumentResponse:
    return service.get_document(document_id=document_id, auth=auth)


@router.patch("/memory/{document_id}", response_model=MemoryDocumentResponse)
def update_memory(
    document_id: str,
    request: MemoryUpdateRequest,
    service: MemoryServiceDep,
    auth: AuthContextDep,
    _permission: MemoryUpdateDep,
    _: CsrfDep,
) -> MemoryDocumentResponse:
    return service.update_document(document_id=document_id, request=request, auth=auth)


@router.delete("/memory/{document_id}", response_model=MemoryDocumentResponse)
def delete_memory(
    document_id: str,
    service: MemoryServiceDep,
    auth: AuthContextDep,
    _permission: MemoryDeleteDep,
    _: CsrfDep,
) -> MemoryDocumentResponse:
    return service.delete_document(document_id=document_id, auth=auth)


@router.post("/memory/{document_id}/approve", response_model=JobResponse)
def approve_memory(
    document_id: str,
    request: MemoryReviewRequest,
    service: MemoryServiceDep,
    auth: AuthContextDep,
    _permission: MemoryReviewDep,
    _: CsrfDep,
) -> JobResponse:
    return service.approve_document(document_id=document_id, request=request, auth=auth)


@router.post("/memory/{document_id}/reject", response_model=MemoryDocumentResponse)
def reject_memory(
    document_id: str,
    request: MemoryReviewRequest,
    service: MemoryServiceDep,
    auth: AuthContextDep,
    _permission: MemoryReviewDep,
    _: CsrfDep,
) -> MemoryDocumentResponse:
    return service.reject_document(document_id=document_id, request=request, auth=auth)


@router.post("/memory/{document_id}/promote", response_model=MemoryDocumentResponse)
def promote_memory(
    document_id: str,
    request: MemoryPromoteRequest,
    service: MemoryServiceDep,
    auth: AuthContextDep,
    _permission: MemoryPromoteDep,
    _: CsrfDep,
) -> MemoryDocumentResponse:
    return service.promote_document(document_id=document_id, request=request, auth=auth)


@router.post(
    "/evidence/{evidence_id}/memory-candidate",
    status_code=status.HTTP_201_CREATED,
    response_model=MemoryDocumentResponse,
)
def create_memory_from_evidence(
    evidence_id: str,
    request: MemoryCandidateRequest,
    service: MemoryServiceDep,
    auth: AuthContextDep,
    _permission: MemoryCreateDep,
    _: CsrfDep,
) -> MemoryDocumentResponse:
    return service.create_from_evidence(evidence_id=evidence_id, request=request, auth=auth)


@router.post(
    "/findings/{finding_id}/memory-candidate",
    status_code=status.HTTP_201_CREATED,
    response_model=MemoryDocumentResponse,
)
def create_memory_from_finding(
    finding_id: str,
    request: MemoryCandidateRequest,
    service: MemoryServiceDep,
    auth: AuthContextDep,
    _permission: MemoryCreateDep,
    _: CsrfDep,
) -> MemoryDocumentResponse:
    return service.create_from_finding(finding_id=finding_id, request=request, auth=auth)
