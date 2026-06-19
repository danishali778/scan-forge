import uuid

from app.models.identity import AuthSession, User, Workspace
from sqlalchemy import select

from .conftest import login


def test_health_endpoint(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_first_login_bootstraps_workspace_user_and_session(client, db_session_factory):
    response = login(client)

    assert response.status_code == 200
    body = response.json()
    assert body["user"]["email"] == "owner@example.com"
    assert body["user"]["role"] == "Owner"
    assert "sessions.create" in body["user"]["permissions"]
    assert client.cookies.get("app_session")
    assert client.cookies.get("app_csrf")

    with db_session_factory() as db:
        assert db.scalar(select(Workspace)) is not None
        assert db.scalar(select(User).where(User.email == "owner@example.com")) is not None
        assert db.scalar(select(AuthSession).where(AuthSession.status == "active")) is not None


def test_unknown_user_denied_after_bootstrap(client, fake_supabase):
    assert login(client, email="owner@example.com").status_code == 200

    fake_supabase.next_user_id = uuid.uuid4()
    response = login(client, email="other@example.com")

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "permission_denied"


def test_me_authenticated_and_unauthenticated(client):
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 200
    assert response.json()["authenticated"] is False

    assert login(client).status_code == 200
    response = client.get("/api/v1/auth/me")

    assert response.status_code == 200
    body = response.json()
    assert body["authenticated"] is True
    assert body["email"] == "owner@example.com"
    assert "sessions.create" in body["permissions"]


def test_logout_revokes_session_and_clears_cookie(client, db_session_factory):
    assert login(client).status_code == 200
    csrf = client.cookies.get("app_csrf")

    response = client.post("/api/v1/auth/logout", headers={"X-CSRF-Token": csrf})

    assert response.status_code == 200
    with db_session_factory() as db:
        auth_session = db.scalar(select(AuthSession))
        assert auth_session.status == "revoked"


def test_refresh_updates_encrypted_refresh_token(client, db_session_factory):
    assert login(client).status_code == 200
    csrf = client.cookies.get("app_csrf")

    with db_session_factory() as db:
        before = db.scalar(select(AuthSession)).encrypted_refresh_token

    response = client.post("/api/v1/auth/refresh", headers={"X-CSRF-Token": csrf})

    assert response.status_code == 200
    with db_session_factory() as db:
        after = db.scalar(select(AuthSession)).encrypted_refresh_token
    assert after != before


def test_csrf_required_for_unsafe_authenticated_routes(client):
    assert login(client).status_code == 200

    response = client.post("/api/v1/projects", json={"name": "No CSRF"})

    assert response.status_code == 403
    assert response.json()["error"]["code"] == "csrf_failed"
