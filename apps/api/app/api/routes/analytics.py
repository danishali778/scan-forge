from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.api.dependencies import AnalyticsServiceDep
from app.auth.dependencies import AuthContextDep, require_permission
from app.schemas.analytics import (
    AnalyticsApprovalsResponse,
    AnalyticsFindingsResponse,
    AnalyticsOverviewResponse,
    AnalyticsSessionsResponse,
    AnalyticsToolsResponse,
)

router = APIRouter()

AnalyticsReadDep = Annotated[None, Depends(require_permission("analytics.read"))]


@router.get("/overview", response_model=AnalyticsOverviewResponse)
def get_analytics_overview(
    service: AnalyticsServiceDep,
    auth: AuthContextDep,
    _permission: AnalyticsReadDep,
    project_id: str | None = Query(default=None),
    from_date: str | None = Query(default=None),
    to_date: str | None = Query(default=None),
) -> AnalyticsOverviewResponse:
    return service.overview(
        auth=auth,
        project_id=project_id,
        from_date=from_date,
        to_date=to_date,
    )


@router.get("/sessions", response_model=AnalyticsSessionsResponse)
def get_session_analytics(
    service: AnalyticsServiceDep,
    auth: AuthContextDep,
    _permission: AnalyticsReadDep,
    project_id: str | None = Query(default=None),
    from_date: str | None = Query(default=None),
    to_date: str | None = Query(default=None),
) -> AnalyticsSessionsResponse:
    return service.sessions(
        auth=auth,
        project_id=project_id,
        from_date=from_date,
        to_date=to_date,
    )


@router.get("/tools", response_model=AnalyticsToolsResponse)
def get_tool_analytics(
    service: AnalyticsServiceDep,
    auth: AuthContextDep,
    _permission: AnalyticsReadDep,
    project_id: str | None = Query(default=None),
    from_date: str | None = Query(default=None),
    to_date: str | None = Query(default=None),
) -> AnalyticsToolsResponse:
    return service.tools(
        auth=auth,
        project_id=project_id,
        from_date=from_date,
        to_date=to_date,
    )


@router.get("/findings", response_model=AnalyticsFindingsResponse)
def get_finding_analytics(
    service: AnalyticsServiceDep,
    auth: AuthContextDep,
    _permission: AnalyticsReadDep,
    project_id: str | None = Query(default=None),
    from_date: str | None = Query(default=None),
    to_date: str | None = Query(default=None),
) -> AnalyticsFindingsResponse:
    return service.findings(
        auth=auth,
        project_id=project_id,
        from_date=from_date,
        to_date=to_date,
    )


@router.get("/approvals", response_model=AnalyticsApprovalsResponse)
def get_approval_analytics(
    service: AnalyticsServiceDep,
    auth: AuthContextDep,
    _permission: AnalyticsReadDep,
    project_id: str | None = Query(default=None),
    from_date: str | None = Query(default=None),
    to_date: str | None = Query(default=None),
) -> AnalyticsApprovalsResponse:
    return service.approvals(
        auth=auth,
        project_id=project_id,
        from_date=from_date,
        to_date=to_date,
    )
