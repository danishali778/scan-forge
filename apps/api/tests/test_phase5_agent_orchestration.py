import uuid

from app.services.agents import AgentRunSessionRunner
from app.services.runtime import ToolExecutionRunner

from .conftest import login
from .test_phase3_session_engine import _run_plan_job


def _csrf(client) -> dict[str, str]:
    return {"X-CSRF-Token": client.cookies.get("app_csrf")}


def _create_fake_provider(client) -> dict:
    response = client.post(
        "/api/v1/provider-profiles",
        headers=_csrf(client),
        json={
            "name": "Fake provider",
            "provider_type": "fake",
            "agent_models": {"planner": "fake-agent", "executor": "fake-agent"},
        },
    )
    assert response.status_code == 201
    return response.json()


def _create_policy(client) -> dict:
    response = client.post(
        "/api/v1/policies",
        headers=_csrf(client),
        json={"name": "Phase 5 policy", "rules": {}},
    )
    assert response.status_code == 201
    return response.json()


def _create_project_scope_session(client, provider: dict, policy: dict) -> dict:
    project_response = client.post(
        "/api/v1/projects",
        json={"name": "Agent Project", "description": "Agent phase"},
        headers=_csrf(client),
    )
    assert project_response.status_code == 201
    project = project_response.json()

    scope_response = client.post(
        f"/api/v1/projects/{project['id']}/scopes",
        json={"name": "Agent Scope", "rules": {"allowed_hosts": ["agent.example.com"]}},
        headers=_csrf(client),
    )
    assert scope_response.status_code == 201
    scope = scope_response.json()

    session_response = client.post(
        "/api/v1/sessions",
        json={
            "project_id": project["id"],
            "scope_id": scope["id"],
            "provider_profile_id": provider["id"],
            "policy_id": policy["id"],
            "title": "Agent runtime smoke",
            "objective": "Validate the assisted agent loop.",
            "mode": "assisted",
        },
        headers=_csrf(client),
    )
    assert session_response.status_code == 201
    return session_response.json()


def _start_model_backed_session(client, fake_queue, db_session_factory) -> dict:
    provider = _create_fake_provider(client)
    policy = _create_policy(client)
    session = _create_project_scope_session(client, provider, policy)
    start = client.post(f"/api/v1/sessions/{session['id']}/start", headers=_csrf(client))
    assert start.status_code == 200
    _run_plan_job(db_session_factory, fake_queue.enqueued_job_ids[-1])
    detail = client.get(f"/api/v1/sessions/{session['id']}")
    assert detail.status_code == 200
    assert detail.json()["status"] == "running"
    return session


def test_tools_and_fake_provider_planning(client, fake_queue, db_session_factory):
    assert login(client).status_code == 200
    tools = client.get("/api/v1/tools")
    assert tools.status_code == 200
    tool_names = {tool["name"] for tool in tools.json()["items"]}
    assert {"terminal.execute", "file.write", "step.complete"}.issubset(tool_names)

    session = _start_model_backed_session(client, fake_queue, db_session_factory)

    tasks = client.get(f"/api/v1/sessions/{session['id']}/tasks")
    assert tasks.status_code == 200
    assert tasks.json()["items"][0]["title"] == "Prepare runtime workspace"

    messages = client.get(f"/api/v1/sessions/{session['id']}/agent-messages")
    assert messages.status_code == 200
    assert messages.json()["items"][0]["agent_role"] == "planner"

    events = client.get(f"/api/v1/sessions/{session['id']}/events").json()["items"]
    event_types = {event["event_type"] for event in events}
    assert {"agent.message", "agent.plan.created"}.issubset(event_types)


def test_agent_run_requests_approval_and_approval_queues_tool(
    client,
    fake_queue,
    fake_runtime,
    db_session_factory,
):
    assert login(client).status_code == 200
    session = _start_model_backed_session(client, fake_queue, db_session_factory)

    run_response = client.post(
        f"/api/v1/sessions/{session['id']}/agent/run",
        headers=_csrf(client),
        json={"max_turns": 3},
    )
    assert run_response.status_code == 200
    assert len(fake_queue.enqueued_agent_job_ids) == 1

    with db_session_factory() as db:
        assert AgentRunSessionRunner(
            db=db,
            worker_id="test-agent",
            queue_client=fake_queue,
        ).run(job_id=fake_queue.enqueued_agent_job_ids[-1])

    detail = client.get(f"/api/v1/sessions/{session['id']}")
    assert detail.status_code == 200
    assert detail.json()["status"] == "awaiting_approval"

    approvals = client.get("/api/v1/approvals")
    assert approvals.status_code == 200
    approval = approvals.json()["items"][0]
    assert approval["status"] == "pending"
    assert approval["requested_action"]["tool_name"] == "terminal.execute"

    no_csrf = client.post(f"/api/v1/approvals/{approval['id']}/approve", json={})
    assert no_csrf.status_code == 403

    approve = client.post(
        f"/api/v1/approvals/{approval['id']}/approve",
        headers=_csrf(client),
        json={"note": "Approved for test"},
    )
    assert approve.status_code == 200
    assert approve.json()["status"] == "approved"
    assert len(fake_queue.enqueued_tool_job_ids) == 1

    with db_session_factory() as db:
        assert ToolExecutionRunner(
            db=db,
            worker_id="test-runtime",
            runtime_client=fake_runtime,
        ).run(job_id=fake_queue.enqueued_tool_job_ids[-1])

    tool_calls = client.get(f"/api/v1/sessions/{session['id']}/tool-calls")
    assert tool_calls.status_code == 200
    assert tool_calls.json()["items"][0]["status"] == "succeeded"

    run_again = client.post(
        f"/api/v1/sessions/{session['id']}/agent/run",
        headers=_csrf(client),
        json={"max_turns": 1},
    )
    assert run_again.status_code == 200
    with db_session_factory() as db:
        assert AgentRunSessionRunner(
            db=db,
            worker_id="test-agent",
            queue_client=fake_queue,
        ).run(job_id=fake_queue.enqueued_agent_job_ids[-1])

    tasks = client.get(f"/api/v1/sessions/{session['id']}/tasks").json()["items"]
    assert any(step["status"] == "completed" for task in tasks for step in task["steps"])

    events = client.get(f"/api/v1/sessions/{session['id']}/events").json()["items"]
    event_types = {event["event_type"] for event in events}
    assert {
        "policy.decision",
        "approval.requested",
        "approval.resolved",
        "agent.step.completed",
    }.issubset(event_types)


def test_agent_api_token_without_csrf_and_workspace_isolation(
    client,
    fake_queue,
    db_session_factory,
):
    assert login(client).status_code == 200
    session = _start_model_backed_session(client, fake_queue, db_session_factory)
    token_response = client.post(
        "/api/v1/api-tokens",
        headers=_csrf(client),
        json={"name": "Agent token"},
    )
    assert token_response.status_code == 201
    bearer_headers = {"Authorization": f"Bearer {token_response.json()['token']}"}

    response = client.post(
        f"/api/v1/sessions/{session['id']}/agent/run",
        headers=bearer_headers,
        json={"max_turns": 1},
    )
    assert response.status_code == 200

    bad_session = client.get(f"/api/v1/sessions/{uuid.uuid4()}/agent-messages")
    assert bad_session.status_code == 404
