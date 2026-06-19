import uuid
from datetime import UTC, datetime, timedelta

from app.core.security import generate_token, hash_token
from app.models.identity import AuthSession, Role, RolePermission, User, Workspace

from .conftest import login


def _csrf(client) -> dict[str, str]:
    return {"X-CSRF-Token": client.cookies.get("app_csrf")}


def _create_project_scope_session(client):
    project_response = client.post(
        "/api/v1/projects",
        json={"name": "Staging", "description": "Staging assets"},
        headers=_csrf(client),
    )
    assert project_response.status_code == 201
    project = project_response.json()

    scope_response = client.post(
        f"/api/v1/projects/{project['id']}/scopes",
        json={"name": "Default Scope", "rules": {"allowed_hosts": ["staging.example.com"]}},
        headers=_csrf(client),
    )
    assert scope_response.status_code == 201
    scope = scope_response.json()

    session_response = client.post(
        "/api/v1/sessions",
        json={
            "project_id": project["id"],
            "scope_id": scope["id"],
            "title": "External staging review",
            "objective": "Assess staging.",
            "mode": "assisted",
        },
        headers=_csrf(client),
    )
    assert session_response.status_code == 201
    session = session_response.json()
    return project, scope, session


def test_project_scope_session_crud_and_events(client):
    assert login(client).status_code == 200
    project, scope, session = _create_project_scope_session(client)

    projects = client.get("/api/v1/projects")
    assert projects.status_code == 200
    assert projects.json()["items"][0]["id"] == project["id"]

    scopes = client.get(f"/api/v1/projects/{project['id']}/scopes")
    assert scopes.status_code == 200
    assert scopes.json()["items"][0]["id"] == scope["id"]

    sessions = client.get("/api/v1/sessions")
    assert sessions.status_code == 200
    assert sessions.json()["items"][0]["id"] == session["id"]

    detail = client.get(f"/api/v1/sessions/{session['id']}")
    assert detail.status_code == 200
    assert detail.json()["status"] == "draft"

    events = client.get(f"/api/v1/sessions/{session['id']}/events")
    assert events.status_code == 200
    assert events.json()["items"][0]["event_type"] == "session.created"


def test_workspace_isolation(client, db_session_factory):
    assert login(client).status_code == 200
    _, _, session = _create_project_scope_session(client)

    second_session_token = generate_token()
    second_csrf_token = generate_token()
    with db_session_factory() as db:
        workspace = Workspace(name="Second Workspace", slug="second", settings={})
        db.add(workspace)
        db.flush()
        role = Role(workspace_id=workspace.id, name="Owner", description=None)
        db.add(role)
        db.flush()
        db.add(RolePermission(role_id=role.id, permission="sessions.read"))
        user = User(
            workspace_id=workspace.id,
            supabase_user_id=uuid.uuid4(),
            email="second@example.com",
            name="Second",
            type="human",
            status="active",
            role_id=role.id,
        )
        db.add(user)
        db.flush()
        db.add(
            AuthSession(
                workspace_id=workspace.id,
                user_id=user.id,
                session_hash=hash_token(second_session_token),
                csrf_hash=hash_token(second_csrf_token),
                status="active",
                expires_at=datetime.now(UTC) + timedelta(hours=1),
                created_at=datetime.now(UTC),
            )
        )
        db.commit()

    client.cookies.set("app_session", second_session_token)
    client.cookies.set("app_csrf", second_csrf_token)

    sessions = client.get("/api/v1/sessions")
    assert sessions.status_code == 200
    assert sessions.json()["items"] == []

    detail = client.get(f"/api/v1/sessions/{session['id']}")
    assert detail.status_code == 404
