import uuid

from app.services.runtime import ToolExecutionRunner

from .conftest import login
from .test_phase3_session_engine import _run_plan_job
from .test_projects_sessions import _create_project_scope_session


def _csrf(client) -> dict[str, str]:
    return {"X-CSRF-Token": client.cookies.get("app_csrf")}


def _running_session(client, fake_queue, db_session_factory) -> dict[str, str]:
    assert login(client).status_code == 200
    _, _, session = _create_project_scope_session(client)
    start = client.post(f"/api/v1/sessions/{session['id']}/start", headers=_csrf(client))
    assert start.status_code == 200
    _run_plan_job(db_session_factory, fake_queue.enqueued_job_ids[-1])
    return session


def test_runtime_start_file_operations_and_events(
    client,
    fake_queue,
    fake_runtime,
    db_session_factory,
):
    session = _running_session(client, fake_queue, db_session_factory)

    before_running = client.post(
        f"/api/v1/sessions/{uuid.uuid4()}/runtime/start",
        headers=_csrf(client),
    )
    assert before_running.status_code in {401, 404}

    runtime = client.post(f"/api/v1/sessions/{session['id']}/runtime/start", headers=_csrf(client))
    assert runtime.status_code == 200
    runtime_body = runtime.json()
    assert runtime_body["status"] == "running"
    assert fake_runtime.started_runtime_ids == [runtime_body["id"]]

    write = client.put(
        f"/api/v1/sessions/{session['id']}/files/content",
        headers=_csrf(client),
        json={"path": "/workspace/scripts/check.py", "content": "print('ok')"},
    )
    assert write.status_code == 200
    assert write.json()["size_bytes"] == len(b"print('ok')")

    read = client.get(
        f"/api/v1/sessions/{session['id']}/files/content",
        params={"path": "/workspace/scripts/check.py"},
    )
    assert read.status_code == 200
    assert read.json()["content"] == "print('ok')"

    files = client.get(
        f"/api/v1/sessions/{session['id']}/files",
        params={"path": "/workspace/scripts"},
    )
    assert files.status_code == 200
    assert files.json()["entries"][0]["path"] == "/workspace/scripts/check.py"

    events = client.get(f"/api/v1/sessions/{session['id']}/events").json()["items"]
    event_types = {event["event_type"] for event in events}
    assert {"runtime.started", "file.written"}.issubset(event_types)


def test_terminal_tool_call_worker_execution(
    client,
    fake_queue,
    fake_runtime,
    db_session_factory,
):
    session = _running_session(client, fake_queue, db_session_factory)
    assert client.post(
        f"/api/v1/sessions/{session['id']}/runtime/start",
        headers=_csrf(client),
    ).status_code == 200

    command = client.post(
        f"/api/v1/sessions/{session['id']}/tool-calls/terminal",
        headers=_csrf(client),
        json={
            "command": ["python", "-c", "print('hello from runtime')"],
            "cwd": "/workspace",
            "timeout_seconds": 60,
            "max_output_bytes": 200000,
        },
    )
    assert command.status_code == 201
    assert command.json()["status"] == "queued"
    assert len(fake_queue.enqueued_tool_job_ids) == 1

    with db_session_factory() as db:
        assert ToolExecutionRunner(
            db=db,
            worker_id="test-worker",
            runtime_client=fake_runtime,
        ).run(job_id=fake_queue.enqueued_tool_job_ids[0])

    tool_calls = client.get(f"/api/v1/sessions/{session['id']}/tool-calls")
    assert tool_calls.status_code == 200
    tool_call = tool_calls.json()["items"][0]
    assert tool_call["status"] == "succeeded"
    assert "python -c print('hello from runtime')" in tool_call["raw_output"]

    events = client.get(f"/api/v1/sessions/{session['id']}/events").json()["items"]
    event_types = {event["event_type"] for event in events}
    assert {"tool_call.started", "tool_call.output", "tool_call.finished"}.issubset(
        event_types
    )


def test_disallowed_terminal_command_is_denied_without_queueing(
    client,
    fake_queue,
    db_session_factory,
):
    session = _running_session(client, fake_queue, db_session_factory)

    response = client.post(
        f"/api/v1/sessions/{session['id']}/tool-calls/terminal",
        headers=_csrf(client),
        json={"command": ["bash", "-lc", "echo no"], "cwd": "/workspace"},
    )

    assert response.status_code == 201
    body = response.json()
    assert body["status"] == "denied"
    assert body["policy_decision"]["decision"] == "deny"
    assert fake_queue.enqueued_tool_job_ids == []


def test_runtime_csrf_path_validation_and_api_token(
    client,
    fake_queue,
    db_session_factory,
):
    session = _running_session(client, fake_queue, db_session_factory)

    no_csrf = client.post(f"/api/v1/sessions/{session['id']}/runtime/start")
    assert no_csrf.status_code == 403

    token_response = client.post(
        "/api/v1/api-tokens",
        headers=_csrf(client),
        json={"name": "Phase 4 token"},
    )
    assert token_response.status_code == 201
    bearer_headers = {"Authorization": f"Bearer {token_response.json()['token']}"}

    runtime = client.post(
        f"/api/v1/sessions/{session['id']}/runtime/start",
        headers=bearer_headers,
    )
    assert runtime.status_code == 200

    bad_path = client.put(
        f"/api/v1/sessions/{session['id']}/files/content",
        headers=bearer_headers,
        json={"path": "/workspace/../escape.txt", "content": "bad"},
    )
    assert bad_path.status_code == 400

    command = client.post(
        f"/api/v1/sessions/{session['id']}/tool-calls/terminal",
        headers=bearer_headers,
        json={"command": ["echo", "ok"], "cwd": "/workspace"},
    )
    assert command.status_code == 201
