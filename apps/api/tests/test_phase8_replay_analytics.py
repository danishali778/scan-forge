import uuid
from datetime import UTC, datetime, timedelta

from app.core.security import generate_token, hash_token
from app.models.identity import AuthSession, Role, RolePermission, User, Workspace
from app.repositories.sessions import SessionRepository

from .conftest import login
from .test_phase2_control_plane import _create_second_workspace_session
from .test_phase5_agent_orchestration import _start_model_backed_session
from .test_phase6_evidence_reporting import (
    _create_note_evidence,
    _run_agent_to_successful_tool_call,
)


def _csrf(client) -> dict[str, str]:
    return {"X-CSRF-Token": client.cookies.get("app_csrf")}


def _create_sessions_read_workspace_session(db_session_factory) -> tuple[str, str]:
    session_token = generate_token()
    csrf_token = generate_token()
    with db_session_factory() as db:
        workspace = Workspace(name="Limited Workspace", slug=f"limited-{uuid.uuid4()}", settings={})
        db.add(workspace)
        db.flush()
        role = Role(workspace_id=workspace.id, name="Limited", description=None)
        db.add(role)
        db.flush()
        db.add(RolePermission(role_id=role.id, permission="sessions.read"))
        user = User(
            workspace_id=workspace.id,
            supabase_user_id=uuid.uuid4(),
            email="limited@example.com",
            name="Limited",
            type="human",
            status="active",
            role_id=role.id,
        )
        db.add(user)
        db.flush()
        db.add(
            AuthSession(
                workspace_id=workspace.id,
                user_id=user.id,
                session_hash=hash_token(session_token),
                csrf_hash=hash_token(csrf_token),
                status="active",
                expires_at=datetime.now(UTC) + timedelta(hours=1),
                created_at=datetime.now(UTC),
            )
        )
        db.commit()
    return session_token, csrf_token


def _create_reviewed_finding(client, session: dict, evidence: dict) -> dict:
    response = client.post(
        f"/api/v1/sessions/{session['id']}/findings",
        headers=_csrf(client),
        json={
            "title": "Phase 8 reviewed finding",
            "severity": "medium",
            "confidence": "high",
            "affected_assets": ["analytics"],
            "description": "A reviewed finding for aggregate counts.",
            "impact": "It should appear in analytics.",
            "reproduction_steps": "Review linked evidence.",
            "remediation": "No remediation required for the test.",
            "references": [],
            "evidence_ids": [evidence["id"]],
        },
    )
    assert response.status_code == 201
    finding = response.json()
    review = client.post(
        f"/api/v1/findings/{finding['id']}/review",
        headers=_csrf(client),
        json={"status": "confirmed", "review_note": "Confirmed for Phase 8 analytics."},
    )
    assert review.status_code == 200
    return review.json()


def test_phase8_role_permissions_are_available(client):
    assert login(client).status_code == 200

    roles = client.get("/api/v1/roles")
    assert roles.status_code == 200
    by_name = {role["name"]: role for role in roles.json()["items"]}

    assert "session_replay.read" in by_name["Viewer"]["permissions"]
    assert "analytics.read" in by_name["Viewer"]["permissions"]
    assert "session_replay.export" not in by_name["Viewer"]["permissions"]
    assert "session_replay.export" in by_name["Reviewer"]["permissions"]
    assert "analytics.read" in by_name["Operator"]["permissions"]


def test_replay_frames_filter_summary_redact_truncate_and_scope(
    client,
    fake_queue,
    db_session_factory,
):
    assert login(client).status_code == 200
    session = _start_model_backed_session(client, fake_queue, db_session_factory)

    with db_session_factory() as db:
        repository = SessionRepository(db)
        workspace_id = uuid.UUID(client.get("/api/v1/auth/me").json()["workspace_id"])
        session_id = uuid.UUID(session["id"])
        repository.create_event(
            workspace_id=workspace_id,
            session_id=session_id,
            event_type="tool_call.finished",
            payload={
                "tool_call_id": str(uuid.uuid4()),
                "tool_name": "terminal.execute",
                "status": "succeeded",
                "api_key": "sk-test-secret-value",
                "authorization": "Bearer supersecrettokenvalue1234567890",
                "raw_output": "x" * 40_000,
            },
            actor_type="worker",
            actor_id="worker-1",
        )
        db.commit()

    response = client.get(f"/api/v1/sessions/{session['id']}/replay")
    assert response.status_code == 200
    body = response.json()
    event_ids = [frame["event_id"] for frame in body["frames"]]
    assert event_ids == sorted(event_ids)
    assert body["summary"]["task_count"] >= 1
    assert body["summary"]["counts_by_category"]["tool_call"] >= 1

    filtered = client.get(
        f"/api/v1/sessions/{session['id']}/replay",
        params={"event_type": "tool_call.finished", "limit": 1},
    )
    assert filtered.status_code == 200
    frame = filtered.json()["frames"][0]
    assert frame["event_type"] == "tool_call.finished"
    assert frame["resource_type"] == "tool_call"
    assert frame["payload"]["api_key"] == "[REDACTED]"
    assert frame["payload"]["authorization"] == "[REDACTED]"
    assert frame["payload_truncated"] is True
    assert "supersecrettokenvalue" not in str(frame["payload"])

    second_session_token, second_csrf_token = _create_second_workspace_session(db_session_factory)
    client.cookies.set("app_session", second_session_token)
    client.cookies.set("app_csrf", second_csrf_token)
    isolated = client.get(f"/api/v1/sessions/{session['id']}/replay")
    assert isolated.status_code == 404


def test_replay_export_csrf_api_token_audit_and_viewer_permissions(
    client,
    fake_supabase,
    fake_queue,
    db_session_factory,
):
    assert login(client).status_code == 200
    session = _start_model_backed_session(client, fake_queue, db_session_factory)

    no_csrf = client.post(f"/api/v1/sessions/{session['id']}/replay/export")
    assert no_csrf.status_code == 403

    token_response = client.post(
        "/api/v1/api-tokens",
        headers=_csrf(client),
        json={"name": "Phase 8 replay token"},
    )
    assert token_response.status_code == 201
    bearer = {"Authorization": f"Bearer {token_response.json()['token']}"}

    export = client.post(f"/api/v1/sessions/{session['id']}/replay/export", headers=bearer)
    assert export.status_code == 200
    asset_id = export.json()["file_asset"]["id"]
    assert asset_id

    asset_content = client.get(f"/api/v1/file-assets/{asset_id}/content")
    assert asset_content.status_code == 200
    assert "frames" in asset_content.json()["content"]

    events = client.get(f"/api/v1/sessions/{session['id']}/events").json()["items"]
    assert "session_replay.exported" in {event["event_type"] for event in events}

    audit = client.get("/api/v1/audit-events")
    assert audit.status_code == 200
    assert "session_replay.exported" in {event["action"] for event in audit.json()["items"]}

    roles = client.get("/api/v1/roles").json()["items"]
    viewer_role_id = next(role["id"] for role in roles if role["name"] == "Viewer")
    invite = client.post(
        "/api/v1/users",
        headers=_csrf(client),
        json={"email": "phase8-viewer@example.com", "role_id": viewer_role_id},
    )
    assert invite.status_code == 201

    fake_supabase.next_user_id = uuid.uuid4()
    assert login(client, email="phase8-viewer@example.com").status_code == 200
    assert client.get(f"/api/v1/sessions/{session['id']}/replay").status_code == 200
    denied_export = client.post(
        f"/api/v1/sessions/{session['id']}/replay/export",
        headers=_csrf(client),
    )
    assert denied_export.status_code == 403

    with client.websocket_connect(f"/ws/v1/sessions/{session['id']}?last_event_id=0") as websocket:
        replayed = set()
        while True:
            message = websocket.receive_json()
            if message.get("type") == "connection.ready":
                break
            if message.get("type") == "session.event":
                replayed.add(message.get("event_type"))
    assert "session_replay.exported" in replayed


def test_analytics_endpoints_counts_filters_windows_and_permissions(
    client,
    fake_queue,
    fake_runtime,
    fake_storage,
    db_session_factory,
):
    assert login(client).status_code == 200
    session = _start_model_backed_session(client, fake_queue, db_session_factory)
    _run_agent_to_successful_tool_call(
        client,
        fake_queue,
        fake_runtime,
        fake_storage,
        db_session_factory,
        session["id"],
    )
    evidence = _create_note_evidence(client, session["id"], title="Phase 8 analytics evidence")
    _create_reviewed_finding(client, session, evidence)

    overview = client.get("/api/v1/analytics/overview")
    assert overview.status_code == 200
    assert overview.json()["session_count"] >= 1
    assert overview.json()["tool_call_count"] >= 1
    assert overview.json()["job_failure_count"] == 0

    sessions = client.get(
        "/api/v1/analytics/sessions",
        params={"project_id": session["project_id"]},
    )
    assert sessions.status_code == 200
    assert sessions.json()["total"] >= 1

    tools = client.get("/api/v1/analytics/tools", params={"project_id": session["project_id"]})
    assert tools.status_code == 200
    assert any(item["tool_name"] == "terminal.execute" for item in tools.json()["by_tool"])

    findings = client.get(
        "/api/v1/analytics/findings",
        params={"project_id": session["project_id"]},
    )
    assert findings.status_code == 200
    assert any(item["key"] == "medium" for item in findings.json()["by_severity"])

    approvals = client.get("/api/v1/analytics/approvals")
    assert approvals.status_code == 200
    assert approvals.json()["approved_count"] >= 1

    bad_window = client.get(
        "/api/v1/analytics/overview",
        params={"from_date": "2024-01-01", "to_date": "2026-01-01"},
    )
    assert bad_window.status_code == 400

    second_session_token, second_csrf_token = _create_sessions_read_workspace_session(
        db_session_factory,
    )
    client.cookies.set("app_session", second_session_token)
    client.cookies.set("app_csrf", second_csrf_token)
    denied = client.get("/api/v1/analytics/overview")
    assert denied.status_code == 403
