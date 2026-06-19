import uuid
from datetime import UTC, datetime, timedelta

from app.core.security import generate_token, hash_token
from app.models.control_plane import ApiToken, Secret
from app.models.identity import AuthSession, User, Workspace
from app.repositories.auth import AuthRepository
from sqlalchemy import select

from .conftest import login


def _csrf(client) -> dict[str, str]:
    return {"X-CSRF-Token": client.cookies.get("app_csrf")}


def _create_project(client, *, name: str = "Phase 2 Project") -> dict:
    response = client.post(
        "/api/v1/projects",
        json={"name": name, "metadata": {"phase": 2}},
        headers=_csrf(client),
    )
    assert response.status_code == 201
    return response.json()


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
            email="second@example.com",
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


def test_default_roles_permissions_and_invited_user_login_linking(client, fake_supabase):
    assert login(client).status_code == 200

    roles_response = client.get("/api/v1/roles")
    assert roles_response.status_code == 200
    roles = roles_response.json()["items"]
    by_name = {role["name"]: role for role in roles}
    assert {"Owner", "Admin", "Operator", "Reviewer", "Viewer"}.issubset(by_name)
    assert "provider_profiles.manage" in by_name["Owner"]["permissions"]

    invited_response = client.post(
        "/api/v1/users",
        headers=_csrf(client),
        json={
            "email": "teammate@example.com",
            "name": "Teammate",
            "role_id": by_name["Viewer"]["id"],
        },
    )
    assert invited_response.status_code == 201
    invited = invited_response.json()
    assert invited["status"] == "invited"
    assert invited["supabase_linked"] is False

    fake_supabase.next_user_id = uuid.uuid4()
    linked_response = login(client, email="teammate@example.com")

    assert linked_response.status_code == 200
    assert linked_response.json()["user"]["role"] == "Viewer"
    assert "projects.read" in linked_response.json()["user"]["permissions"]


def test_viewer_permission_blocks_mutation(client, fake_supabase):
    assert login(client).status_code == 200
    roles = client.get("/api/v1/roles").json()["items"]
    viewer_role_id = next(role["id"] for role in roles if role["name"] == "Viewer")
    assert client.post(
        "/api/v1/users",
        headers=_csrf(client),
        json={"email": "viewer@example.com", "role_id": viewer_role_id},
    ).status_code == 201

    fake_supabase.next_user_id = uuid.uuid4()
    assert login(client, email="viewer@example.com").status_code == 200

    read_response = client.get("/api/v1/projects")
    assert read_response.status_code == 200

    write_response = client.post(
        "/api/v1/projects",
        json={"name": "Viewer Cannot Create"},
        headers=_csrf(client),
    )
    assert write_response.status_code == 403
    assert write_response.json()["error"]["code"] == "permission_denied"


def test_api_token_auth_lifecycle(client, db_session_factory):
    assert login(client).status_code == 200

    create_response = client.post(
        "/api/v1/api-tokens",
        json={"name": "CI token"},
        headers=_csrf(client),
    )
    assert create_response.status_code == 201
    created = create_response.json()
    raw_token = created["token"]
    assert raw_token.startswith("sfg_live_")

    with db_session_factory() as db:
        stored = db.scalar(select(ApiToken).where(ApiToken.id == uuid.UUID(created["id"])))
        assert stored.token_hash == hash_token(raw_token)
        assert stored.token_hash != raw_token

    bearer_headers = {"Authorization": f"Bearer {raw_token}"}
    assert client.get("/api/v1/projects", headers=bearer_headers).status_code == 200

    no_csrf_create = client.post(
        "/api/v1/projects",
        json={"name": "Bearer Project"},
        headers=bearer_headers,
    )
    assert no_csrf_create.status_code == 201

    revoke_response = client.delete(
        f"/api/v1/api-tokens/{created['id']}",
        headers=_csrf(client),
    )
    assert revoke_response.status_code == 200
    assert revoke_response.json()["status"] == "revoked"

    rejected = client.get("/api/v1/projects", headers=bearer_headers)
    assert rejected.status_code == 401


def test_targets_providers_policies_audit_and_workspace_isolation(client, db_session_factory):
    assert login(client).status_code == 200
    project = _create_project(client)

    target_response = client.post(
        f"/api/v1/projects/{project['id']}/targets",
        headers=_csrf(client),
        json={"type": "domain", "value": "staging.example.com", "label": "Staging"},
    )
    assert target_response.status_code == 201
    target = target_response.json()

    assert client.get(f"/api/v1/targets/{target['id']}").status_code == 200
    patch_response = client.patch(
        f"/api/v1/targets/{target['id']}",
        headers=_csrf(client),
        json={"label": "Primary staging"},
    )
    assert patch_response.status_code == 200
    assert patch_response.json()["label"] == "Primary staging"

    provider_response = client.post(
        "/api/v1/provider-profiles",
        headers=_csrf(client),
        json={
            "name": "OpenAI default",
            "provider_type": "openai",
            "base_url": "https://api.openai.com/v1",
            "api_key": "secret-value",
        },
    )
    assert provider_response.status_code == 201
    provider = provider_response.json()
    assert "api_key" not in provider
    assert provider["has_credential"] is True

    with db_session_factory() as db:
        secret = db.scalar(select(Secret))
        assert secret is not None
        assert secret.ciphertext != "secret-value"
        assert "secret-value" not in secret.ciphertext

    policy_response = client.post(
        "/api/v1/policies",
        headers=_csrf(client),
        json={"name": "Default policy", "rules": {"approval_required": True}},
    )
    assert policy_response.status_code == 201
    policy = policy_response.json()

    audit_response = client.get("/api/v1/audit-events")
    assert audit_response.status_code == 200
    actions = {event["action"] for event in audit_response.json()["items"]}
    assert {"target.created", "provider_profile.created", "policy.created"}.issubset(actions)

    second_session_token, second_csrf_token = _create_second_workspace_session(db_session_factory)
    client.cookies.set("app_session", second_session_token)
    client.cookies.set("app_csrf", second_csrf_token)

    assert client.get(f"/api/v1/targets/{target['id']}").status_code == 404
    assert client.get(f"/api/v1/provider-profiles/{provider['id']}").status_code == 404
    assert client.get(f"/api/v1/policies/{policy['id']}").status_code == 404
