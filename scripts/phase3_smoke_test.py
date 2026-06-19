from __future__ import annotations

import argparse
import os
import sys
import time
import uuid
from pathlib import Path
from typing import Any

from app.main import create_app
from dotenv import dotenv_values
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[1]


def env_value(name: str) -> str | None:
    value = os.environ.get(name) or dotenv_values(ROOT / ".env").get(name)
    return value if value else None


def configure_host_queue_defaults() -> None:
    env_values = dotenv_values(ROOT / ".env")
    for name in ("REDIS_URL", "CELERY_BROKER_URL"):
        if os.environ.get(name):
            continue
        value = env_values.get(name)
        if value and value.startswith("redis://redis:"):
            os.environ[name] = value.replace("redis://redis:", "redis://localhost:", 1)


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
            "name": f"Phase 3 Smoke Project {suffix}",
            "description": "Created by scripts/phase3_smoke_test.py",
            "metadata": {"source": "phase3_smoke_test"},
        },
    )
    assert_status(response, 201, "POST /api/v1/projects")
    project_id = assert_json_key(response.json(), "id", "project response")

    response = client.post(
        f"/api/v1/projects/{project_id}/scopes",
        headers=headers,
        json={
            "name": f"Phase 3 Smoke Scope {suffix}",
            "rules": {"targets": [f"phase3-{suffix}.example.com"]},
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
            "title": f"Phase 3 Smoke Session {suffix}",
            "objective": "Validate the Phase 3 session engine.",
            "mode": "assisted",
        },
    )
    assert_status(response, 201, "POST /api/v1/sessions")
    session_id = assert_json_key(response.json(), "id", "session response")

    response = client.post(f"/api/v1/sessions/{session_id}/start", headers=headers)
    assert_status(response, 200, "POST /api/v1/sessions/{session_id}/start")
    if response.json().get("status") != "planning":
        raise AssertionError("Started session should enter planning status.")

    _wait_for_running_session(client, session_id=session_id)

    response = client.get(f"/api/v1/sessions/{session_id}/tasks")
    assert_status(response, 200, "GET /api/v1/sessions/{session_id}/tasks")
    tasks = response.json().get("items", [])
    if len(tasks) != 3:
        raise AssertionError(f"Expected 3 planned tasks, got {len(tasks)}.")
    if any(len(task.get("steps", [])) != 2 for task in tasks):
        raise AssertionError("Every placeholder task should have 2 steps.")

    response = client.get(f"/api/v1/sessions/{session_id}/jobs")
    assert_status(response, 200, "GET /api/v1/sessions/{session_id}/jobs")
    jobs = response.json().get("items", [])
    if not jobs or jobs[0].get("status") != "succeeded":
        raise AssertionError("Planning job did not succeed.")

    events = client.get(f"/api/v1/sessions/{session_id}/events")
    assert_status(events, 200, "GET /api/v1/sessions/{session_id}/events")
    event_items = events.json().get("items", [])
    event_types = {event["event_type"] for event in event_items}
    if not {"plan.created", "task.created", "step.created", "job.updated"}.issubset(
        event_types
    ):
        raise AssertionError("Session event stream is missing Phase 3 planning events.")

    last_event_id = event_items[-1]["id"]
    websocket_url = f"/ws/v1/sessions/{session_id}?last_event_id={last_event_id}"
    with client.websocket_connect(websocket_url) as websocket:
        ready = websocket.receive_json()
        if ready.get("type") != "connection.ready":
            raise AssertionError("WebSocket did not send connection.ready.")

        response = client.post(f"/api/v1/sessions/{session_id}/pause", headers=headers)
        assert_status(response, 200, "POST /api/v1/sessions/{session_id}/pause")
        event = websocket.receive_json()
        if event.get("event_type") != "session.status_changed":
            raise AssertionError("WebSocket did not stream the pause event.")

    response = client.post(f"/api/v1/sessions/{session_id}/resume", headers=headers)
    assert_status(response, 200, "POST /api/v1/sessions/{session_id}/resume")

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
        status = response.json().get("status")
        if status == "running":
            return
        if status in {"failed", "stopped", "archived"}:
            raise AssertionError(f"Session entered terminal status during planning: {status}.")
        time.sleep(1)
    raise AssertionError("Timed out waiting for planning job to move session to running.")


def main() -> int:
    parser = argparse.ArgumentParser(description="Run Phase 3 backend smoke tests.")
    parser.add_argument(
        "--auth-required",
        action="store_true",
        help="Fail if TEST_USER_EMAIL and TEST_USER_PASSWORD are not configured.",
    )
    args = parser.parse_args()

    configure_host_queue_defaults()
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
    print("Phase 3 smoke test: ok")
    return 0


if __name__ == "__main__":
    sys.exit(main())
