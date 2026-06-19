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
            "name": f"Phase 8 Fake Provider {suffix}",
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
        json={"name": f"Phase 8 Policy {suffix}", "rules": {}},
    )
    assert_status(response, 201, "POST /api/v1/policies")
    policy_id = assert_json_key(response.json(), "id", "policy response")

    response = client.post(
        "/api/v1/projects",
        headers=headers,
        json={
            "name": f"Phase 8 Smoke Project {suffix}",
            "description": "Created by scripts/phase8_smoke_test.py",
            "metadata": {"source": "phase8_smoke_test"},
        },
    )
    assert_status(response, 201, "POST /api/v1/projects")
    project_id = assert_json_key(response.json(), "id", "project response")

    response = client.post(
        f"/api/v1/projects/{project_id}/scopes",
        headers=headers,
        json={"name": f"Phase 8 Scope {suffix}", "rules": {"targets": ["analytics.local"]}},
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
            "title": f"Phase 8 Smoke Session {suffix}",
            "objective": "Exercise replay and analytics across agent, runtime, review, and memory.",
            "mode": "assisted",
        },
    )
    assert_status(response, 201, "POST /api/v1/sessions")
    session_id = assert_json_key(response.json(), "id", "session response")

    response = client.post(f"/api/v1/sessions/{session_id}/start", headers=headers)
    assert_status(response, 200, "POST /api/v1/sessions/{session_id}/start")
    _wait_for_status(client, session_id=session_id, wanted={"running"})

    response = client.post(
        f"/api/v1/sessions/{session_id}/agent/run",
        headers=headers,
        json={"max_turns": 3},
    )
    assert_status(response, 200, "POST /api/v1/sessions/{session_id}/agent/run")
    approval = _wait_for_approval(client, session_id=session_id)

    response = client.post(
        f"/api/v1/approvals/{approval['id']}/approve",
        headers=headers,
        json={"note": "Approved by Phase 8 smoke test."},
    )
    assert_status(response, 200, "POST /api/v1/approvals/{approval_id}/approve")
    _wait_for_tool_call(client, session_id=session_id, status="succeeded")
    evidence = _wait_for_evidence(client, session_id=session_id)

    response = client.post(
        f"/api/v1/sessions/{session_id}/findings",
        headers=headers,
        json={
            "title": "Phase 8 reviewed finding",
            "severity": "low",
            "confidence": "high",
            "affected_assets": ["runtime"],
            "description": "Runtime output was captured as evidence.",
            "impact": "Replay and analytics should count reviewed security-review objects.",
            "reproduction_steps": "Run the Phase 8 smoke flow.",
            "remediation": "No remediation required for this smoke test.",
            "references": [],
            "evidence_ids": [evidence["id"]],
        },
    )
    assert_status(response, 201, "POST /api/v1/sessions/{session_id}/findings")
    finding_id = assert_json_key(response.json(), "id", "finding response")

    response = client.post(
        f"/api/v1/findings/{finding_id}/review",
        headers=headers,
        json={"status": "confirmed", "review_note": "Confirmed by Phase 8 smoke test."},
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
        json={"review_note": "Approved by Phase 8 smoke test.", "provider_profile_id": provider_id},
    )
    assert_status(response, 200, "POST /api/v1/memory/{memory_id}/approve")
    _wait_for_memory(client, memory_id=memory_id, embedding_status="embedded")

    replay = client.get(f"/api/v1/sessions/{session_id}/replay")
    assert_status(replay, 200, "GET /api/v1/sessions/{session_id}/replay")
    frames = replay.json().get("frames", [])
    if not frames:
        raise AssertionError("Replay endpoint returned no frames.")
    event_ids = [frame["event_id"] for frame in frames]
    if event_ids != sorted(event_ids):
        raise AssertionError("Replay frames are not ordered by event id.")
    replayed_event_types = {frame["event_type"] for frame in frames}
    expected_replay_events = {
        "agent.message",
        "approval.requested",
        "approval.resolved",
        "tool_call.finished",
        "evidence.created",
        "finding.reviewed",
        "memory.embedding_created",
    }
    if not expected_replay_events.issubset(replayed_event_types):
        raise AssertionError("Replay response is missing expected Phase 5-7 event types.")

    export = client.post(f"/api/v1/sessions/{session_id}/replay/export", headers=headers)
    assert_status(export, 200, "POST /api/v1/sessions/{session_id}/replay/export")
    asset = assert_json_key(export.json(), "file_asset", "replay export response")
    asset_id = assert_json_key(asset, "id", "replay export asset")

    content = client.get(f"/api/v1/file-assets/{asset_id}/content")
    assert_status(content, 200, "GET /api/v1/file-assets/{asset_id}/content")
    if '"frames"' not in content.json().get("content", ""):
        raise AssertionError("Replay export content does not contain frames.")

    for path in (
        "/api/v1/analytics/overview",
        "/api/v1/analytics/sessions",
        "/api/v1/analytics/tools",
        "/api/v1/analytics/findings",
        "/api/v1/analytics/approvals",
    ):
        response = client.get(path, params={"project_id": project_id})
        assert_status(response, 200, f"GET {path}")

    overview = client.get("/api/v1/analytics/overview", params={"project_id": project_id}).json()
    if overview.get("session_count", 0) < 1 or overview.get("tool_call_count", 0) < 1:
        raise AssertionError("Analytics overview did not include the smoke session/tool call.")

    events = client.get(f"/api/v1/sessions/{session_id}/events")
    assert_status(events, 200, "GET /api/v1/sessions/{session_id}/events")
    event_types = {event["event_type"] for event in events.json().get("items", [])}
    if "session_replay.exported" not in event_types:
        raise AssertionError("session_replay.exported was not persisted as a session event.")

    response = client.post("/api/v1/auth/logout", headers=headers)
    assert_status(response, 200, "POST /api/v1/auth/logout")


def _wait_for_status(client: TestClient, *, session_id: str, wanted: set[str]) -> str:
    deadline = time.monotonic() + 120
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


def _wait_for_approval(client: TestClient, *, session_id: str) -> dict[str, Any]:
    deadline = time.monotonic() + 120
    while time.monotonic() < deadline:
        response = client.get("/api/v1/approvals", params={"status": "pending"})
        assert_status(response, 200, "GET /api/v1/approvals?status=pending")
        for approval in response.json().get("items", []):
            if approval.get("session_id") == session_id:
                return approval
        time.sleep(1)
    raise AssertionError("Timed out waiting for pending approval request.")


def _wait_for_tool_call(client: TestClient, *, session_id: str, status: str) -> dict[str, Any]:
    deadline = time.monotonic() + 120
    while time.monotonic() < deadline:
        response = client.get(f"/api/v1/sessions/{session_id}/tool-calls")
        assert_status(response, 200, "GET /api/v1/sessions/{session_id}/tool-calls")
        for tool_call in response.json().get("items", []):
            if tool_call.get("status") == status:
                return tool_call
            if tool_call.get("status") in {"failed", "timed_out", "cancelled", "denied"}:
                raise AssertionError(f"Tool call entered terminal status: {tool_call['status']}.")
        time.sleep(1)
    raise AssertionError(f"Timed out waiting for tool call status {status}.")


def _wait_for_evidence(client: TestClient, *, session_id: str) -> dict[str, Any]:
    deadline = time.monotonic() + 120
    while time.monotonic() < deadline:
        response = client.get(f"/api/v1/sessions/{session_id}/evidence")
        assert_status(response, 200, "GET /api/v1/sessions/{session_id}/evidence")
        items = response.json().get("items", [])
        if items:
            return items[0]
        time.sleep(1)
    raise AssertionError("Timed out waiting for tool-call evidence.")


def _wait_for_memory(
    client: TestClient,
    *,
    memory_id: str,
    embedding_status: str,
) -> dict[str, Any]:
    deadline = time.monotonic() + 120
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


def main() -> int:
    parser = argparse.ArgumentParser(description="Run Phase 8 replay/analytics smoke tests.")
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
    print("Phase 8 smoke test: ok")
    return 0


if __name__ == "__main__":
    sys.exit(main())
