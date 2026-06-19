from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from app.api.dependencies import ReviewServiceDep
from app.auth.dependencies import AuthContextDep, CsrfDep, require_permission
from app.domain.pagination import Page
from app.schemas.review import (
    ReportCreateRequest,
    ReportExportResponse,
    ReportResponse,
    ReportUpdateRequest,
)
from app.schemas.sessions import JobResponse

router = APIRouter()

ReportsReadDep = Annotated[None, Depends(require_permission("reports.read"))]
ReportsCreateDep = Annotated[None, Depends(require_permission("reports.create"))]
ReportsUpdateDep = Annotated[None, Depends(require_permission("reports.update"))]
ReportsFinalizeDep = Annotated[None, Depends(require_permission("reports.finalize"))]
ReportsExportDep = Annotated[None, Depends(require_permission("reports.export"))]
ReportsDeleteDep = Annotated[None, Depends(require_permission("reports.delete"))]


@router.get("/sessions/{session_id}/reports", response_model=Page[ReportResponse])
def list_session_reports(
    session_id: str,
    service: ReviewServiceDep,
    auth: AuthContextDep,
    _permission: ReportsReadDep,
) -> Page[ReportResponse]:
    return service.list_reports(session_id=session_id, auth=auth)


@router.post(
    "/sessions/{session_id}/reports",
    status_code=status.HTTP_201_CREATED,
    response_model=ReportResponse,
)
def create_report(
    session_id: str,
    request: ReportCreateRequest,
    service: ReviewServiceDep,
    auth: AuthContextDep,
    _permission: ReportsCreateDep,
    _: CsrfDep,
) -> ReportResponse:
    return service.create_report(request, session_id=session_id, auth=auth)


@router.get("/reports/{report_id}", response_model=ReportResponse)
def get_report(
    report_id: str,
    service: ReviewServiceDep,
    auth: AuthContextDep,
    _permission: ReportsReadDep,
) -> ReportResponse:
    return service.get_report(report_id=report_id, auth=auth)


@router.patch("/reports/{report_id}", response_model=ReportResponse)
def update_report(
    report_id: str,
    request: ReportUpdateRequest,
    service: ReviewServiceDep,
    auth: AuthContextDep,
    _permission: ReportsUpdateDep,
    _: CsrfDep,
) -> ReportResponse:
    return service.update_report(report_id=report_id, request=request, auth=auth)


@router.delete("/reports/{report_id}", response_model=ReportResponse)
def delete_report(
    report_id: str,
    service: ReviewServiceDep,
    auth: AuthContextDep,
    _permission: ReportsDeleteDep,
    _: CsrfDep,
) -> ReportResponse:
    return service.delete_report(report_id=report_id, auth=auth)


@router.post("/reports/{report_id}/render", response_model=JobResponse)
def render_report(
    report_id: str,
    service: ReviewServiceDep,
    auth: AuthContextDep,
    _permission: ReportsCreateDep,
    _: CsrfDep,
) -> JobResponse:
    return service.render_report(report_id=report_id, auth=auth)


@router.post("/reports/{report_id}/finalize", response_model=ReportResponse)
def finalize_report(
    report_id: str,
    service: ReviewServiceDep,
    auth: AuthContextDep,
    _permission: ReportsFinalizeDep,
    _: CsrfDep,
) -> ReportResponse:
    return service.finalize_report(report_id=report_id, auth=auth)


@router.get("/reports/{report_id}/export", response_model=ReportExportResponse)
def export_report(
    report_id: str,
    service: ReviewServiceDep,
    auth: AuthContextDep,
    _permission: ReportsExportDep,
    export_format: str = Query(default="markdown", alias="format"),
) -> ReportExportResponse:
    return service.export_report(
        report_id=report_id,
        export_format=export_format,
        auth=auth,
    )
