from app.services.memory import MemoryEmbedDocumentRunner

from .conftest import login
from .test_phase3_session_engine import _run_plan_job
from .test_phase5_agent_orchestration import (
    _create_fake_provider,
    _create_policy,
    _create_project_scope_session,
)
from .test_phase6_evidence_reporting import _create_note_evidence


def _csrf(client) -> dict[str, str]:
    return {"X-CSRF-Token": client.cookies.get("app_csrf")}


def _create_memory(client, session: dict, provider: dict, content: str | None = None) -> dict:
    response = client.post(
        "/api/v1/memory",
        headers=_csrf(client),
        json={
            "title": "Useful auth behavior",
            "summary": "Auth behavior learned during the session.",
            "content": content or "The auth flow uses backend-owned cookies and CSRF.",
            "visibility": "session",
            "project_id": session["project_id"],
            "session_id": session["id"],
            "source_type": "manual",
            "provider_profile_id": provider["id"],
        },
    )
    assert response.status_code == 201
    return response.json()


def _approve_and_embed(
    client,
    fake_queue,
    db_session_factory,
    document: dict,
    provider: dict,
) -> None:
    approve = client.post(
        f"/api/v1/memory/{document['id']}/approve",
        headers=_csrf(client),
        json={"review_note": "Approved for retrieval.", "provider_profile_id": provider["id"]},
    )
    assert approve.status_code == 200
    assert fake_queue.enqueued_memory_job_ids
    with db_session_factory() as db:
        assert MemoryEmbedDocumentRunner(
            db=db,
            worker_id="test-memory",
        ).run(job_id=fake_queue.enqueued_memory_job_ids[-1])


def test_memory_crud_approve_embed_and_search(client, fake_queue, db_session_factory):
    assert login(client).status_code == 200
    provider = _create_fake_provider(client)
    policy = _create_policy(client)
    session = _create_project_scope_session(client, provider, policy)

    tools = client.get("/api/v1/tools")
    assert tools.status_code == 200
    tool_names = {item["name"] for item in tools.json()["items"]}
    assert {"memory.search", "memory.propose"}.issubset(tool_names)

    document = _create_memory(client, session, provider)
    list_response = client.get("/api/v1/memory")
    assert list_response.status_code == 200
    assert list_response.json()["items"][0]["id"] == document["id"]

    update = client.patch(
        f"/api/v1/memory/{document['id']}",
        headers=_csrf(client),
        json={"summary": "Updated reusable auth memory."},
    )
    assert update.status_code == 200
    assert update.json()["summary"] == "Updated reusable auth memory."

    _approve_and_embed(client, fake_queue, db_session_factory, update.json(), provider)
    detail = client.get(f"/api/v1/memory/{document['id']}")
    assert detail.status_code == 200
    assert detail.json()["status"] == "approved"
    assert detail.json()["embedding_status"] == "embedded"

    search = client.post(
        "/api/v1/memory/search",
        json={
            "query": "How does auth use cookies?",
            "project_id": session["project_id"],
            "session_id": session["id"],
            "provider_profile_id": provider["id"],
        },
    )
    assert search.status_code == 200
    assert search.json()["items"][0]["document_id"] == document["id"]

    events = client.get(f"/api/v1/sessions/{session['id']}/events").json()["items"]
    event_types = {event["event_type"] for event in events}
    assert {"memory.document_created", "memory.embedding_created"}.issubset(event_types)


def test_secret_scan_blocks_memory_approval(client):
    assert login(client).status_code == 200
    provider = _create_fake_provider(client)
    policy = _create_policy(client)
    session = _create_project_scope_session(client, provider, policy)
    document = _create_memory(
        client,
        session,
        provider,
        content="api_key=abcdefghijklmnopqrstuvwxyz123456 should not be embedded",
    )

    response = client.post(
        f"/api/v1/memory/{document['id']}/approve",
        headers=_csrf(client),
        json={"provider_profile_id": provider["id"]},
    )
    assert response.status_code == 409

    detail = client.get(f"/api/v1/memory/{document['id']}")
    assert detail.status_code == 200
    assert detail.json()["status"] == "candidate"
    assert detail.json()["embedding_status"] == "blocked"
    assert detail.json()["secret_scan_status"] == "flagged"


def test_memory_candidates_from_evidence_and_finding(client, fake_queue, db_session_factory):
    assert login(client).status_code == 200
    provider = _create_fake_provider(client)
    policy = _create_policy(client)
    session = _create_project_scope_session(client, provider, policy)
    evidence = _create_note_evidence(client, session["id"])

    evidence_memory = client.post(
        f"/api/v1/evidence/{evidence['id']}/memory-candidate",
        headers=_csrf(client),
        json={"provider_profile_id": provider["id"]},
    )
    assert evidence_memory.status_code == 201
    assert evidence_memory.json()["source_evidence_id"] == evidence["id"]

    finding_response = client.post(
        f"/api/v1/sessions/{session['id']}/findings",
        headers=_csrf(client),
        json={
            "title": "Confirmed learning source",
            "severity": "low",
            "confidence": "medium",
            "affected_assets": [],
            "description": "This finding can become reusable knowledge.",
            "impact": "It is useful for later sessions.",
            "reproduction_steps": "Review the evidence.",
            "remediation": "Keep as a reviewed learning.",
            "references": [],
            "evidence_ids": [evidence["id"]],
        },
    )
    assert finding_response.status_code == 201
    finding = finding_response.json()

    finding_memory = client.post(
        f"/api/v1/findings/{finding['id']}/memory-candidate",
        headers=_csrf(client),
        json={"provider_profile_id": provider["id"]},
    )
    assert finding_memory.status_code == 201
    assert finding_memory.json()["source_finding_id"] == finding["id"]

    _approve_and_embed(client, fake_queue, db_session_factory, finding_memory.json(), provider)
    promote = client.post(
        f"/api/v1/memory/{finding_memory.json()['id']}/promote",
        headers=_csrf(client),
        json={"visibility": "project", "review_note": "Promoted for this project."},
    )
    assert promote.status_code == 200
    assert promote.json()["visibility"] == "project"
    assert promote.json()["session_id"] is None


def test_memory_api_token_auth_skips_csrf(client, fake_queue, db_session_factory):
    assert login(client).status_code == 200
    provider = _create_fake_provider(client)
    policy = _create_policy(client)
    session = _create_project_scope_session(client, provider, policy)

    token_response = client.post(
        "/api/v1/api-tokens",
        headers=_csrf(client),
        json={"name": "Memory token"},
    )
    assert token_response.status_code == 201
    bearer = {"Authorization": f"Bearer {token_response.json()['token']}"}

    denied = client.post(
        "/api/v1/memory",
        json={
            "title": "No CSRF",
            "summary": "Cookie requests need CSRF.",
            "content": "This should be denied.",
            "session_id": session["id"],
            "project_id": session["project_id"],
            "provider_profile_id": provider["id"],
        },
    )
    assert denied.status_code == 403

    created = client.post(
        "/api/v1/memory",
        headers=bearer,
        json={
            "title": "Token memory",
            "summary": "API tokens do not need CSRF.",
            "content": "Token-created memory can still be reviewed.",
            "session_id": session["id"],
            "project_id": session["project_id"],
            "provider_profile_id": provider["id"],
        },
    )
    assert created.status_code == 201

    approve = client.post(
        f"/api/v1/memory/{created.json()['id']}/approve",
        headers=bearer,
        json={"provider_profile_id": provider["id"]},
    )
    assert approve.status_code == 200
    assert fake_queue.enqueued_memory_job_ids
    with db_session_factory() as db:
        assert MemoryEmbedDocumentRunner(
            db=db,
            worker_id="test-memory",
        ).run(job_id=fake_queue.enqueued_memory_job_ids[-1])


def test_planner_receives_scoped_memory_context(client, fake_queue, db_session_factory):
    assert login(client).status_code == 200
    provider = _create_fake_provider(client)
    policy = _create_policy(client)
    session = _create_project_scope_session(client, provider, policy)
    document = _create_memory(
        client,
        session,
        provider,
        content="The planner should remember the backend auth cookie architecture.",
    )
    _approve_and_embed(client, fake_queue, db_session_factory, document, provider)

    start = client.post(f"/api/v1/sessions/{session['id']}/start", headers=_csrf(client))
    assert start.status_code == 200
    _run_plan_job(db_session_factory, fake_queue.enqueued_job_ids[-1])

    messages = client.get(f"/api/v1/sessions/{session['id']}/agent-messages")
    assert messages.status_code == 200
    planner_message = messages.json()["items"][0]
    assert planner_message["agent_role"] == "planner"
    assert planner_message["metadata"]["memory_result_count"] >= 1
