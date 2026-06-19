import pytest
from starlette.websockets import WebSocketDisconnect

from .conftest import login
from .test_projects_sessions import _create_project_scope_session


def test_websocket_rejects_unauthenticated_user(client):
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect("/ws/v1/sessions/00000000-0000-0000-0000-000000000000"):
            pass


def test_websocket_accepts_authorized_session_and_replays_events(client):
    assert login(client).status_code == 200
    _, _, session = _create_project_scope_session(client)

    with client.websocket_connect(f"/ws/v1/sessions/{session['id']}") as websocket:
        event = websocket.receive_json()
        ready = websocket.receive_json()

    assert event["type"] == "session.event"
    assert event["event_type"] == "session.created"
    assert ready["type"] == "connection.ready"
