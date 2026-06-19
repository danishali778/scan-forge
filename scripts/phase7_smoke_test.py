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
        normalized_runtime_url = runtime_url.replace("http://runtime:", "http://localhost:", 1)
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
        "/api/v1/provider-profiles",
        headers=headers,
        json={
            "name": f"Phase 7 Fake Provider {suffix}",
            "provider_type": "fake",
            "agent_models": {
                "planner": "fake-agent",
                "executor": "fake-agent",
                "analyst": "fake-agent",
                "embedding": "fake-embedding",
            },
        },
    )
    assert_status(response, 201, "POST /api/v1/provider-profiles")
    provider_id = assert_json_key(response.json(), "id", "provider response")

    response = client.post(
        "/api/v1/policies",
        headers=headers,
        json={"name": f"Phase 7 Policy {suffix}", "rules": {}},
    )
    assert_status(response, 201, "POST /api/v1/policies")
    policy_id = assert_json_key(response.json(), "id", "policy response")

    response = client.post(
        "/api/v1/projects",
        headers=headers,
        json={
            "name": f"Phase 7 Smoke Project {suffix}",
            "description": "Created by scripts/phase7_smoke_test.py",
            "metadata": {"source": "phase7_smoke_test"},
        },
    )
    assert_status(response, 201, "POST /api/v1/projects")
    project_id = assert_json_key(response.json(), "id", "project response")

    response = client.post(
        f"/api/v1/projects/{project_id}/scopes",
        headers=headers,
        json={"name": f"Phase 7 Scope {suffix}", "rules": {"targets": ["memory.local"]}},
    )
    assert_status(response, 201, "POST /api/v1/projects/{project_id}/scopes")
    scope_id = assert_json_key(response.json(), "id", "scope response")

    response = client.post(
        "/api/v1/sessions",
        headers=headers,
        json={
            "project_id": project_id,
            "scope_id": scope_id,
            "provider_profile_id": provider_id,
            "policy_id": policy_id,
            "title": f"Phase 7 Smoke Session {suffix}",
            "objective": "Use approved memory about backend auth behavior.",
            "mode": "assisted",
        },
    )
    assert_status(response, 201, "POST /api/v1/sessions")
    session_id = assert_json_key(response.json(), "id", "session response")

    events = client.get(f"/api/v1/sessions/{session_id}/events")
    assert_status(events, 200, "GET /api/v1/sessions/{session_id}/events")
    last_event_id = events.json()["items"][-1]["id"]

    response = client.post(
        f"/api/v1/sessions/{session_id}/evidence",
        headers=headers,
        json={
            "type": "note",
            "title": "Auth memory source",
            "summary": "Backend auth behavior worth remembering.",
            "content": "Backend auth uses HttpOnly app_session and CSRF-bound app_csrf cookies.",
        },
    )
    assert_status(response, 201, "POST /api/v1/sessions/{session_id}/evidence")
    evidence_id = assert_json_key(response.json(), "id", "evidence response")

    response = client.post(
        f"/api/v1/sessions/{session_id}/findings",
        headers=headers,
        json={
            "title": "Reusable backend auth behavior",
            "severity": "low",
            "confidence": "high",
            "affected_assets": ["backend"],
            "description": "The backend owns auth sessions and mediates Supabase tokens.",
            "impact": "Future sessions should remember this architecture.",
            "reproduction_steps": "Review the backend auth implementation.",
            "remediation": "Keep this as approved project knowledge.",
            "references": [],
            "evidence_ids": [evidence_id],
        },
    )
    assert_status(response, 201, "POST /api/v1/sessions/{session_id}/findings")
    finding_id = assert_json_key(response.json(), "id", "finding response")

    response = client.post(
        f"/api/v1/findings/{finding_id}/review",
        headers=headers,
        json={"status": "confirmed", "review_note": "Confirmed by Phase 7 smoke test."},
    )
    assert_status(response, 200, "POST /api/v1/findings/{finding_id}/review")

    response = client.post(
        f"/api/v1/findings/{finding_id}/memory-candidate",
        headers=headers,
        json={"provider_profile_id": provider_id},
    )
    assert_status(response, 201, "POST /api/v1/findings/{finding_id}/memory-candidate")
    memory_id = assert_json_key(response.json(), "id", "memory candidate response")

    response = client.post(
        f"/api/v1/memory/{memory_id}/approve",
        headers=headers,
        json={"review_note": "Approved by Phase 7 smoke test.", "provider_profile_id": provider_id},
    )
    assert_status(response, 200, "POST /api/v1/memory/{memory_id}/approve")
    _wait_for_memory(client, memory_id=memory_id, embedding_status="embedded")

    response = client.post(
        "/api/v1/memory/search",
        json={
            "query": "What did we learn about backend auth cookies?",
            "project_id": project_id,
            "session_id": session_id,
            "provider_profile_id": provider_id,
        },
    )
    assert_status(response, 200, "POST /api/v1/memory/search")
    if not response.json().get("items"):
        raise AssertionError("Memory search returned no approved scoped results.")

    response = client.post(f"/api/v1/sessions/{session_id}/start", headers=headers)
    assert_status(response, 200, "POST /api/v1/sessions/{session_id}/start")
    _wait_for_status(client, session_id=session_id, wanted={"running"})

    messages = client.get(f"/api/v1/sessions/{session_id}/agent-messages")
    assert_status(messages, 200, "GET /api/v1/sessions/{session_id}/agent-messages")
    planner_messages = [
        item for item in messages.json().get("items", []) if item.get("agent_role") == "planner"
    ]
    if not planner_messages or planner_messages[0]["metadata"].get("memory_result_count", 0) < 1:
        raise AssertionError("Planner did not receive approved scoped memory context.")

    response = client.post(
        f"/api/v1/memory/{memory_id}/promote",
        headers=headers,
        json={"visibility": "project", "review_note": "Promoted by smoke test."},
    )
    assert_status(response, 200, "POST /api/v1/memory/{memory_id}/promote")

    websocket_url = f"/ws/v1/sessions/{session_id}?last_event_id={last_event_id}"
    replayed_event_types: set[str] = set()
    with client.websocket_connect(websocket_url) as websocket:
        while True:
            message = websocket.receive_json()
            if message.get("type") == "connection.ready":
                break
            if message.get("type") == "session.event":
                replayed_event_types.add(message.get("event_type"))
    expected = {
        "memory.document_created",
        "memory.document_reviewed",
        "memory.embedding_created",
        "memory.document_promoted",
    }
    if not expected.issubset(replayed_event_types):
        raise AssertionError("WebSocket replay did not include Phase 7 memory events.")

    response = client.post("/api/v1/auth/logout", headers=headers)
    assert_status(response, 200, "POST /api/v1/auth/logout")


def _wait_for_memory(
    client: TestClient,
    *,
    memory_id: str,
    embedding_status: str,
) -> dict[str, Any]:
    deadline = time.monotonic() + 90
    while time.monotonic() < deadline:
        response = client.get(f"/api/v1/memory/{memory_id}")
        assert_status(response, 200, "GET /api/v1/memory/{memory_id}")
        memory = response.json()
        status = memory.get("embedding_status")
        if status == embedding_status:
            return memory
        if status in {"failed", "blocked"}:
            raise AssertionError(f"Memory embedding entered terminal status: {status}.")
        time.sleep(1)
    raise AssertionError(f"Timed out waiting for memory embedding_status {embedding_status}.")


def _wait_for_status(client: TestClient, *, session_id: str, wanted: set[str]) -> str:
    deadline = time.monotonic() + 90
    while time.monotonic() < deadline:
        response = client.get(f"/api/v1/sessions/{session_id}")
        assert_status(response, 200, "GET /api/v1/sessions/{session_id}")
        status = response.json().get("status")
        if status in wanted:
            return str(status)
        if status in {"failed", "stopped", "archived"}:
            raise AssertionError(f"Session entered terminal status: {status}.")
        time.sleep(1)
    raise AssertionError(f"Timed out waiting for session status in {wanted}.")


def main() -> int:
    parser = argparse.ArgumentParser(description="Run Phase 7 memory/knowledge smoke tests.")
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
    print("Phase 7 smoke test: ok")
    return 0


if __name__ == "__main__":
    sys.exit(main())
