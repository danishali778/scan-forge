from app.services.agents import AgentRunSessionRunner
from app.services.review import CandidateFindingRunner, ReportRenderRunner
from app.services.runtime import ToolExecutionRunner

from .conftest import login
from .test_phase5_agent_orchestration import _start_model_backed_session


def _csrf(client) -> dict[str, str]:
    return {"X-CSRF-Token": client.cookies.get("app_csrf")}


def _create_note_evidence(client, session_id: str, title: str = "Manual note") -> dict:
    response = client.post(
        f"/api/v1/sessions/{session_id}/evidence",
        headers=_csrf(client),
        json={
            "type": "note",
            "title": title,
            "summary": "A short reviewable note.",
            "content": "Observed a harmless runtime behavior.",
        },
    )
    assert response.status_code == 201
    return response.json()


def _run_agent_to_successful_tool_call(
    client,
    fake_queue,
    fake_runtime,
    fake_storage,
    db_session_factory,
    session_id: str,
) -> None:
    run_response = client.post(
        f"/api/v1/sessions/{session_id}/agent/run",
        headers=_csrf(client),
        json={"max_turns": 3},
    )
    assert run_response.status_code == 200

    with db_session_factory() as db:
        assert AgentRunSessionRunner(
            db=db,
            worker_id="test-agent",
            queue_client=fake_queue,
        ).run(job_id=fake_queue.enqueued_agent_job_ids[-1])

    approval = client.get("/api/v1/approvals").json()["items"][0]
    approve = client.post(
        f"/api/v1/approvals/{approval['id']}/approve",
        headers=_csrf(client),
        json={"note": "Approved for evidence test"},
    )
    assert approve.status_code == 200

    with db_session_factory() as db:
        assert ToolExecutionRunner(
            db=db,
            worker_id="test-runtime",
            runtime_client=fake_runtime,
            storage_adapter=fake_storage,
        ).run(job_id=fake_queue.enqueued_tool_job_ids[-1])


def test_successful_terminal_tool_call_creates_evidence(
    client,
    fake_queue,
    fake_runtime,
    fake_storage,
    db_session_factory,
):
    assert login(client).status_code == 200
    session = _start_model_backed_session(client, fake_queue, db_session_factory)

    _run_agent_to_successful_tool_call(
        client,
        fake_queue,
        fake_runtime,
        fake_storage,
        db_session_factory,
        session["id"],
    )

    evidence_response = client.get(f"/api/v1/sessions/{session['id']}/evidence")
    assert evidence_response.status_code == 200
    evidence = evidence_response.json()["items"][0]
    assert evidence["type"] == "terminal"
    assert evidence["created_by_agent"] is True
    assert "python -c print('hello from agent')" in evidence["content"]

    events = client.get(f"/api/v1/sessions/{session['id']}/events").json()["items"]
    assert "evidence.created" in {event["event_type"] for event in events}


def test_large_manual_evidence_is_stored_as_file_asset(
    client,
    fake_queue,
    fake_storage,
    db_session_factory,
):
    assert login(client).status_code == 200
    session = _start_model_backed_session(client, fake_queue, db_session_factory)
    content = "x" * 40_000

    response = client.post(
        f"/api/v1/sessions/{session['id']}/evidence",
        headers=_csrf(client),
        json={
            "type": "note",
            "title": "Large evidence",
            "summary": "Large content is pushed into artifact storage.",
            "content": content,
        },
    )

    assert response.status_code == 201
    evidence = response.json()
    assert evidence["content"] is None
    assert evidence["asset_id"] is not None
    assert fake_storage.objects

    asset_response = client.get(f"/api/v1/file-assets/{evidence['asset_id']}/content")
    assert asset_response.status_code == 200
    assert asset_response.json()["content"] == content


def test_finding_review_and_report_render_export(
    client,
    fake_queue,
    fake_storage,
    db_session_factory,
):
    assert login(client).status_code == 200
    session = _start_model_backed_session(client, fake_queue, db_session_factory)
    evidence = _create_note_evidence(client, session["id"])

    finding_response = client.post(
        f"/api/v1/sessions/{session['id']}/findings",
        headers=_csrf(client),
        json={
            "title": "Reviewed observation",
            "severity": "medium",
            "confidence": "medium",
            "affected_assets": ["runtime"],
            "description": "A reviewed observation was captured.",
            "impact": "The observation can be included in the final report.",
            "reproduction_steps": "Review the linked evidence.",
            "remediation": "No remediation is required for this test.",
            "references": [],
            "evidence_ids": [evidence["id"]],
        },
    )
    assert finding_response.status_code == 201
    finding = finding_response.json()
    assert finding["status"] == "needs_review"

    review_response = client.post(
        f"/api/v1/findings/{finding['id']}/review",
        headers=_csrf(client),
        json={"status": "confirmed", "review_note": "Confirmed for report."},
    )
    assert review_response.status_code == 200
    assert review_response.json()["status"] == "confirmed"

    report_response = client.post(
        f"/api/v1/sessions/{session['id']}/reports",
        headers=_csrf(client),
        json={"title": "Phase 6 Report"},
    )
    assert report_response.status_code == 201
    report = report_response.json()

    render_response = client.post(
        f"/api/v1/reports/{report['id']}/render",
        headers=_csrf(client),
    )
    assert render_response.status_code == 200
    assert fake_queue.enqueued_report_job_ids
    with db_session_factory() as db:
        assert ReportRenderRunner(
            db=db,
            worker_id="test-report",
            storage_adapter=fake_storage,
        ).run(job_id=fake_queue.enqueued_report_job_ids[-1])

    rendered = client.get(f"/api/v1/reports/{report['id']}")
    assert rendered.status_code == 200
    assert rendered.json()["status"] == "rendered"
    assert rendered.json()["content"]["findings"][0]["title"] == "Reviewed observation"

    markdown_export = client.get(
        f"/api/v1/reports/{report['id']}/export",
        params={"format": "markdown"},
    )
    assert markdown_export.status_code == 200
    assert "# Phase 6 Report" in markdown_export.json()["content"]

    json_export = client.get(
        f"/api/v1/reports/{report['id']}/export",
        params={"format": "json"},
    )
    assert json_export.status_code == 200
    assert '"Reviewed observation"' in json_export.json()["content"]

    events = client.get(f"/api/v1/sessions/{session['id']}/events").json()["items"]
    event_types = {event["event_type"] for event in events}
    assert {"finding.reviewed", "report.rendered", "report.exported"}.issubset(event_types)


def test_candidate_finding_generation_creates_candidate_only(
    client,
    fake_queue,
    db_session_factory,
):
    assert login(client).status_code == 200
    session = _start_model_backed_session(client, fake_queue, db_session_factory)
    evidence = _create_note_evidence(client, session["id"], title="Analyst source")

    response = client.post(
        f"/api/v1/evidence/{evidence['id']}/candidate-finding",
        headers=_csrf(client),
        json={},
    )
    assert response.status_code == 200
    assert fake_queue.enqueued_finding_job_ids

    with db_session_factory() as db:
        assert CandidateFindingRunner(
            db=db,
            worker_id="test-analyst",
        ).run(job_id=fake_queue.enqueued_finding_job_ids[-1])

    findings = client.get(f"/api/v1/sessions/{session['id']}/findings")
    assert findings.status_code == 200
    finding = findings.json()["items"][0]
    assert finding["status"] == "candidate"
    assert finding["evidence_ids"] == [evidence["id"]]


def test_evidence_cookie_csrf_and_api_token_auth(
    client,
    fake_queue,
    db_session_factory,
):
    assert login(client).status_code == 200
    session = _start_model_backed_session(client, fake_queue, db_session_factory)

    no_csrf = client.post(
        f"/api/v1/sessions/{session['id']}/evidence",
        json={"type": "note", "title": "No CSRF", "summary": "Denied."},
    )
    assert no_csrf.status_code == 403

    token_response = client.post(
        "/api/v1/api-tokens",
        headers=_csrf(client),
        json={"name": "Phase 6 token"},
    )
    assert token_response.status_code == 201

    bearer = {"Authorization": f"Bearer {token_response.json()['token']}"}
    evidence = client.post(
        f"/api/v1/sessions/{session['id']}/evidence",
        headers=bearer,
        json={"type": "note", "title": "Token evidence", "summary": "Allowed."},
    )
    assert evidence.status_code == 201
