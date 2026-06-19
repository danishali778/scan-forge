import json
import uuid
from pathlib import PurePosixPath

from sqlalchemy.orm import Session

from app.auth.dependencies import AuthContext
from app.core.config import Settings
from app.domain.exceptions import ConflictError, DomainError, NotFoundError
from app.domain.ids import parse_uuid
from app.domain.pagination import Page
from app.integrations.queue import QueueClient
from app.integrations.runtime import RuntimeServiceClient
from app.integrations.storage import StorageAdapter
from app.models.review import Evidence, Finding
from app.repositories.control_plane import AuditRepository
from app.repositories.review import ReviewRepository
from app.repositories.sessions import SessionRepository
from app.schemas.review import (
    CandidateFindingRequest,
    EvidenceCreateRequest,
    EvidenceFromFileRequest,
    EvidenceFromToolCallRequest,
    EvidenceResponse,
    EvidenceUpdateRequest,
    FileAssetContentResponse,
    FileAssetResponse,
    FindingCreateRequest,
    FindingEvidenceAttachRequest,
    FindingResponse,
    FindingReviewRequest,
    FindingUpdateRequest,
    ReportCreateRequest,
    ReportExportResponse,
    ReportResponse,
    ReportUpdateRequest,
)
from app.schemas.sessions import JobResponse
from app.services.audit import AuditRecorder
from app.services.review.artifacts import ArtifactWriter
from app.services.review.rendering import ReportRenderer, render_markdown
from app.services.sessions.guards import get_session_or_raise
from app.services.sessions.mappers import job_response

FINDING_REVIEW_STATUSES = {
    "confirmed",
    "false_positive",
    "accepted_risk",
    "fixed",
    "archived",
}


class ReviewService:
    def __init__(
        self,
        *,
        db: Session,
        review_repository: ReviewRepository,
        session_repository: SessionRepository,
        audit_repository: AuditRepository,
        queue_client: QueueClient,
        runtime_client: RuntimeServiceClient,
        storage_adapter: StorageAdapter,
        settings: Settings,
    ) -> None:
        self.db = db
        self.review = review_repository
        self.sessions = session_repository
        self.audit = AuditRecorder(audit_repository)
        self.queue = queue_client
        self.runtime = runtime_client
        self.storage = storage_adapter
        self.settings = settings
        self.artifacts = ArtifactWriter(
            repository=review_repository,
            storage=storage_adapter,
            settings=settings,
        )

    def get_file_asset(self, *, asset_id: str, auth: AuthContext) -> FileAssetResponse:
        asset = self._get_asset(asset_id=asset_id, auth=auth)
        return file_asset_response(asset)

    def get_file_asset_content(
        self,
        *,
        asset_id: str,
        auth: AuthContext,
    ) -> FileAssetContentResponse:
        asset = self._get_asset(asset_id=asset_id, auth=auth)
        content = self.storage.download_bytes(key=asset.storage_key)
        return FileAssetContentResponse(
            id=str(asset.id),
            filename=asset.filename,
            mime_type=asset.mime_type,
            content=content.decode("utf-8", errors="replace"),
            size_bytes=len(content),
        )

    def list_evidence(self, *, session_id: str, auth: AuthContext) -> Page[EvidenceResponse]:
        workspace_id = uuid.UUID(auth.workspace_id)
        session = get_session_or_raise(
            self.sessions,
            workspace_id=workspace_id,
            session_id=parse_uuid(session_id, field_name="session_id"),
        )
        evidence = self.review.list_evidence(workspace_id=workspace_id, session_id=session.id)
        return Page(items=[evidence_response(item) for item in evidence])

    def create_evidence(
        self,
        request: EvidenceCreateRequest,
        *,
        session_id: str,
        auth: AuthContext,
    ) -> EvidenceResponse:
        workspace_id = uuid.UUID(auth.workspace_id)
        session = get_session_or_raise(
            self.sessions,
            workspace_id=workspace_id,
            session_id=parse_uuid(session_id, field_name="session_id"),
        )
        asset_id, content = self._store_large_text_if_needed(
            workspace_id=workspace_id,
            session_id=session.id,
            filename=f"evidence-{uuid.uuid4()}.txt",
            content=request.content,
            created_by=uuid.UUID(auth.user_id),
        )
        evidence = self.review.create_evidence(
            workspace_id=workspace_id,
            project_id=session.project_id,
            session_id=session.id,
            evidence_type=request.type,
            title=request.title,
            summary=request.summary,
            content=content,
            asset_id=asset_id,
            metadata=request.metadata,
            task_id=_optional_uuid(request.task_id, "task_id"),
            step_id=_optional_uuid(request.step_id, "step_id"),
            tool_call_id=_optional_uuid(request.tool_call_id, "tool_call_id"),
            created_by_agent=False,
        )
        self._emit(
            workspace_id=workspace_id,
            session_id=session.id,
            event_type="evidence.created",
            payload={"evidence_id": str(evidence.id), "type": evidence.type},
            auth=auth,
        )
        self.audit.record(
            auth=auth,
            action="evidence.created",
            resource_type="evidence",
            resource_id=str(evidence.id),
            after={
                "type": evidence.type,
                "title": evidence.title,
                "asset_id": str(asset_id) if asset_id else None,
            },
        )
        self.db.commit()
        return evidence_response(evidence)

    def create_evidence_from_tool_call(
        self,
        request: EvidenceFromToolCallRequest,
        *,
        session_id: str,
        auth: AuthContext,
    ) -> EvidenceResponse:
        workspace_id = uuid.UUID(auth.workspace_id)
        session = get_session_or_raise(
            self.sessions,
            workspace_id=workspace_id,
            session_id=parse_uuid(session_id, field_name="session_id"),
        )
        tool_call = self.sessions.get_tool_call(
            workspace_id=workspace_id,
            tool_call_id=parse_uuid(request.tool_call_id, field_name="tool_call_id"),
        )
        if tool_call is None or tool_call.session_id != session.id:
            raise NotFoundError("Tool call was not found.")
        if tool_call.status != "succeeded":
            raise ConflictError("Evidence can only be created from successful tool calls.")
        if not tool_call.raw_output:
            raise ConflictError("Tool call has no output to preserve as evidence.")
        existing = self.review.get_evidence_by_tool_call(
            workspace_id=workspace_id,
            tool_call_id=tool_call.id,
        )
        if existing is not None:
            return evidence_response(existing)
        evidence = self.record_terminal_tool_evidence(
            session=session,
            tool_call=tool_call,
            output=tool_call.raw_output,
            title=request.title,
            summary=request.summary,
            actor_type=auth.actor_type,
            actor_id=auth.api_token_id or auth.user_id,
        )
        self.audit.record(
            auth=auth,
            action="evidence.created_from_tool_call",
            resource_type="evidence",
            resource_id=str(evidence.id),
            after={"tool_call_id": str(tool_call.id)},
        )
        self.db.commit()
        return evidence_response(evidence)

    def create_evidence_from_file(
        self,
        request: EvidenceFromFileRequest,
        *,
        session_id: str,
        auth: AuthContext,
    ) -> EvidenceResponse:
        workspace_id = uuid.UUID(auth.workspace_id)
        session = get_session_or_raise(
            self.sessions,
            workspace_id=workspace_id,
            session_id=parse_uuid(session_id, field_name="session_id"),
        )
        runtime = self.sessions.get_running_runtime_instance(
            workspace_id=workspace_id,
            session_id=session.id,
        )
        if runtime is None:
            raise ConflictError("Runtime file evidence requires a running runtime.")
        path = _workspace_path(request.path)
        file_response = self.runtime.read_file(runtime_id=str(runtime.id), path=path)
        content = str(file_response.get("content", "")).encode("utf-8")
        asset = self.artifacts.store_bytes(
            workspace_id=workspace_id,
            prefix=f"evidence/{session.id}",
            filename=PurePosixPath(path).name,
            content=content,
            mime_type="text/plain",
            metadata={"path": path, "source": "runtime_file"},
            created_by=uuid.UUID(auth.user_id),
        )
        evidence = self.review.create_evidence(
            workspace_id=workspace_id,
            project_id=session.project_id,
            session_id=session.id,
            task_id=_optional_uuid(request.task_id, "task_id"),
            step_id=_optional_uuid(request.step_id, "step_id"),
            evidence_type="file",
            title=request.title,
            summary=request.summary,
            content=None,
            asset_id=asset.id,
            metadata={"path": path},
        )
        self._emit(
            workspace_id=workspace_id,
            session_id=session.id,
            event_type="file_asset.created",
            payload={"asset_id": str(asset.id), "filename": asset.filename},
            auth=auth,
        )
        self._emit(
            workspace_id=workspace_id,
            session_id=session.id,
            event_type="evidence.created",
            payload={"evidence_id": str(evidence.id), "type": evidence.type},
            auth=auth,
        )
        self.db.commit()
        return evidence_response(evidence)

    def get_evidence(self, *, evidence_id: str, auth: AuthContext) -> EvidenceResponse:
        return evidence_response(self._get_evidence(evidence_id=evidence_id, auth=auth))

    def update_evidence(
        self,
        *,
        evidence_id: str,
        request: EvidenceUpdateRequest,
        auth: AuthContext,
    ) -> EvidenceResponse:
        evidence = self._get_evidence(evidence_id=evidence_id, auth=auth)
        evidence = self.review.update_evidence(
            evidence,
            title=request.title,
            summary=request.summary,
            content=request.content,
            metadata=request.metadata,
        )
        self._emit(
            workspace_id=evidence.workspace_id,
            session_id=evidence.session_id,
            event_type="evidence.updated",
            payload={"evidence_id": str(evidence.id)},
            auth=auth,
        )
        self.db.commit()
        return evidence_response(evidence)

    def delete_evidence(self, *, evidence_id: str, auth: AuthContext) -> EvidenceResponse:
        evidence = self.review.delete_evidence(
            self._get_evidence(evidence_id=evidence_id, auth=auth)
        )
        self._emit(
            workspace_id=evidence.workspace_id,
            session_id=evidence.session_id,
            event_type="evidence.deleted",
            payload={"evidence_id": str(evidence.id)},
            auth=auth,
        )
        self.db.commit()
        return evidence_response(evidence)

    def list_findings(self, *, session_id: str, auth: AuthContext) -> Page[FindingResponse]:
        workspace_id = uuid.UUID(auth.workspace_id)
        session = get_session_or_raise(
            self.sessions,
            workspace_id=workspace_id,
            session_id=parse_uuid(session_id, field_name="session_id"),
        )
        findings = self.review.list_findings(workspace_id=workspace_id, session_id=session.id)
        return Page(items=[self._finding_response(finding) for finding in findings])

    def create_finding(
        self,
        request: FindingCreateRequest,
        *,
        session_id: str,
        auth: AuthContext,
    ) -> FindingResponse:
        workspace_id = uuid.UUID(auth.workspace_id)
        session = get_session_or_raise(
            self.sessions,
            workspace_id=workspace_id,
            session_id=parse_uuid(session_id, field_name="session_id"),
        )
        finding = self.review.create_finding(
            workspace_id=workspace_id,
            project_id=session.project_id,
            session_id=session.id,
            title=request.title,
            status="needs_review",
            severity=request.severity,
            confidence=request.confidence,
            affected_assets={"items": request.affected_assets},
            description=request.description,
            impact=request.impact,
            reproduction_steps=request.reproduction_steps,
            remediation=request.remediation,
            references={"items": request.references},
        )
        for evidence_id in request.evidence_ids:
            evidence = self._get_evidence(evidence_id=evidence_id, auth=auth)
            if evidence.session_id != session.id:
                raise ConflictError("Finding evidence must belong to the same session.")
            self.review.attach_evidence(finding_id=finding.id, evidence_id=evidence.id)
        self._emit(
            workspace_id=workspace_id,
            session_id=session.id,
            event_type="finding.created",
            payload={"finding_id": str(finding.id), "status": finding.status},
            auth=auth,
        )
        self.audit.record(
            auth=auth,
            action="finding.created",
            resource_type="finding",
            resource_id=str(finding.id),
            after={"status": finding.status, "severity": finding.severity},
        )
        self.db.commit()
        return self._finding_response(finding)

    def create_candidate_finding_job(
        self,
        *,
        evidence_id: str,
        request: CandidateFindingRequest,
        auth: AuthContext,
    ) -> JobResponse:
        evidence = self._get_evidence(evidence_id=evidence_id, auth=auth)
        evidence_ids = request.evidence_ids or [str(evidence.id)]
        job = self.sessions.create_job(
            workspace_id=evidence.workspace_id,
            session_id=evidence.session_id,
            job_type="propose_finding",
            payload={"evidence_ids": evidence_ids},
        )
        self._emit(
            workspace_id=evidence.workspace_id,
            session_id=evidence.session_id,
            event_type="job.updated",
            payload={"job_id": str(job.id), "status": "queued", "type": job.type},
            auth=auth,
        )
        self.db.commit()
        celery_task_id = self.queue.enqueue_finding_proposal(job_id=str(job.id))
        self.sessions.mark_job_enqueued(job, celery_task_id=celery_task_id)
        self.db.commit()
        return job_response(job)

    def get_finding(self, *, finding_id: str, auth: AuthContext) -> FindingResponse:
        return self._finding_response(self._get_finding(finding_id=finding_id, auth=auth))

    def update_finding(
        self,
        *,
        finding_id: str,
        request: FindingUpdateRequest,
        auth: AuthContext,
    ) -> FindingResponse:
        finding = self._get_finding(finding_id=finding_id, auth=auth)
        finding = self.review.update_finding(
            finding,
            title=request.title,
            severity=request.severity,
            confidence=request.confidence,
            affected_assets={"items": request.affected_assets}
            if request.affected_assets is not None
            else None,
            description=request.description,
            impact=request.impact,
            reproduction_steps=request.reproduction_steps,
            remediation=request.remediation,
            references={"items": request.references} if request.references is not None else None,
            status=request.status,
        )
        self._emit(
            workspace_id=finding.workspace_id,
            session_id=finding.session_id,
            event_type="finding.updated",
            payload={"finding_id": str(finding.id), "status": finding.status},
            auth=auth,
        )
        self.db.commit()
        return self._finding_response(finding)

    def review_finding(
        self,
        *,
        finding_id: str,
        request: FindingReviewRequest,
        auth: AuthContext,
    ) -> FindingResponse:
        if request.status not in FINDING_REVIEW_STATUSES:
            raise DomainError("Unsupported finding review status.")
        finding = self.review.review_finding(
            self._get_finding(finding_id=finding_id, auth=auth),
            status=request.status,
            reviewed_by=uuid.UUID(auth.user_id),
            review_note=request.review_note,
        )
        self._emit(
            workspace_id=finding.workspace_id,
            session_id=finding.session_id,
            event_type="finding.reviewed",
            payload={"finding_id": str(finding.id), "status": finding.status},
            auth=auth,
        )
        self.audit.record(
            auth=auth,
            action="finding.reviewed",
            resource_type="finding",
            resource_id=str(finding.id),
            after={"status": finding.status},
        )
        self.db.commit()
        return self._finding_response(finding)

    def delete_finding(self, *, finding_id: str, auth: AuthContext) -> FindingResponse:
        finding = self.review.delete_finding(self._get_finding(finding_id=finding_id, auth=auth))
        self._emit(
            workspace_id=finding.workspace_id,
            session_id=finding.session_id,
            event_type="finding.updated",
            payload={"finding_id": str(finding.id), "deleted": True},
            auth=auth,
        )
        self.db.commit()
        return self._finding_response(finding)

    def attach_finding_evidence(
        self,
        *,
        finding_id: str,
        request: FindingEvidenceAttachRequest,
        auth: AuthContext,
    ) -> FindingResponse:
        finding = self._get_finding(finding_id=finding_id, auth=auth)
        evidence = self._get_evidence(evidence_id=request.evidence_id, auth=auth)
        if evidence.session_id != finding.session_id:
            raise ConflictError("Finding evidence must belong to the same session.")
        self.review.attach_evidence(
            finding_id=finding.id,
            evidence_id=evidence.id,
            relationship=request.relationship,
        )
        self._emit(
            workspace_id=finding.workspace_id,
            session_id=finding.session_id,
            event_type="finding.evidence_attached",
            payload={"finding_id": str(finding.id), "evidence_id": str(evidence.id)},
            auth=auth,
        )
        self.db.commit()
        return self._finding_response(finding)

    def detach_finding_evidence(
        self,
        *,
        finding_id: str,
        evidence_id: str,
        auth: AuthContext,
    ) -> FindingResponse:
        finding = self._get_finding(finding_id=finding_id, auth=auth)
        evidence_uuid = parse_uuid(evidence_id, field_name="evidence_id")
        self.review.detach_evidence(finding_id=finding.id, evidence_id=evidence_uuid)
        self._emit(
            workspace_id=finding.workspace_id,
            session_id=finding.session_id,
            event_type="finding.evidence_detached",
            payload={"finding_id": str(finding.id), "evidence_id": str(evidence_uuid)},
            auth=auth,
        )
        self.db.commit()
        return self._finding_response(finding)

    def list_reports(self, *, session_id: str, auth: AuthContext) -> Page[ReportResponse]:
        workspace_id = uuid.UUID(auth.workspace_id)
        session = get_session_or_raise(
            self.sessions,
            workspace_id=workspace_id,
            session_id=parse_uuid(session_id, field_name="session_id"),
        )
        reports = self.review.list_reports(workspace_id=workspace_id, session_id=session.id)
        return Page(items=[report_response(report) for report in reports])

    def create_report(
        self,
        request: ReportCreateRequest,
        *,
        session_id: str,
        auth: AuthContext,
    ) -> ReportResponse:
        workspace_id = uuid.UUID(auth.workspace_id)
        session = get_session_or_raise(
            self.sessions,
            workspace_id=workspace_id,
            session_id=parse_uuid(session_id, field_name="session_id"),
        )
        report = self.review.create_report(
            workspace_id=workspace_id,
            project_id=session.project_id,
            session_id=session.id,
            title=request.title or f"{session.title} Report",
            created_by=uuid.UUID(auth.user_id),
        )
        self._emit(
            workspace_id=workspace_id,
            session_id=session.id,
            event_type="report.created",
            payload={"report_id": str(report.id)},
            auth=auth,
        )
        self.db.commit()
        return report_response(report)

    def get_report(self, *, report_id: str, auth: AuthContext) -> ReportResponse:
        return report_response(self._get_report(report_id=report_id, auth=auth))

    def update_report(
        self,
        *,
        report_id: str,
        request: ReportUpdateRequest,
        auth: AuthContext,
    ) -> ReportResponse:
        report = self.review.update_report(
            self._get_report(report_id=report_id, auth=auth),
            title=request.title,
        )
        self.db.commit()
        return report_response(report)

    def delete_report(self, *, report_id: str, auth: AuthContext) -> ReportResponse:
        report = self.review.delete_report(self._get_report(report_id=report_id, auth=auth))
        self.db.commit()
        return report_response(report)

    def render_report(self, *, report_id: str, auth: AuthContext) -> JobResponse:
        report = self._get_report(report_id=report_id, auth=auth)
        job = self.sessions.create_job(
            workspace_id=report.workspace_id,
            session_id=report.session_id,
            job_type="render_report",
            payload={"report_id": str(report.id)},
        )
        self._emit(
            workspace_id=report.workspace_id,
            session_id=report.session_id,
            event_type="job.updated",
            payload={"job_id": str(job.id), "status": "queued", "type": job.type},
            auth=auth,
        )
        self.db.commit()
        celery_task_id = self.queue.enqueue_report_render(job_id=str(job.id))
        self.sessions.mark_job_enqueued(job, celery_task_id=celery_task_id)
        self.db.commit()
        return job_response(job)

    def finalize_report(self, *, report_id: str, auth: AuthContext) -> ReportResponse:
        report = self._get_report(report_id=report_id, auth=auth)
        if report.status not in {"rendered", "final"}:
            raise ConflictError("Only rendered reports can be finalized.")
        report = self.review.update_report(report, status="final")
        self._emit(
            workspace_id=report.workspace_id,
            session_id=report.session_id,
            event_type="report.finalized",
            payload={"report_id": str(report.id)},
            auth=auth,
        )
        self.db.commit()
        return report_response(report)

    def export_report(
        self,
        *,
        report_id: str,
        export_format: str,
        auth: AuthContext,
    ) -> ReportExportResponse:
        report = self._get_report(report_id=report_id, auth=auth)
        if export_format not in {"markdown", "json"}:
            raise DomainError("Report export format must be markdown or json.")
        session = get_session_or_raise(
            self.sessions,
            workspace_id=report.workspace_id,
            session_id=report.session_id,
        )
        content = report.content or ReportRenderer(repository=self.review).build_content(
            session=session,
            report=report,
        )
        if export_format == "markdown":
            text = render_markdown(content)
            filename = f"{report.title}.md"
            mime_type = "text/markdown"
        else:
            text = json.dumps(content, indent=2, sort_keys=True)
            filename = f"{report.title}.json"
            mime_type = "application/json"
        asset = self.artifacts.store_bytes(
            workspace_id=report.workspace_id,
            prefix=self.settings.report_export_storage_prefix,
            filename=filename,
            content=text.encode("utf-8"),
            mime_type=mime_type,
            metadata={"report_id": str(report.id), "format": export_format},
            created_by=uuid.UUID(auth.user_id),
        )
        self.review.update_report(report, asset_id=asset.id)
        self._emit(
            workspace_id=report.workspace_id,
            session_id=report.session_id,
            event_type="report.exported",
            payload={
                "report_id": str(report.id),
                "format": export_format,
                "asset_id": str(asset.id),
            },
            auth=auth,
        )
        self.db.commit()
        return ReportExportResponse(
            report_id=str(report.id),
            format=export_format,
            filename=asset.filename,
            content=text,
            asset_id=str(asset.id),
        )

    def record_terminal_tool_evidence(
        self,
        *,
        session,
        tool_call,
        output: str,
        title: str | None = None,
        summary: str | None = None,
        actor_type: str = "system",
        actor_id: str = "worker",
    ) -> Evidence:
        asset_id, content = self._store_large_text_if_needed(
            workspace_id=session.workspace_id,
            session_id=session.id,
            filename=f"tool-call-{tool_call.id}.txt",
            content=output,
            created_by=None,
        )
        evidence = self.review.create_evidence(
            workspace_id=session.workspace_id,
            project_id=session.project_id,
            session_id=session.id,
            task_id=tool_call.task_id,
            step_id=tool_call.step_id,
            tool_call_id=tool_call.id,
            evidence_type="terminal",
            title=title or "Terminal command output",
            summary=summary or _short_summary(output),
            content=content,
            asset_id=asset_id,
            metadata={"tool_name": tool_call.tool_name, "status": tool_call.status},
            created_by_agent=True,
        )
        self.sessions.create_event(
            workspace_id=session.workspace_id,
            session_id=session.id,
            event_type="evidence.created",
            payload={
                "evidence_id": str(evidence.id),
                "tool_call_id": str(tool_call.id),
                "type": evidence.type,
            },
            actor_type=actor_type,
            actor_id=actor_id,
        )
        return evidence

    def _get_asset(self, *, asset_id: str, auth: AuthContext):
        asset = self.review.get_file_asset(
            workspace_id=uuid.UUID(auth.workspace_id),
            asset_id=parse_uuid(asset_id, field_name="asset_id"),
        )
        if asset is None:
            raise NotFoundError("File asset was not found.")
        return asset

    def _get_evidence(self, *, evidence_id: str, auth: AuthContext) -> Evidence:
        evidence = self.review.get_evidence(
            workspace_id=uuid.UUID(auth.workspace_id),
            evidence_id=parse_uuid(evidence_id, field_name="evidence_id"),
        )
        if evidence is None:
            raise NotFoundError("Evidence was not found.")
        return evidence

    def _get_finding(self, *, finding_id: str, auth: AuthContext) -> Finding:
        finding = self.review.get_finding(
            workspace_id=uuid.UUID(auth.workspace_id),
            finding_id=parse_uuid(finding_id, field_name="finding_id"),
        )
        if finding is None:
            raise NotFoundError("Finding was not found.")
        return finding

    def _get_report(self, *, report_id: str, auth: AuthContext):
        report = self.review.get_report(
            workspace_id=uuid.UUID(auth.workspace_id),
            report_id=parse_uuid(report_id, field_name="report_id"),
        )
        if report is None:
            raise NotFoundError("Report was not found.")
        return report

    def _finding_response(self, finding: Finding) -> FindingResponse:
        links = self.review.list_finding_evidence(finding_id=finding.id)
        return finding_response(finding, evidence_ids=[link.evidence_id for link in links])

    def _store_large_text_if_needed(
        self,
        *,
        workspace_id: uuid.UUID,
        session_id: uuid.UUID,
        filename: str,
        content: str | None,
        created_by: uuid.UUID | None,
    ) -> tuple[uuid.UUID | None, str | None]:
        if content is None:
            return None, None
        raw = content.encode("utf-8")
        if len(raw) <= self.settings.evidence_inline_max_bytes:
            return None, content
        asset = self.artifacts.store_bytes(
            workspace_id=workspace_id,
            prefix=f"evidence/{session_id}",
            filename=filename,
            content=raw,
            mime_type="text/plain",
            metadata={"source": "evidence"},
            created_by=created_by,
        )
        return asset.id, None

    def _emit(
        self,
        *,
        workspace_id: uuid.UUID,
        session_id: uuid.UUID,
        event_type: str,
        payload: dict[str, object],
        auth: AuthContext,
    ) -> None:
        self.sessions.create_event(
            workspace_id=workspace_id,
            session_id=session_id,
            event_type=event_type,
            payload=payload,
            actor_type=auth.actor_type,
            actor_id=auth.api_token_id or auth.user_id,
        )


def file_asset_response(asset) -> FileAssetResponse:
    return FileAssetResponse(
        id=str(asset.id),
        storage_backend=asset.storage_backend,
        storage_key=asset.storage_key,
        filename=asset.filename,
        mime_type=asset.mime_type,
        size_bytes=asset.size_bytes,
        sha256=asset.sha256,
        metadata=asset.metadata_json,
        created_at=asset.created_at.isoformat(),
    )


def evidence_response(evidence: Evidence) -> EvidenceResponse:
    return EvidenceResponse(
        id=str(evidence.id),
        project_id=str(evidence.project_id),
        session_id=str(evidence.session_id),
        task_id=str(evidence.task_id) if evidence.task_id else None,
        step_id=str(evidence.step_id) if evidence.step_id else None,
        tool_call_id=str(evidence.tool_call_id) if evidence.tool_call_id else None,
        type=evidence.type,
        title=evidence.title,
        summary=evidence.summary,
        content=evidence.content,
        asset_id=str(evidence.asset_id) if evidence.asset_id else None,
        metadata=evidence.metadata_json,
        created_by_agent=evidence.created_by_agent,
        created_at=evidence.created_at.isoformat(),
    )


def finding_response(finding: Finding, *, evidence_ids: list[uuid.UUID]) -> FindingResponse:
    return FindingResponse(
        id=str(finding.id),
        project_id=str(finding.project_id),
        session_id=str(finding.session_id),
        title=finding.title,
        status=finding.status,
        severity=finding.severity,
        confidence=finding.confidence,
        affected_assets=_items(finding.affected_assets),
        description=finding.description,
        impact=finding.impact,
        reproduction_steps=finding.reproduction_steps,
        remediation=finding.remediation,
        references=_items(finding.references),
        evidence_ids=[str(evidence_id) for evidence_id in evidence_ids],
        created_by_agent=finding.created_by_agent,
        reviewed_by=str(finding.reviewed_by) if finding.reviewed_by else None,
        review_note=finding.review_note,
        created_at=finding.created_at.isoformat(),
        updated_at=finding.updated_at.isoformat(),
    )


def report_response(report) -> ReportResponse:
    return ReportResponse(
        id=str(report.id),
        project_id=str(report.project_id),
        session_id=str(report.session_id),
        title=report.title,
        status=report.status,
        format=report.format,
        content=report.content,
        asset_id=str(report.asset_id) if report.asset_id else None,
        created_at=report.created_at.isoformat(),
        updated_at=report.updated_at.isoformat(),
    )


def _optional_uuid(value: str | None, field_name: str) -> uuid.UUID | None:
    return parse_uuid(value, field_name=field_name) if value else None


def _items(value: dict[str, object]) -> list[object]:
    items = value.get("items")
    return items if isinstance(items, list) else []


def _short_summary(value: str) -> str:
    first_line = value.strip().splitlines()[0] if value.strip() else "Terminal output captured."
    return first_line[:240]


def _workspace_path(value: str) -> str:
    path = PurePosixPath(value)
    parts = path.parts
    if not path.is_absolute() or len(parts) < 2 or parts[1] != "workspace":
        raise DomainError("Runtime paths must be inside /workspace.")
    if ".." in parts:
        raise DomainError("Runtime paths cannot contain parent directory traversal.")
    return str(path)
