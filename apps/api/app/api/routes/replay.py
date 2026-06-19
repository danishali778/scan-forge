from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.api.dependencies import ReplayServiceDep
from app.auth.dependencies import AuthContextDep, CsrfDep, require_permission
from app.schemas.replay import SessionReplayExportResponse, SessionReplayResponse

router = APIRouter()

ReplayReadDep = Annotated[None, Depends(require_permission("session_replay.read"))]
ReplayExportDep = Annotated[None, Depends(require_permission("session_replay.export"))]


@router.get("/sessions/{session_id}/replay", response_model=SessionReplayResponse)
def get_session_replay(
    session_id: str,
    service: ReplayServiceDep,
    auth: AuthContextDep,
    _permission: ReplayReadDep,
    from_event_id: int | None = Query(default=None, ge=1),
    to_event_id: int | None = Query(default=None, ge=1),
    event_type: str | None = Query(default=None),
    limit: int | None = Query(default=None, ge=1),
) -> SessionReplayResponse:
    return service.get_replay(
        session_id=session_id,
        auth=auth,
        from_event_id=from_event_id,
        to_event_id=to_event_id,
        event_type=event_type,
        limit=limit,
    )


@router.post("/sessions/{session_id}/replay/export", response_model=SessionReplayExportResponse)
def export_session_replay(
    session_id: str,
    service: ReplayServiceDep,
    auth: AuthContextDep,
    _permission: ReplayExportDep,
    _: CsrfDep,
    from_event_id: int | None = Query(default=None, ge=1),
    to_event_id: int | None = Query(default=None, ge=1),
    event_type: str | None = Query(default=None),
    limit: int | None = Query(default=None, ge=1),
) -> SessionReplayExportResponse:
    return service.export_replay(
        session_id=session_id,
        auth=auth,
        from_event_id=from_event_id,
        to_event_id=to_event_id,
        event_type=event_type,
        limit=limit,
    )

