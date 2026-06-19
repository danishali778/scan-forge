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
    response = client.get("/api/v1/health")
    assert_status(response, 200, "GET /api/v1/health")

    response = client.get("/api/v1/api-tokens")
    assert_status(response, 401, "GET /api/v1/api-tokens without auth")


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
    suffix = uuid.uuid4().hex[:8]

    response = client.get("/api/v1/workspace")
    assert_status(response, 200, "GET /api/v1/workspace")

    response = client.get("/api/v1/roles")
    assert_status(response, 200, "GET /api/v1/roles")
    role_names = {role["name"] for role in response.json().get("items", [])}
    if "Owner" not in role_names:
        raise AssertionError("Owner role was not returned.")

    response = client.get("/api/v1/users")
    assert_status(response, 200, "GET /api/v1/users")

    response = client.post(
        "/api/v1/api-tokens",
        headers=headers,
        json={"name": f"Phase 2 Smoke Token {suffix}"},
    )
    assert_status(response, 201, "POST /api/v1/api-tokens")
    token_payload = response.json()
    raw_token = assert_json_key(token_payload, "token", "api token response")
    token_id = assert_json_key(token_payload, "id", "api token response")
    bearer_headers = {"Authorization": f"Bearer {raw_token}"}

    response = client.get("/api/v1/projects", headers=bearer_headers)
    assert_status(response, 200, "GET /api/v1/projects with API token")

    response = client.post(
        "/api/v1/projects",
        headers=bearer_headers,
        json={
            "name": f"Phase 2 Smoke Project {suffix}",
            "description": "Created by scripts/phase2_smoke_test.py",
            "metadata": {"source": "phase2_smoke_test"},
        },
    )
    assert_status(response, 201, "POST /api/v1/projects with API token")
    project_id = assert_json_key(response.json(), "id", "project response")

    response = client.post(
        f"/api/v1/projects/{project_id}/targets",
        headers=headers,
        json={
            "type": "domain",
            "value": f"smoke-{suffix}.example.com",
            "label": "Smoke target",
        },
    )
    assert_status(response, 201, "POST /api/v1/projects/{project_id}/targets")
    target_id = assert_json_key(response.json(), "id", "target response")

    response = client.patch(
        f"/api/v1/targets/{target_id}",
        headers=headers,
        json={"label": "Updated smoke target"},
    )
    assert_status(response, 200, "PATCH /api/v1/targets/{target_id}")

    response = client.get(f"/api/v1/projects/{project_id}/targets")
    assert_status(response, 200, "GET /api/v1/projects/{project_id}/targets")

    response = client.post(
        "/api/v1/provider-profiles",
        headers=headers,
        json={
            "name": f"Phase 2 Smoke Provider {suffix}",
            "provider_type": "openai",
            "base_url": "https://api.openai.com/v1",
            "api_key": f"smoke-secret-{suffix}",
            "agent_models": {},
            "options": {},
            "budgets": {},
        },
    )
    assert_status(response, 201, "POST /api/v1/provider-profiles")
    provider_payload = response.json()
    if "api_key" in provider_payload or provider_payload.get("has_credential") is not True:
        raise AssertionError("Provider profile response leaked or missed credential state.")
    provider_id = assert_json_key(provider_payload, "id", "provider profile response")

    response = client.patch(
        f"/api/v1/provider-profiles/{provider_id}",
        headers=headers,
        json={"options": {"temperature": 0}},
    )
    assert_status(response, 200, "PATCH /api/v1/provider-profiles/{provider_id}")

    response = client.post(
        "/api/v1/policies",
        headers=headers,
        json={
            "name": f"Phase 2 Smoke Policy {suffix}",
            "description": "Smoke policy",
            "rules": {"approval_required": True},
        },
    )
    assert_status(response, 201, "POST /api/v1/policies")
    policy_id = assert_json_key(response.json(), "id", "policy response")

    response = client.patch(
        f"/api/v1/policies/{policy_id}",
        headers=headers,
        json={"rules": {"approval_required": True, "max_runtime_minutes": 30}},
    )
    assert_status(response, 200, "PATCH /api/v1/policies/{policy_id}")

    response = client.post(
        f"/api/v1/projects/{project_id}/scopes",
        headers=headers,
        json={
            "name": f"Smoke Scope {suffix}",
            "rules": {"targets": [f"smoke-{suffix}.example.com"]},
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
            "provider_profile_id": provider_id,
            "policy_id": policy_id,
            "title": f"Phase 2 Smoke Session {suffix}",
            "objective": "Validate Phase 2 provider and policy attachment.",
            "mode": "assisted",
        },
    )
    assert_status(response, 201, "POST /api/v1/sessions with provider/policy")

    response = client.get("/api/v1/audit-events")
    assert_status(response, 200, "GET /api/v1/audit-events")
    actions = {event["action"] for event in response.json().get("items", [])}
    expected_actions = {"api_token.created", "target.created", "provider_profile.created"}
    if not expected_actions.issubset(actions):
        raise AssertionError(f"Audit events missing expected actions: {expected_actions - actions}")

    response = client.delete(f"/api/v1/targets/{target_id}", headers=headers)
    assert_status(response, 200, "DELETE /api/v1/targets/{target_id}")

    response = client.delete(f"/api/v1/api-tokens/{token_id}", headers=headers)
    assert_status(response, 200, "DELETE /api/v1/api-tokens/{token_id}")

    response = client.post("/api/v1/auth/logout", headers=headers)
    assert_status(response, 200, "POST /api/v1/auth/logout")


def main() -> int:
    parser = argparse.ArgumentParser(description="Run Phase 2 backend smoke tests.")
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
    print("Phase 2 smoke test: ok")
    return 0


if __name__ == "__main__":
    sys.exit(main())
