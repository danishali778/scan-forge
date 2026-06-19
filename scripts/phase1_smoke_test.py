from __future__ import annotations

import argparse
import os
import sys
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


def run_public_checks(client: TestClient) -> None:
    response = client.get("/health")
    assert_status(response, 200, "GET /health")

    response = client.get("/api/v1/health")
    assert_status(response, 200, "GET /api/v1/health")

    response = client.get("/api/v1/auth/me")
    assert_status(response, 200, "GET /api/v1/auth/me without cookie")
    if response.json().get("authenticated") is not False:
        raise AssertionError("/auth/me should be unauthenticated before login.")

    response = client.get("/api/v1/projects")
    assert_status(response, 401, "GET /api/v1/projects without cookie")

    response = client.get("/api/v1/sessions")
    assert_status(response, 401, "GET /api/v1/sessions without cookie")


def run_authenticated_checks(client: TestClient, *, email: str, password: str) -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": email, "password": password},
    )
    assert_status(response, 200, "POST /api/v1/auth/login")
    user = assert_json_key(response.json(), "user", "login response")
    print(f"authenticated_user_id={user['id']}")
    print(f"workspace_id={user['workspace_id']}")

    headers = csrf_headers(client)

    response = client.get("/api/v1/auth/me")
    assert_status(response, 200, "GET /api/v1/auth/me after login")
    if response.json().get("authenticated") is not True:
        raise AssertionError("/auth/me should be authenticated after login.")

    suffix = uuid.uuid4().hex[:8]
    response = client.post(
        "/api/v1/projects",
        headers=headers,
        json={
            "name": f"Phase 1 Smoke Project {suffix}",
            "description": "Created by scripts/phase1_smoke_test.py",
            "metadata": {"source": "phase1_smoke_test"},
        },
    )
    assert_status(response, 201, "POST /api/v1/projects")
    project_id = assert_json_key(response.json(), "id", "project response")

    response = client.get("/api/v1/projects")
    assert_status(response, 200, "GET /api/v1/projects")

    response = client.post(
        f"/api/v1/projects/{project_id}/scopes",
        headers=headers,
        json={
            "name": f"Smoke Scope {suffix}",
            "description": "Approved smoke-test scope",
            "rules": {"targets": ["example.com"], "testing": "non-invasive"},
        },
    )
    assert_status(response, 201, "POST /api/v1/projects/{project_id}/scopes")
    scope_id = assert_json_key(response.json(), "id", "scope response")

    response = client.get(f"/api/v1/projects/{project_id}/scopes")
    assert_status(response, 200, "GET /api/v1/projects/{project_id}/scopes")

    response = client.post(
        "/api/v1/sessions",
        headers=headers,
        json={
            "project_id": project_id,
            "scope_id": scope_id,
            "title": f"Smoke Session {suffix}",
            "objective": "Validate Phase 1 session persistence.",
            "mode": "assisted",
        },
    )
    assert_status(response, 201, "POST /api/v1/sessions")
    session_id = assert_json_key(response.json(), "id", "session response")

    response = client.get("/api/v1/sessions")
    assert_status(response, 200, "GET /api/v1/sessions")

    response = client.get(f"/api/v1/sessions/{session_id}")
    assert_status(response, 200, "GET /api/v1/sessions/{session_id}")

    response = client.get(f"/api/v1/sessions/{session_id}/events")
    assert_status(response, 200, "GET /api/v1/sessions/{session_id}/events")
    events = response.json().get("items", [])
    if not events:
        raise AssertionError("Session should have at least one persisted event.")

    with client.websocket_connect(f"/ws/v1/sessions/{session_id}") as websocket:
        first = websocket.receive_json()
        second = websocket.receive_json()
        received_types = {first.get("type"), second.get("type")}
        if "session.event" not in received_types:
            raise AssertionError("WebSocket did not replay session.event.")
        if "connection.ready" not in received_types:
            raise AssertionError("WebSocket did not send connection.ready.")

        request_id = uuid.uuid4().hex
        websocket.send_json({"type": "ping", "request_id": request_id})
        ack = websocket.receive_json()
        if ack.get("type") != "command.ack" or ack.get("request_id") != request_id:
            raise AssertionError("WebSocket command acknowledgement failed.")
    print("WebSocket session replay: ok")

    response = client.post("/api/v1/auth/logout", headers=headers)
    assert_status(response, 200, "POST /api/v1/auth/logout")


def main() -> int:
    parser = argparse.ArgumentParser(description="Run Phase 1 backend smoke tests.")
    parser.add_argument(
        "--auth-required",
        action="store_true",
        help="Fail if TEST_USER_EMAIL and TEST_USER_PASSWORD are not configured.",
    )
    args = parser.parse_args()

    client = TestClient(create_app())
    run_public_checks(client)

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
    print("Phase 1 smoke test: ok")
    return 0


if __name__ == "__main__":
    sys.exit(main())
