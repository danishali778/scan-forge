from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.api.dependencies import AuditEventServiceDep
from app.auth.dependencies import AuthContextDep, require_permission
from app.domain.pagination import Page
from app.schemas.audit import AuditEventResponse

router = APIRouter()

AuditEventsReadDep = Annotated[None, Depends(require_permission("audit_events.read"))]


@router.get("", response_model=Page[AuditEventResponse])
def list_audit_events(
    service: AuditEventServiceDep,
    auth: AuthContextDep,
    _permission: AuditEventsReadDep,
    action: str | None = Query(default=None),
    resource_type: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
) -> Page[AuditEventResponse]:
    return service.list_events(
        auth=auth,
        action=action,
        resource_type=resource_type,
        limit=limit,
    )
