from __future__ import annotations

import argparse
import os
import sys
import time
import uuid
from pathlib import Path
from typing import Any

from app.core.config import get_settings
from app.main import create_app
from dotenv import dotenv_values
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[1]


def env_value(name: str) -> str | None:
    value = os.environ.get(name) or dotenv_values(ROOT / ".env").get(name)
    return value if value else None


def configure_host_defaults() -> None:
    env_values = dotenv_values(ROOT / ".env")
    for name in ("REDIS_URL", "CELERY_BROKER_URL"):
        if os.environ.get(name):
            continue
        value = env_values.get(name)
        if value and value.startswith("redis://redis:"):
            os.environ[name] = value.replace("redis://redis:", "redis://localhost:", 1)

    runtime_url = os.environ.get("RUNTIME_SERVICE_URL") or env_values.get("RUNTIME_SERVICE_URL")
    if runtime_url and runtime_url.startswith("http://runtime:"):
        normalized_runtime_url = runtime_url.replace(
            "http://runtime:",
            "http://localhost:",
            1,
        )
        os.environ["RUNTIME_SERVICE_URL"] = normalized_runtime_url
        os.environ["runtime_service_url"] = normalized_runtime_url


def assert_status(response, expected: int, label: str) -> None:
    print(f"{label}: {response.status_code}")
    if response.status_code != expected:
        raise AssertionError(
            f"{label} expected {expected}, got {response.status_code}: {response.text}"
        )


def assert_json_key(payload: dict[str, Any], key: str, label: str) -> Any:
    value = payload.get(key)
    if value is None:
        raise AssertionError(f"{label} missing key: {key}")
    return value


def csrf_headers(client: TestClient) -> dict[str, str]:
    csrf = client.cookies.get("app_csrf")
    if not csrf:
        raise AssertionError("Login did not set app_csrf cookie.")
    return {"X-CSRF-Token": csrf}


def run_authenticated_checks(client: TestClient, *, email: str, password: str) -> None:
    response = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert_status(response, 200, "POST /api/v1/auth/login")
    headers = csrf_headers(client)
    suffix = uuid.uuid4().hex[:8]

    response = client.post(
        "/api/v1/projects",
        headers=headers,
        json={
            "name": f"Phase 4 Smoke Project {suffix}",
            "description": "Created by scripts/phase4_smoke_test.py",
            "metadata": {"source": "phase4_smoke_test"},
        },
    )
    assert_status(response, 201, "POST /api/v1/projects")
    project_id = assert_json_key(response.json(), "id", "project response")

    response = client.post(
        f"/api/v1/projects/{project_id}/scopes",
        headers=headers,
        json={
            "name": f"Phase 4 Smoke Scope {suffix}",
            "rules": {"targets": [f"phase4-{suffix}.example.com"]},
        },
    )
    assert_status(response, 201, "POST /api/v1/projects/{project_id}/scopes")
    scope_id = assert_json_key(response.json(), "id", "scope response")

    response = client.post(
        "/api/v1/sessions",
        headers=headers,
        json={
            "project_id": project_id,
            "scope_id": scope_id,
            "title": f"Phase 4 Smoke Session {suffix}",
            "objective": "Validate the Phase 4 sandbox runtime.",
            "mode": "assisted",
        },
    )
    assert_status(response, 201, "POST /api/v1/sessions")
    session_id = assert_json_key(response.json(), "id", "session response")

    response = client.post(f"/api/v1/sessions/{session_id}/start", headers=headers)
    assert_status(response, 200, "POST /api/v1/sessions/{session_id}/start")
    _wait_for_running_session(client, session_id=session_id)

    response = client.post(f"/api/v1/sessions/{session_id}/runtime/start", headers=headers)
    assert_status(response, 200, "POST /api/v1/sessions/{session_id}/runtime/start")
    runtime_id = assert_json_key(response.json(), "id", "runtime response")
    print(f"runtime_id: {runtime_id}")

    response = client.put(
        f"/api/v1/sessions/{session_id}/files/content",
        headers=headers,
        json={
            "path": "/workspace/scripts/check.py",
            "content": "print('hello from phase4 runtime')",
        },
    )
    assert_status(response, 200, "PUT /api/v1/sessions/{session_id}/files/content")

    response = client.get(
        f"/api/v1/sessions/{session_id}/files/content",
        params={"path": "/workspace/scripts/check.py"},
    )
    assert_status(response, 200, "GET /api/v1/sessions/{session_id}/files/content")
    if "hello from phase4 runtime" not in response.json().get("content", ""):
        raise AssertionError("Runtime file read did not return the expected content.")

    events = client.get(f"/api/v1/sessions/{session_id}/events")
    assert_status(events, 200, "GET /api/v1/sessions/{session_id}/events")
    last_event_id = events.json()["items"][-1]["id"]

    response = client.post(
        f"/api/v1/sessions/{session_id}/tool-calls/terminal",
        headers=headers,
        json={
            "command": ["python", "/workspace/scripts/check.py"],
            "cwd": "/workspace",
            "timeout_seconds": 60,
            "max_output_bytes": 200000,
        },
    )
    assert_status(response, 201, "POST /api/v1/sessions/{session_id}/tool-calls/terminal")
    tool_call_id = assert_json_key(response.json(), "id", "tool call response")
    _wait_for_tool_call(client, session_id=session_id, tool_call_id=tool_call_id)

    response = client.get(
        f"/api/v1/sessions/{session_id}/files",
        params={"path": "/workspace/scripts"},
    )
    assert_status(response, 200, "GET /api/v1/sessions/{session_id}/files")
    if not response.json().get("entries"):
        raise AssertionError("Runtime file listing did not include the smoke script.")

    websocket_url = f"/ws/v1/sessions/{session_id}?last_event_id={last_event_id}"
    replayed_event_types: set[str] = set()
    with client.websocket_connect(websocket_url) as websocket:
        while True:
            message = websocket.receive_json()
            if message.get("type") == "connection.ready":
                break
            if message.get("type") == "session.event":
                replayed_event_types.add(message.get("event_type"))
    if not {"tool_call.output", "tool_call.finished"}.issubset(replayed_event_types):
        raise AssertionError("WebSocket replay did not include Phase 4 tool call events.")

    response = client.post(f"/api/v1/sessions/{session_id}/runtime/stop", headers=headers)
    assert_status(response, 200, "POST /api/v1/sessions/{session_id}/runtime/stop")

    response = client.post(f"/api/v1/sessions/{session_id}/stop", headers=headers)
    assert_status(response, 200, "POST /api/v1/sessions/{session_id}/stop")

    response = client.post(f"/api/v1/sessions/{session_id}/archive", headers=headers)
    assert_status(response, 200, "POST /api/v1/sessions/{session_id}/archive")

    response = client.post("/api/v1/auth/logout", headers=headers)
    assert_status(response, 200, "POST /api/v1/auth/logout")


def _wait_for_running_session(client: TestClient, *, session_id: str) -> None:
    deadline = time.monotonic() + 45
    while time.monotonic() < deadline:
        response = client.get(f"/api/v1/sessions/{session_id}")
        assert_status(response, 200, "GET /api/v1/sessions/{session_id}")
        session_status = response.json().get("status")
        if session_status == "running":
            return
        if session_status in {"failed", "stopped", "archived"}:
            raise AssertionError(f"Session entered terminal status: {session_status}.")
        time.sleep(1)
    raise AssertionError("Timed out waiting for session planning to complete.")


def _wait_for_tool_call(client: TestClient, *, session_id: str, tool_call_id: str) -> None:
    deadline = time.monotonic() + 60
    while time.monotonic() < deadline:
        response = client.get(f"/api/v1/sessions/{session_id}/tool-calls")
        assert_status(response, 200, "GET /api/v1/sessions/{session_id}/tool-calls")
        for tool_call in response.json().get("items", []):
            if tool_call.get("id") != tool_call_id:
                continue
            status = tool_call.get("status")
            if status == "succeeded":
                if "hello from phase4 runtime" not in (tool_call.get("raw_output") or ""):
                    raise AssertionError("Tool call output did not include runtime output.")
                return
            if status in {"failed", "timed_out", "cancelled", "denied"}:
                raise AssertionError(f"Tool call entered terminal failure status: {status}.")
        time.sleep(1)
    raise AssertionError("Timed out waiting for tool call execution.")


def main() -> int:
    parser = argparse.ArgumentParser(description="Run Phase 4 backend/runtime smoke tests.")
    parser.add_argument(
        "--auth-required",
        action="store_true",
        help="Fail if TEST_USER_EMAIL and TEST_USER_PASSWORD are not configured.",
    )
    args = parser.parse_args()

    configure_host_defaults()
    get_settings.cache_clear()
    client = TestClient(create_app())

    response = client.get("/api/v1/health")
    assert_status(response, 200, "GET /api/v1/health")

    email = env_value("TEST_USER_EMAIL")
    password = env_value("TEST_USER_PASSWORD")
    if not email or not password:
        message = "Auth flow skipped: set TEST_USER_EMAIL and TEST_USER_PASSWORD in .env."
        if args.auth_required:
            print(message)
            return 2
        print(message)
        return 0

    run_authenticated_checks(client, email=email, password=password)
    print("Phase 4 smoke test: ok")
    return 0


if __name__ == "__main__":
    sys.exit(main())
