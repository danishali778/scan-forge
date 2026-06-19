import json
import uuid

from sqlalchemy.orm import Session

from app.agents.roles.analyst import AnalystAgent
from app.core.config import get_settings
from app.domain.exceptions import DomainError
from app.integrations.storage import StorageAdapter, SupabaseStorageAdapter
from app.repositories.control_plane import ConfigurationRepository
from app.repositories.review import ReviewRepository
from app.repositories.sessions import SessionRepository
from app.services.agents.providers import load_session_provider
from app.services.review.artifacts import ArtifactWriter
from app.services.review.rendering import ReportRenderer, render_markdown


class CandidateFindingRunner:
    def __init__(self, *, db: Session, worker_id: str) -> None:
        self.db = db
        self.sessions = SessionRepository(db)
        self.review = ReviewRepository(db)
        self.configuration = ConfigurationRepository(db)
        self.worker_id = worker_id
        self.settings = get_settings()

    def run(self, *, job_id: str) -> bool:
        job = self.sessions.get_job_by_id(job_id=uuid.UUID(job_id))
        if job is None:
            return False
        if job.status == "succeeded":
            return True

        claimed = self.sessions.claim_job(job, worker_id=self.worker_id)
        if claimed is None:
            return False
        if claimed.session_id is None:
            self.sessions.fail_job(claimed, error="Finding proposal job is missing a session.")
            self.db.commit()
            return False

        self._emit_job_event(claimed, "running")
        self.db.commit()

        try:
            self._run(claimed.id)
            return True
        except Exception as exc:
            self.db.rollback()
            self._mark_failed(job_id=claimed.id, error=str(exc))
            raise

    def _run(self, job_id: uuid.UUID) -> None:
        job = self.sessions.get_job_by_id(job_id=job_id)
        if job is None or job.session_id is None:
            raise RuntimeError("Finding proposal job was not found.")
        session = self.sessions.get_session(
            workspace_id=job.workspace_id,
            session_id=job.session_id,
        )
        if session is None:
            raise RuntimeError("Finding proposal session was not found.")

        evidence_ids = _uuid_list(job.payload.get("evidence_ids"))
        if not evidence_ids:
            raise DomainError("Finding proposal requires at least one evidence ID.")

        evidence_items = []
        for evidence_id in evidence_ids:
            evidence = self.review.get_evidence(
                workspace_id=session.workspace_id,
                evidence_id=evidence_id,
            )
            if evidence is None or evidence.session_id != session.id:
                raise DomainError("Finding evidence must belong to the job session.")
            evidence_items.append(evidence)

        output, provider_metadata = self._generate(session=session, evidence_items=evidence_items)
        finding = self.review.create_finding(
            workspace_id=session.workspace_id,
            project_id=session.project_id,
            session_id=session.id,
            title=output["title"],
            status="candidate",
            severity=output["severity"],
            confidence=output["confidence"],
            affected_assets={"items": output["affected_assets"]},
            description=output["description"],
            impact=output["impact"],
            reproduction_steps=output["reproduction_steps"],
            remediation=output["remediation"],
            references={"items": output["references"]},
            created_by_agent=True,
        )
        for evidence in evidence_items:
            self.review.attach_evidence(finding_id=finding.id, evidence_id=evidence.id)

        message = self.sessions.create_agent_message(
            workspace_id=session.workspace_id,
            session_id=session.id,
            agent_role="analyst",
            message_type="assistant",
            content=str(provider_metadata.get("content", json.dumps(output))),
            metadata={
                "summary": "Candidate finding proposed from evidence.",
                "finding_id": str(finding.id),
                "model": provider_metadata.get("model"),
                "provider_type": provider_metadata.get("provider_type"),
            },
            token_input=_int_or_none(provider_metadata.get("token_input")),
            token_output=_int_or_none(provider_metadata.get("token_output")),
        )
        self.sessions.create_event(
            workspace_id=session.workspace_id,
            session_id=session.id,
            event_type="agent.message",
            payload={"message_id": str(message.id), "agent_role": "analyst"},
            actor_type="system",
            actor_id=self.worker_id,
        )
        self.sessions.create_event(
            workspace_id=session.workspace_id,
            session_id=session.id,
            event_type="finding.created",
            payload={"finding_id": str(finding.id), "status": finding.status},
            actor_type="system",
            actor_id=self.worker_id,
        )
        self.sessions.succeed_job(
            job,
            result={"finding_id": str(finding.id), "evidence_count": len(evidence_items)},
        )
        self._emit_job_event(job, "succeeded")
        self.db.commit()

    def _generate(self, *, session, evidence_items) -> tuple[dict[str, object], dict[str, object]]:
        provider = load_session_provider(
            repository=self.configuration,
            session=session,
            settings=self.settings,
        )
        evidence_context = [
            {
                "id": str(evidence.id),
                "type": evidence.type,
                "title": evidence.title,
                "summary": evidence.summary,
                "content_excerpt": (evidence.content or "")[:1000],
            }
            for evidence in evidence_items
        ]
        if provider is None:
            return _fallback_candidate(evidence_context), {}

        context: dict[str, object] = {
            "session": {
                "id": str(session.id),
                "objective": session.objective,
                "mode": session.mode,
            },
            "evidence": evidence_context,
        }
        output = AnalystAgent(provider=provider.client, model=provider.model).run(context)
        provider_response = _dict(context.get("provider_response"))
        return output.model_dump(), provider_response

    def _mark_failed(self, *, job_id: uuid.UUID, error: str) -> None:
        job = self.sessions.get_job_by_id(job_id=job_id)
        if job is None:
            return
        self.sessions.fail_job(job, error=error)
        self._emit_job_event(job, "failed")
        self.db.commit()

    def _emit_job_event(self, job, status: str) -> None:
        if job.session_id is None:
            return
        self.sessions.create_event(
            workspace_id=job.workspace_id,
            session_id=job.session_id,
            event_type="job.updated",
            payload={"job_id": str(job.id), "status": status, "type": job.type},
            actor_type="system",
            actor_id=self.worker_id,
        )


class ReportRenderRunner:
    def __init__(
        self,
        *,
        db: Session,
        worker_id: str,
        storage_adapter: StorageAdapter | None = None,
    ) -> None:
        self.db = db
        self.sessions = SessionRepository(db)
        self.review = ReviewRepository(db)
        self.worker_id = worker_id
        self.settings = get_settings()
        self.storage = storage_adapter or SupabaseStorageAdapter(settings=self.settings)
        self.artifacts = ArtifactWriter(
            repository=self.review,
            storage=self.storage,
            settings=self.settings,
        )

    def run(self, *, job_id: str) -> bool:
        job = self.sessions.get_job_by_id(job_id=uuid.UUID(job_id))
        if job is None:
            return False
        if job.status == "succeeded":
            return True

        claimed = self.sessions.claim_job(job, worker_id=self.worker_id)
        if claimed is None:
            return False
        if claimed.session_id is None:
            self.sessions.fail_job(claimed, error="Report render job is missing a session.")
            self.db.commit()
            return False

        self._emit_job_event(claimed, "running")
        self.db.commit()

        try:
            self._run(claimed.id)
            return True
        except Exception as exc:
            self.db.rollback()
            self._mark_failed(job_id=claimed.id, error=str(exc))
            raise

    def _run(self, job_id: uuid.UUID) -> None:
        job = self.sessions.get_job_by_id(job_id=job_id)
        if job is None or job.session_id is None:
            raise RuntimeError("Report render job was not found.")
        report_id = job.payload.get("report_id")
        if not isinstance(report_id, str):
            raise RuntimeError("Report render job is missing report_id.")

        report = self.review.get_report(
            workspace_id=job.workspace_id,
            report_id=uuid.UUID(report_id),
        )
        if report is None or report.session_id != job.session_id:
            raise RuntimeError("Report was not found.")
        session = self.sessions.get_session(
            workspace_id=report.workspace_id,
            session_id=report.session_id,
        )
        if session is None:
            raise RuntimeError("Report session was not found.")

        content = ReportRenderer(repository=self.review).build_content(
            session=session,
            report=report,
        )
        markdown = render_markdown(content)
        markdown_asset = self.artifacts.store_bytes(
            workspace_id=report.workspace_id,
            prefix=self.settings.report_export_storage_prefix,
            filename=f"{report.title}.md",
            content=markdown.encode("utf-8"),
            mime_type="text/markdown",
            metadata={"report_id": str(report.id), "format": "markdown"},
            created_by=report.created_by,
        )
        json_asset = self.artifacts.store_bytes(
            workspace_id=report.workspace_id,
            prefix=self.settings.report_export_storage_prefix,
            filename=f"{report.title}.json",
            content=json.dumps(content, indent=2, sort_keys=True).encode("utf-8"),
            mime_type="application/json",
            metadata={"report_id": str(report.id), "format": "json"},
            created_by=report.created_by,
        )
        self.review.update_report(
            report,
            status="rendered",
            content=content,
            asset_id=markdown_asset.id,
        )
        self.sessions.create_event(
            workspace_id=report.workspace_id,
            session_id=report.session_id,
            event_type="report.rendered",
            payload={"report_id": str(report.id)},
            actor_type="system",
            actor_id=self.worker_id,
        )
        for asset, export_format in (
            (markdown_asset, "markdown"),
            (json_asset, "json"),
        ):
            self.sessions.create_event(
                workspace_id=report.workspace_id,
                session_id=report.session_id,
                event_type="report.exported",
                payload={
                    "report_id": str(report.id),
                    "format": export_format,
                    "asset_id": str(asset.id),
                },
                actor_type="system",
                actor_id=self.worker_id,
            )
        self.sessions.succeed_job(
            job,
            result={"report_id": str(report.id), "asset_id": str(markdown_asset.id)},
        )
        self._emit_job_event(job, "succeeded")
        self.db.commit()

    def _mark_failed(self, *, job_id: uuid.UUID, error: str) -> None:
        job = self.sessions.get_job_by_id(job_id=job_id)
        if job is None:
            return
        self.sessions.fail_job(job, error=error)
        self._emit_job_event(job, "failed")
        self.db.commit()

    def _emit_job_event(self, job, status: str) -> None:
        if job.session_id is None:
            return
        self.sessions.create_event(
            workspace_id=job.workspace_id,
            session_id=job.session_id,
            event_type="job.updated",
            payload={"job_id": str(job.id), "status": status, "type": job.type},
            actor_type="system",
            actor_id=self.worker_id,
        )


def _uuid_list(value: object) -> list[uuid.UUID]:
    if not isinstance(value, list):
        return []
    items = []
    for item in value:
        if isinstance(item, str):
            items.append(uuid.UUID(item))
    return items


def _fallback_candidate(evidence_context: list[dict[str, object]]) -> dict[str, object]:
    title = "Candidate evidence observation"
    if evidence_context:
        title = f"Candidate observation from {evidence_context[0]['title']}"
    return {
        "title": title,
        "severity": "low",
        "confidence": "medium",
        "affected_assets": [],
        "description": "Evidence was captured and is ready for human review.",
        "impact": "The observation may be useful when preparing the final assessment.",
        "reproduction_steps": "Review the linked evidence record.",
        "remediation": "Review and classify this candidate before reporting.",
        "references": [],
    }


def _dict(value: object) -> dict[str, object]:
    return value if isinstance(value, dict) else {}


def _int_or_none(value: object) -> int | None:
    return value if isinstance(value, int) else None
