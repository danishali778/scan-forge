import uuid
from datetime import UTC, datetime

from app.models.review import Evidence, Finding, Report
from app.models.session import SessionModel
from app.repositories.review import ReviewRepository

REPORT_FINDING_STATUSES = {"confirmed", "accepted_risk", "fixed"}


class ReportRenderer:
    def __init__(self, *, repository: ReviewRepository) -> None:
        self.repository = repository

    def build_content(self, *, session: SessionModel, report: Report) -> dict[str, object]:
        findings = [
            finding
            for finding in self.repository.list_findings(
                workspace_id=session.workspace_id,
                session_id=session.id,
            )
            if finding.status in REPORT_FINDING_STATUSES
        ]
        evidence = self.repository.list_evidence(
            workspace_id=session.workspace_id,
            session_id=session.id,
            limit=500,
        )
        evidence_by_id = {item.id: item for item in evidence}
        return {
            "title": report.title,
            "generated_at": datetime.now(UTC).isoformat(),
            "session": {
                "id": str(session.id),
                "project_id": str(session.project_id),
                "scope_id": str(session.scope_id),
                "title": session.title,
                "objective": session.objective,
                "status": session.status,
                "summary": session.summary,
            },
            "findings": [
                _finding_section(
                    finding,
                    evidence_by_id=evidence_by_id,
                    evidence_ids=[
                        link.evidence_id
                        for link in self.repository.list_finding_evidence(
                            finding_id=finding.id,
                        )
                    ],
                )
                for finding in findings
            ],
        }


def render_markdown(content: dict[str, object]) -> str:
    session = _dict(content.get("session"))
    findings = content.get("findings")
    finding_items = findings if isinstance(findings, list) else []
    lines = [
        f"# {content.get('title', 'Session Report')}",
        "",
        "## Session",
        "",
        f"- Session: {session.get('title', session.get('id', ''))}",
        f"- Objective: {session.get('objective', '')}",
        f"- Status: {session.get('status', '')}",
        "",
        "## Findings",
        "",
    ]
    if not finding_items:
        lines.extend(["No reviewed findings are included in this report.", ""])
    for index, finding in enumerate(finding_items, start=1):
        item = _dict(finding)
        lines.extend(
            [
                f"### {index}. {item.get('title', 'Finding')}",
                "",
                f"- Severity: {item.get('severity', '')}",
                f"- Confidence: {item.get('confidence', '')}",
                f"- Status: {item.get('status', '')}",
                "",
                "#### Description",
                str(item.get("description", "")),
                "",
                "#### Impact",
                str(item.get("impact", "")),
                "",
                "#### Reproduction Steps",
                str(item.get("reproduction_steps", "")),
                "",
                "#### Remediation",
                str(item.get("remediation", "")),
                "",
                "#### Evidence",
            ]
        )
        evidence_items = item.get("evidence")
        evidence_list = evidence_items if isinstance(evidence_items, list) else []
        if not evidence_list:
            lines.append("- No linked evidence.")
        for evidence in evidence_list:
            evidence_item = _dict(evidence)
            title = evidence_item.get("title", "Evidence")
            summary = evidence_item.get("summary", "")
            lines.append(f"- {title}: {summary}")
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def _finding_section(
    finding: Finding,
    *,
    evidence_by_id: dict[uuid.UUID, Evidence],
    evidence_ids: list[uuid.UUID],
) -> dict[str, object]:
    return {
        "id": str(finding.id),
        "title": finding.title,
        "status": finding.status,
        "severity": finding.severity,
        "confidence": finding.confidence,
        "affected_assets": _items(finding.affected_assets),
        "description": finding.description,
        "impact": finding.impact,
        "reproduction_steps": finding.reproduction_steps,
        "remediation": finding.remediation,
        "references": _items(finding.references),
        "evidence": [
            _evidence_summary(evidence_by_id[evidence_id])
            for evidence_id in evidence_ids
            if evidence_id in evidence_by_id
        ],
    }


def _evidence_summary(evidence: Evidence) -> dict[str, object]:
    return {
        "id": str(evidence.id),
        "type": evidence.type,
        "title": evidence.title,
        "summary": evidence.summary,
        "asset_id": str(evidence.asset_id) if evidence.asset_id else None,
    }


def _items(value: dict[str, object]) -> list[object]:
    items = value.get("items")
    return items if isinstance(items, list) else []


def _dict(value: object) -> dict[str, object]:
    return value if isinstance(value, dict) else {}
