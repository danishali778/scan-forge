from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.api.dependencies import ReviewServiceDep
from app.auth.dependencies import AuthContextDep, CsrfDep, require_permission
from app.domain.pagination import Page
from app.schemas.review import (
    EvidenceCreateRequest,
    EvidenceFromFileRequest,
    EvidenceFromToolCallRequest,
    EvidenceResponse,
    EvidenceUpdateRequest,
    FileAssetContentResponse,
    FileAssetResponse,
)

router = APIRouter()

FileAssetsReadDep = Annotated[None, Depends(require_permission("file_assets.read"))]
EvidenceReadDep = Annotated[None, Depends(require_permission("evidence.read"))]
EvidenceCreateDep = Annotated[None, Depends(require_permission("evidence.create"))]
EvidenceUpdateDep = Annotated[None, Depends(require_permission("evidence.update"))]
EvidenceDeleteDep = Annotated[None, Depends(require_permission("evidence.delete"))]


@router.get("/file-assets/{asset_id}", response_model=FileAssetResponse)
def get_file_asset(
    asset_id: str,
    service: ReviewServiceDep,
    auth: AuthContextDep,
    _permission: FileAssetsReadDep,
) -> FileAssetResponse:
    return service.get_file_asset(asset_id=asset_id, auth=auth)


@router.get("/file-assets/{asset_id}/content", response_model=FileAssetContentResponse)
def get_file_asset_content(
    asset_id: str,
    service: ReviewServiceDep,
    auth: AuthContextDep,
    _permission: FileAssetsReadDep,
) -> FileAssetContentResponse:
    return service.get_file_asset_content(asset_id=asset_id, auth=auth)


@router.get("/sessions/{session_id}/evidence", response_model=Page[EvidenceResponse])
def list_session_evidence(
    session_id: str,
    service: ReviewServiceDep,
    auth: AuthContextDep,
    _permission: EvidenceReadDep,
) -> Page[EvidenceResponse]:
    return service.list_evidence(session_id=session_id, auth=auth)


@router.post(
    "/sessions/{session_id}/evidence",
    status_code=status.HTTP_201_CREATED,
    response_model=EvidenceResponse,
)
def create_evidence(
    session_id: str,
    request: EvidenceCreateRequest,
    service: ReviewServiceDep,
    auth: AuthContextDep,
    _permission: EvidenceCreateDep,
    _: CsrfDep,
) -> EvidenceResponse:
    return service.create_evidence(request, session_id=session_id, auth=auth)


@router.post(
    "/sessions/{session_id}/evidence/from-tool-call",
    status_code=status.HTTP_201_CREATED,
    response_model=EvidenceResponse,
)
def create_evidence_from_tool_call(
    session_id: str,
    request: EvidenceFromToolCallRequest,
    service: ReviewServiceDep,
    auth: AuthContextDep,
    _permission: EvidenceCreateDep,
    _: CsrfDep,
) -> EvidenceResponse:
    return service.create_evidence_from_tool_call(request, session_id=session_id, auth=auth)


@router.post(
    "/sessions/{session_id}/evidence/from-file",
    status_code=status.HTTP_201_CREATED,
    response_model=EvidenceResponse,
)
def create_evidence_from_file(
    session_id: str,
    request: EvidenceFromFileRequest,
    service: ReviewServiceDep,
    auth: AuthContextDep,
    _permission: EvidenceCreateDep,
    _: CsrfDep,
) -> EvidenceResponse:
    return service.create_evidence_from_file(request, session_id=session_id, auth=auth)


@router.get("/evidence/{evidence_id}", response_model=EvidenceResponse)
def get_evidence(
    evidence_id: str,
    service: ReviewServiceDep,
    auth: AuthContextDep,
    _permission: EvidenceReadDep,
) -> EvidenceResponse:
    return service.get_evidence(evidence_id=evidence_id, auth=auth)


@router.patch("/evidence/{evidence_id}", response_model=EvidenceResponse)
def update_evidence(
    evidence_id: str,
    request: EvidenceUpdateRequest,
    service: ReviewServiceDep,
    auth: AuthContextDep,
    _permission: EvidenceUpdateDep,
    _: CsrfDep,
) -> EvidenceResponse:
    return service.update_evidence(evidence_id=evidence_id, request=request, auth=auth)


@router.delete("/evidence/{evidence_id}", response_model=EvidenceResponse)
def delete_evidence(
    evidence_id: str,
    service: ReviewServiceDep,
    auth: AuthContextDep,
    _permission: EvidenceDeleteDep,
    _: CsrfDep,
) -> EvidenceResponse:
    return service.delete_evidence(evidence_id=evidence_id, auth=auth)
