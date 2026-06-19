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
            "name": f"Phase 6 Fake Provider {suffix}",
            "provider_type": "fake",
            "agent_models": {
                "planner": "fake-agent",
                "executor": "fake-agent",
                "analyst": "fake-agent",
            },
        },
    )
    assert_status(response, 201, "POST /api/v1/provider-profiles")
    provider_id = assert_json_key(response.json(), "id", "provider response")

    response = client.post(
        "/api/v1/policies",
        headers=headers,
        json={"name": f"Phase 6 Policy {suffix}", "rules": {}},
    )
    assert_status(response, 201, "POST /api/v1/policies")
    policy_id = assert_json_key(response.json(), "id", "policy response")

    response = client.post(
        "/api/v1/projects",
        headers=headers,
        json={
            "name": f"Phase 6 Smoke Project {suffix}",
            "description": "Created by scripts/phase6_smoke_test.py",
            "metadata": {"source": "phase6_smoke_test"},
        },
    )
    assert_status(response, 201, "POST /api/v1/projects")
    project_id = assert_json_key(response.json(), "id", "project response")

    response = client.post(
        f"/api/v1/projects/{project_id}/scopes",
        headers=headers,
        json={"name": f"Phase 6 Scope {suffix}", "rules": {"targets": ["review.local"]}},
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
            "title": f"Phase 6 Smoke Session {suffix}",
            "objective": "Validate evidence, findings, and reports.",
            "mode": "assisted",
        },
    )
    assert_status(response, 201, "POST /api/v1/sessions")
    session_id = assert_json_key(response.json(), "id", "session response")

    response = client.post(f"/api/v1/sessions/{session_id}/start", headers=headers)
    assert_status(response, 200, "POST /api/v1/sessions/{session_id}/start")
    _wait_for_status(client, session_id=session_id, wanted={"running"})

    events = client.get(f"/api/v1/sessions/{session_id}/events")
    assert_status(events, 200, "GET /api/v1/sessions/{session_id}/events")
    last_event_id = events.json()["items"][-1]["id"]

    response = client.post(
        f"/api/v1/sessions/{session_id}/agent/run",
        headers=headers,
        json={"max_turns": 3},
    )
    assert_status(response, 200, "POST /api/v1/sessions/{session_id}/agent/run")
    approval = _wait_for_pending_approval(client)

    response = client.post(
        f"/api/v1/approvals/{approval['id']}/approve",
        headers=headers,
        json={"note": "Approved by Phase 6 smoke test."},
    )
    assert_status(response, 200, "POST /api/v1/approvals/{approval_id}/approve")
    tool_call_id = assert_json_key(approval, "tool_call_id", "approval response")
    _wait_for_tool_call(client, session_id=session_id, tool_call_id=tool_call_id)

    evidence = _wait_for_evidence(client, session_id=session_id)
    if evidence.get("type") != "terminal":
        raise AssertionError("Expected terminal evidence from successful tool execution.")

    response = client.post(
        f"/api/v1/evidence/{evidence['id']}/candidate-finding",
        headers=headers,
        json={},
    )
    assert_status(response, 200, "POST /api/v1/evidence/{evidence_id}/candidate-finding")
    finding = _wait_for_finding(client, session_id=session_id, status="candidate")

    response = client.post(
        f"/api/v1/findings/{finding['id']}/review",
        headers=headers,
        json={"status": "confirmed", "review_note": "Confirmed by Phase 6 smoke test."},
    )
    assert_status(response, 200, "POST /api/v1/findings/{finding_id}/review")

    response = client.post(
        f"/api/v1/sessions/{session_id}/reports",
        headers=headers,
        json={"title": f"Phase 6 Report {suffix}"},
    )
    assert_status(response, 201, "POST /api/v1/sessions/{session_id}/reports")
    report_id = assert_json_key(response.json(), "id", "report response")

    response = client.post(f"/api/v1/reports/{report_id}/render", headers=headers)
    assert_status(response, 200, "POST /api/v1/reports/{report_id}/render")
    _wait_for_report(client, report_id=report_id, status="rendered")

    response = client.get(
        f"/api/v1/reports/{report_id}/export",
        params={"format": "markdown"},
    )
    assert_status(response, 200, "GET /api/v1/reports/{report_id}/export?format=markdown")
    if "# Phase 6 Report" not in response.json().get("content", ""):
        raise AssertionError("Markdown export did not include the report title.")

    response = client.get(f"/api/v1/reports/{report_id}/export", params={"format": "json"})
    assert_status(response, 200, "GET /api/v1/reports/{report_id}/export?format=json")
    if "Candidate runtime execution observation" not in response.json().get("content", ""):
        raise AssertionError("JSON export did not include the confirmed finding.")

    websocket_url = f"/ws/v1/sessions/{session_id}?last_event_id={last_event_id}"
    replayed_event_types: set[str] = set()
    with client.websocket_connect(websocket_url) as websocket:
        while True:
            message = websocket.receive_json()
            if message.get("type") == "connection.ready":
                break
            if message.get("type") == "session.event":
                replayed_event_types.add(message.get("event_type"))
    expected = {"evidence.created", "finding.created", "finding.reviewed", "report.rendered"}
    if not expected.issubset(replayed_event_types):
        raise AssertionError("WebSocket replay did not include Phase 6 review events.")

    response = client.post("/api/v1/auth/logout", headers=headers)
    assert_status(response, 200, "POST /api/v1/auth/logout")


def _wait_for_status(client: TestClient, *, session_id: str, wanted: set[str]) -> str:
    deadline = time.monotonic() + 60
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


def _wait_for_pending_approval(client: TestClient) -> dict[str, Any]:
    deadline = time.monotonic() + 60
    while time.monotonic() < deadline:
        response = client.get("/api/v1/approvals", params={"status": "pending"})
        assert_status(response, 200, "GET /api/v1/approvals")
        items = response.json().get("items", [])
        if items:
            return items[0]
        time.sleep(1)
    raise AssertionError("Timed out waiting for pending approval.")


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
                if "hello from agent" not in (tool_call.get("raw_output") or ""):
                    raise AssertionError("Tool output did not include fake agent command output.")
                return
            if status in {"failed", "timed_out", "cancelled", "denied"}:
                raise AssertionError(f"Tool call entered terminal failure status: {status}.")
        time.sleep(1)
    raise AssertionError("Timed out waiting for approved tool call execution.")


def _wait_for_evidence(client: TestClient, *, session_id: str) -> dict[str, Any]:
    deadline = time.monotonic() + 60
    while time.monotonic() < deadline:
        response = client.get(f"/api/v1/sessions/{session_id}/evidence")
        assert_status(response, 200, "GET /api/v1/sessions/{session_id}/evidence")
        items = response.json().get("items", [])
        if items:
            return items[0]
        time.sleep(1)
    raise AssertionError("Timed out waiting for automatic evidence.")


def _wait_for_finding(client: TestClient, *, session_id: str, status: str) -> dict[str, Any]:
    deadline = time.monotonic() + 60
    while time.monotonic() < deadline:
        response = client.get(f"/api/v1/sessions/{session_id}/findings")
        assert_status(response, 200, "GET /api/v1/sessions/{session_id}/findings")
        for finding in response.json().get("items", []):
            if finding.get("status") == status:
                return finding
        time.sleep(1)
    raise AssertionError(f"Timed out waiting for finding status {status}.")


def _wait_for_report(client: TestClient, *, report_id: str, status: str) -> dict[str, Any]:
    deadline = time.monotonic() + 60
    while time.monotonic() < deadline:
        response = client.get(f"/api/v1/reports/{report_id}")
        assert_status(response, 200, "GET /api/v1/reports/{report_id}")
        report = response.json()
        if report.get("status") == status:
            return report
        time.sleep(1)
    raise AssertionError(f"Timed out waiting for report status {status}.")


def main() -> int:
    parser = argparse.ArgumentParser(description="Run Phase 6 evidence/report smoke tests.")
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
    print("Phase 6 smoke test: ok")
    return 0


if __name__ == "__main__":
    sys.exit(main())
