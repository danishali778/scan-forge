import asyncio

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.auth.dependencies import build_auth_context_from_session_token
from app.core.config import get_settings
from app.db.session import get_session_factory
from app.domain.exceptions import AuthenticationError, NotFoundError
from app.domain.ids import parse_uuid
from app.repositories.sessions import SessionRepository

websocket_router = APIRouter()


@websocket_router.websocket("/sessions/{session_id}")
async def session_events(websocket: WebSocket, session_id: str) -> None:
    settings = get_settings()
    session_token = websocket.cookies.get(settings.session_cookie_name)
    db = get_session_factory()()
    try:
        auth = build_auth_context_from_session_token(db, session_token)
        session_uuid = parse_uuid(session_id, field_name="session_id")
        repository = SessionRepository(db)
        session = repository.get_session(
            workspace_id=parse_uuid(auth.workspace_id, field_name="workspace_id"),
            session_id=session_uuid,
        )
        if session is None:
            raise NotFoundError("Session not found.")
    except AuthenticationError:
        await websocket.close(code=4401)
        db.close()
        return
    except NotFoundError:
        await websocket.close(code=4404)
        db.close()
        return

    await websocket.accept()
    last_event_id = await _replay_events(websocket, repository, auth.workspace_id, session_id)
    await websocket.send_json(
        {
            "type": "connection.ready",
            "session_id": session_id,
            "message": "WebSocket scaffold is connected.",
        }
    )

    try:
        while True:
            receive_task = asyncio.create_task(websocket.receive_json())
            done, pending = await asyncio.wait({receive_task}, timeout=1.0)
            if receive_task in done:
                message = receive_task.result()
                await websocket.send_json(
                    {
                        "type": "command.ack",
                        "request_id": message.get("request_id"),
                        "status": "accepted",
                        "note": "Realtime commands are read-only in Phase 3.",
                    }
                )
            else:
                receive_task.cancel()

            last_event_id = await _send_new_events(
                websocket,
                repository,
                auth.workspace_id,
                session_id,
                after_id=last_event_id,
            )
    except WebSocketDisconnect:
        return
    finally:
        db.close()


async def _replay_events(
    websocket: WebSocket,
    repository: SessionRepository,
    workspace_id: str,
    session_id: str,
) -> int | None:
    last_event_id_raw = websocket.query_params.get("last_event_id")
    last_event_id = (
        int(last_event_id_raw) if last_event_id_raw and last_event_id_raw.isdigit() else None
    )
    events = repository.list_events(
        workspace_id=parse_uuid(workspace_id, field_name="workspace_id"),
        session_id=parse_uuid(session_id, field_name="session_id"),
        after_id=last_event_id,
    )
    return await _send_events(websocket, events, last_event_id)


async def _send_new_events(
    websocket: WebSocket,
    repository: SessionRepository,
    workspace_id: str,
    session_id: str,
    *,
    after_id: int | None,
) -> int | None:
    events = repository.list_events(
        workspace_id=parse_uuid(workspace_id, field_name="workspace_id"),
        session_id=parse_uuid(session_id, field_name="session_id"),
        after_id=after_id,
    )
    return await _send_events(websocket, events, after_id)


async def _send_events(websocket: WebSocket, events, last_event_id: int | None) -> int | None:
    newest_event_id = last_event_id
    for event in events:
        await websocket.send_json(
            {
                "type": "session.event",
                "event_id": str(event.id),
                "session_id": str(event.session_id),
                "event_type": event.event_type,
                "created_at": event.created_at.isoformat(),
                "payload": event.payload,
            }
        )
        newest_event_id = event.id
    return newest_event_id
