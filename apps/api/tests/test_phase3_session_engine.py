import uuid
from datetime import UTC, datetime, timedelta

from app.core.security import generate_token, hash_token
from app.models.identity import AuthSession, User, Workspace
from app.repositories.auth import AuthRepository
from app.repositories.sessions import SessionRepository
from app.services.sessions.planner import PlanSessionRunner

from .conftest import login
from .test_projects_sessions import _create_project_scope_session


def _csrf(client) -> dict[str, str]:
    return {"X-CSRF-Token": _cookie(client, "app_csrf")}


def _cookie(client, name: str) -> str:
    for cookie in client.cookies.jar:
        if cookie.name == name and cookie.domain == "testserver.local":
            return cookie.value
    value = client.cookies.get(name)
    assert value is not None
    return value


def _run_plan_job(db_session_factory, job_id: str) -> None:
    with db_session_factory() as db:
        assert PlanSessionRunner(db=db, worker_id="test-worker").run(job_id=job_id) is True


def _create_second_workspace_session(db_session_factory) -> tuple[str, str]:
    session_token = generate_token()
    csrf_token = generate_token()
    with db_session_factory() as db:
        workspace = Workspace(name="Second Workspace", slug=f"second-{uuid.uuid4()}", settings={})
        db.add(workspace)
        db.flush()
        roles = AuthRepository(db).create_default_roles(workspace_id=workspace.id)
        user = User(
            workspace_id=workspace.id,
            supabase_user_id=uuid.uuid4(),
            email="second-phase3@example.com",
            name="Second",
            type="human",
            status="active",
            role_id=roles["Owner"].id,
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


def test_start_creates_job_and_worker_plans_session(client, fake_queue, db_session_factory):
    assert login(client).status_code == 200
    _, _, session = _create_project_scope_session(client)

    response = client.post(f"/api/v1/sessions/{session['id']}/start", headers=_csrf(client))

    assert response.status_code == 200
    assert response.json()["status"] == "planning"
    assert len(fake_queue.enqueued_job_ids) == 1

    jobs = client.get(f"/api/v1/sessions/{session['id']}/jobs")
    assert jobs.status_code == 200
    assert jobs.json()["items"][0]["status"] == "queued"
    assert jobs.json()["items"][0]["celery_task_id"].startswith("test-celery-")

    _run_plan_job(db_session_factory, fake_queue.enqueued_job_ids[0])

    detail = client.get(f"/api/v1/sessions/{session['id']}")
    assert detail.status_code == 200
    assert detail.json()["status"] == "running"

    tasks = client.get(f"/api/v1/sessions/{session['id']}/tasks")
    assert tasks.status_code == 200
    body = tasks.json()
    assert len(body["items"]) == 3
    assert all(task["status"] == "planned" for task in body["items"])
    assert all(len(task["steps"]) == 2 for task in body["items"])
    assert all(step["status"] == "ready" for task in body["items"] for step in task["steps"])

    events = client.get(f"/api/v1/sessions/{session['id']}/events")
    event_types = {event["event_type"] for event in events.json()["items"]}
    assert {"task.created", "step.created", "plan.created", "job.updated"}.issubset(
        event_types
    )


def test_lifecycle_transitions_and_conflicts(client, fake_queue, db_session_factory):
    assert login(client).status_code == 200
    _, _, session = _create_project_scope_session(client)

    conflict = client.post(f"/api/v1/sessions/{session['id']}/pause", headers=_csrf(client))
    assert conflict.status_code == 409

    start = client.post(f"/api/v1/sessions/{session['id']}/start", headers=_csrf(client))
    assert start.status_code == 200
    _run_plan_job(db_session_factory, fake_queue.enqueued_job_ids[0])

    pause = client.post(f"/api/v1/sessions/{session['id']}/pause", headers=_csrf(client))
    assert pause.status_code == 200
    assert pause.json()["status"] == "paused"

    resume = client.post(f"/api/v1/sessions/{session['id']}/resume", headers=_csrf(client))
    assert resume.status_code == 200
    assert resume.json()["status"] == "running"

    stop = client.post(f"/api/v1/sessions/{session['id']}/stop", headers=_csrf(client))
    assert stop.status_code == 200
    assert stop.json()["status"] == "stopped"

    archive = client.post(f"/api/v1/sessions/{session['id']}/archive", headers=_csrf(client))
    assert archive.status_code == 200
    assert archive.json()["status"] == "archived"


def test_stale_planning_job_marks_session_failed(client, fake_queue, db_session_factory):
    assert login(client).status_code == 200
    _, _, session = _create_project_scope_session(client)
    start = client.post(f"/api/v1/sessions/{session['id']}/start", headers=_csrf(client))
    assert start.status_code == 200

    with db_session_factory() as db:
        repository = SessionRepository(db)
        job = repository.get_job_by_id(job_id=uuid.UUID(fake_queue.enqueued_job_ids[0]))
        assert job is not None
        repository.claim_job(job, worker_id="stale-worker")
        job.locked_at = datetime.now(UTC) - timedelta(seconds=901)
        db.add(job)
        db.commit()

    with db_session_factory() as db:
        count = PlanSessionRunner(db=db, worker_id="reconciler").reconcile_stale(
            stale_seconds=900,
        )
    assert count == 1

    detail = client.get(f"/api/v1/sessions/{session['id']}")
    assert detail.status_code == 200
    assert detail.json()["status"] == "failed"

    jobs = client.get(f"/api/v1/sessions/{session['id']}/jobs")
    assert jobs.json()["items"][0]["status"] == "failed"


def test_lifecycle_rbac_csrf_api_token_and_workspace_isolation(
    client,
    fake_supabase,
    fake_queue,
    db_session_factory,
):
    assert login(client).status_code == 200
    _, _, session = _create_project_scope_session(client)
    owner_session_cookie = client.cookies.get("app_session")
    owner_csrf_cookie = client.cookies.get("app_csrf")

    no_csrf = client.post(f"/api/v1/sessions/{session['id']}/start")
    assert no_csrf.status_code == 403

    roles = client.get("/api/v1/roles").json()["items"]
    viewer_role_id = next(role["id"] for role in roles if role["name"] == "Viewer")
    assert client.post(
        "/api/v1/users",
        headers=_csrf(client),
        json={"email": "phase3-viewer@example.com", "role_id": viewer_role_id},
    ).status_code == 201
    fake_supabase.next_user_id = uuid.uuid4()
    assert login(client, email="phase3-viewer@example.com").status_code == 200
    denied = client.post(f"/api/v1/sessions/{session['id']}/start", headers=_csrf(client))
    assert denied.status_code == 403

    client.cookies.set("app_session", owner_session_cookie, domain="testserver.local", path="/")
    client.cookies.set("app_csrf", owner_csrf_cookie, domain="testserver.local", path="/")
    token_response = client.post(
        "/api/v1/api-tokens",
        headers=_csrf(client),
        json={"name": "Phase 3 token"},
    )
    assert token_response.status_code == 201
    bearer_headers = {"Authorization": f"Bearer {token_response.json()['token']}"}

    bearer_start = client.post(f"/api/v1/sessions/{session['id']}/start", headers=bearer_headers)
    assert bearer_start.status_code == 200
    assert bearer_start.json()["status"] == "planning"
    _run_plan_job(db_session_factory, fake_queue.enqueued_job_ids[-1])
    pause = client.post(f"/api/v1/sessions/{session['id']}/pause", headers=bearer_headers)
    assert pause.status_code == 200
    resume = client.post(f"/api/v1/sessions/{session['id']}/resume", headers=bearer_headers)
    assert resume.status_code == 200

    second_session_token, second_csrf_token = _create_second_workspace_session(db_session_factory)
    client.cookies.set("app_session", second_session_token)
    client.cookies.set("app_csrf", second_csrf_token)
    assert client.get(f"/api/v1/sessions/{session['id']}/tasks").status_code == 404
    assert client.get(f"/api/v1/sessions/{session['id']}/jobs").status_code == 404


def test_websocket_live_streams_new_session_events(client, fake_queue, db_session_factory):
    assert login(client).status_code == 200
    _, _, session = _create_project_scope_session(client)
    start = client.post(f"/api/v1/sessions/{session['id']}/start", headers=_csrf(client))
    assert start.status_code == 200
    _run_plan_job(db_session_factory, fake_queue.enqueued_job_ids[0])

    events = client.get(f"/api/v1/sessions/{session['id']}/events").json()["items"]
    last_event_id = events[-1]["id"]

    with client.websocket_connect(
        f"/ws/v1/sessions/{session['id']}?last_event_id={last_event_id}"
    ) as websocket:
        ready = websocket.receive_json()
        assert ready["type"] == "connection.ready"

        pause = client.post(f"/api/v1/sessions/{session['id']}/pause", headers=_csrf(client))
        assert pause.status_code == 200

        live_event = websocket.receive_json()

    assert live_event["type"] == "session.event"
    assert live_event["event_type"] == "session.status_changed"
    assert live_event["payload"]["new_status"] == "paused"
