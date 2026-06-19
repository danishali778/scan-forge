import uuid
from datetime import UTC, datetime

from sqlalchemy import select

from app.models.review import Evidence, FileAsset, Finding, FindingEvidence, Report
from app.repositories.base import BaseRepository


class ReviewRepository(BaseRepository):
    def create_file_asset(
        self,
        *,
        workspace_id: uuid.UUID,
        storage_backend: str,
        storage_key: str,
        filename: str,
        mime_type: str | None,
        size_bytes: int,
        sha256: str,
        metadata: dict[str, object] | None = None,
        created_by: uuid.UUID | None = None,
    ) -> FileAsset:
        asset = FileAsset(
            workspace_id=workspace_id,
            storage_backend=storage_backend,
            storage_key=storage_key,
            filename=filename,
            mime_type=mime_type,
            size_bytes=size_bytes,
            sha256=sha256,
            metadata_json=metadata or {},
            created_by=created_by,
            created_at=datetime.now(UTC),
        )
        self.db.add(asset)
        self.db.flush()
        return asset

    def get_file_asset(
        self,
        *,
        workspace_id: uuid.UUID,
        asset_id: uuid.UUID,
    ) -> FileAsset | None:
        return self.db.scalar(
            select(FileAsset).where(
                FileAsset.workspace_id == workspace_id,
                FileAsset.id == asset_id,
                FileAsset.deleted_at.is_(None),
            )
        )

    def create_evidence(
        self,
        *,
        workspace_id: uuid.UUID,
        project_id: uuid.UUID,
        session_id: uuid.UUID,
        evidence_type: str,
        title: str,
        summary: str,
        content: str | None = None,
        asset_id: uuid.UUID | None = None,
        metadata: dict[str, object] | None = None,
        task_id: uuid.UUID | None = None,
        step_id: uuid.UUID | None = None,
        tool_call_id: uuid.UUID | None = None,
        created_by_agent: bool = False,
    ) -> Evidence:
        evidence = Evidence(
            workspace_id=workspace_id,
            project_id=project_id,
            session_id=session_id,
            task_id=task_id,
            step_id=step_id,
            tool_call_id=tool_call_id,
            type=evidence_type,
            title=title,
            summary=summary,
            content=content,
            asset_id=asset_id,
            metadata_json=metadata or {},
            created_by_agent=created_by_agent,
            created_at=datetime.now(UTC),
        )
        self.db.add(evidence)
        self.db.flush()
        return evidence

    def list_evidence(
        self,
        *,
        workspace_id: uuid.UUID,
        session_id: uuid.UUID,
        limit: int = 100,
    ) -> list[Evidence]:
        return list(
            self.db.scalars(
                select(Evidence)
                .where(
                    Evidence.workspace_id == workspace_id,
                    Evidence.session_id == session_id,
                    Evidence.deleted_at.is_(None),
                )
                .order_by(Evidence.created_at.desc())
                .limit(limit)
            )
        )

    def get_evidence(
        self,
        *,
        workspace_id: uuid.UUID,
        evidence_id: uuid.UUID,
    ) -> Evidence | None:
        return self.db.scalar(
            select(Evidence).where(
                Evidence.workspace_id == workspace_id,
                Evidence.id == evidence_id,
                Evidence.deleted_at.is_(None),
            )
        )

    def get_evidence_by_tool_call(
        self,
        *,
        workspace_id: uuid.UUID,
        tool_call_id: uuid.UUID,
    ) -> Evidence | None:
        return self.db.scalar(
            select(Evidence)
            .where(
                Evidence.workspace_id == workspace_id,
                Evidence.tool_call_id == tool_call_id,
                Evidence.deleted_at.is_(None),
            )
            .limit(1)
        )

    def update_evidence(
        self,
        evidence: Evidence,
        *,
        title: str | None,
        summary: str | None,
        content: str | None,
        metadata: dict[str, object] | None,
    ) -> Evidence:
        if title is not None:
            evidence.title = title
        if summary is not None:
            evidence.summary = summary
        if content is not None:
            evidence.content = content
        if metadata is not None:
            evidence.metadata_json = metadata
        self.db.add(evidence)
        self.db.flush()
        return evidence

    def delete_evidence(self, evidence: Evidence) -> Evidence:
        evidence.deleted_at = datetime.now(UTC)
        self.db.add(evidence)
        self.db.flush()
        return evidence

    def create_finding(
        self,
        *,
        workspace_id: uuid.UUID,
        project_id: uuid.UUID,
        session_id: uuid.UUID,
        title: str,
        severity: str,
        confidence: str,
        affected_assets: dict[str, object],
        description: str,
        impact: str,
        reproduction_steps: str,
        remediation: str,
        references: dict[str, object],
        status: str = "candidate",
        created_by_agent: bool = False,
    ) -> Finding:
        finding = Finding(
            workspace_id=workspace_id,
            project_id=project_id,
            session_id=session_id,
            title=title,
            status=status,
            severity=severity,
            confidence=confidence,
            affected_assets=affected_assets,
            description=description,
            impact=impact,
            reproduction_steps=reproduction_steps,
            remediation=remediation,
            references=references,
            created_by_agent=created_by_agent,
        )
        self.db.add(finding)
        self.db.flush()
        return finding

    def list_findings(
        self,
        *,
        workspace_id: uuid.UUID,
        session_id: uuid.UUID,
        include_deleted: bool = False,
    ) -> list[Finding]:
        statement = select(Finding).where(
            Finding.workspace_id == workspace_id,
            Finding.session_id == session_id,
        )
        if not include_deleted:
            statement = statement.where(Finding.deleted_at.is_(None))
        return list(self.db.scalars(statement.order_by(Finding.created_at.desc())))

    def get_finding(
        self,
        *,
        workspace_id: uuid.UUID,
        finding_id: uuid.UUID,
    ) -> Finding | None:
        return self.db.scalar(
            select(Finding).where(
                Finding.workspace_id == workspace_id,
                Finding.id == finding_id,
                Finding.deleted_at.is_(None),
            )
        )

    def update_finding(
        self,
        finding: Finding,
        *,
        title: str | None,
        severity: str | None,
        confidence: str | None,
        affected_assets: dict[str, object] | None,
        description: str | None,
        impact: str | None,
        reproduction_steps: str | None,
        remediation: str | None,
        references: dict[str, object] | None,
        status: str | None = None,
    ) -> Finding:
        if title is not None:
            finding.title = title
        if severity is not None:
            finding.severity = severity
        if confidence is not None:
            finding.confidence = confidence
        if affected_assets is not None:
            finding.affected_assets = affected_assets
        if description is not None:
            finding.description = description
        if impact is not None:
            finding.impact = impact
        if reproduction_steps is not None:
            finding.reproduction_steps = reproduction_steps
        if remediation is not None:
            finding.remediation = remediation
        if references is not None:
            finding.references = references
        if status is not None:
            finding.status = status
        self.db.add(finding)
        self.db.flush()
        return finding

    def review_finding(
        self,
        finding: Finding,
        *,
        status: str,
        reviewed_by: uuid.UUID,
        review_note: str | None,
    ) -> Finding:
        finding.status = status
        finding.reviewed_by = reviewed_by
        finding.review_note = review_note
        self.db.add(finding)
        self.db.flush()
        return finding

    def delete_finding(self, finding: Finding) -> Finding:
        finding.deleted_at = datetime.now(UTC)
        self.db.add(finding)
        self.db.flush()
        return finding

    def attach_evidence(
        self,
        *,
        finding_id: uuid.UUID,
        evidence_id: uuid.UUID,
        relationship: str = "supporting",
    ) -> FindingEvidence:
        existing = self.db.get(FindingEvidence, (finding_id, evidence_id))
        if existing is not None:
            existing.relationship = relationship
            self.db.add(existing)
            self.db.flush()
            return existing
        link = FindingEvidence(
            finding_id=finding_id,
            evidence_id=evidence_id,
            relationship=relationship,
            created_at=datetime.now(UTC),
        )
        self.db.add(link)
        self.db.flush()
        return link

    def detach_evidence(self, *, finding_id: uuid.UUID, evidence_id: uuid.UUID) -> None:
        link = self.db.get(FindingEvidence, (finding_id, evidence_id))
        if link is not None:
            self.db.delete(link)
            self.db.flush()

    def list_finding_evidence(self, *, finding_id: uuid.UUID) -> list[FindingEvidence]:
        return list(
            self.db.scalars(
                select(FindingEvidence).where(FindingEvidence.finding_id == finding_id)
            )
        )

    def create_report(
        self,
        *,
        workspace_id: uuid.UUID,
        project_id: uuid.UUID,
        session_id: uuid.UUID,
        title: str,
        created_by: uuid.UUID | None,
    ) -> Report:
        report = Report(
            workspace_id=workspace_id,
            project_id=project_id,
            session_id=session_id,
            title=title,
            status="draft",
            format="web",
            content={},
            created_by=created_by,
        )
        self.db.add(report)
        self.db.flush()
        return report

    def list_reports(self, *, workspace_id: uuid.UUID, session_id: uuid.UUID) -> list[Report]:
        return list(
            self.db.scalars(
                select(Report)
                .where(
                    Report.workspace_id == workspace_id,
                    Report.session_id == session_id,
                    Report.deleted_at.is_(None),
                )
                .order_by(Report.created_at.desc())
            )
        )

    def get_report(self, *, workspace_id: uuid.UUID, report_id: uuid.UUID) -> Report | None:
        return self.db.scalar(
            select(Report).where(
                Report.workspace_id == workspace_id,
                Report.id == report_id,
                Report.deleted_at.is_(None),
            )
        )

    def update_report(
        self,
        report: Report,
        *,
        title: str | None = None,
        status: str | None = None,
        content: dict[str, object] | None = None,
        asset_id: uuid.UUID | None = None,
    ) -> Report:
        if title is not None:
            report.title = title
        if status is not None:
            report.status = status
        if content is not None:
            report.content = content
        if asset_id is not None:
            report.asset_id = asset_id
        self.db.add(report)
        self.db.flush()
        return report

    def delete_report(self, report: Report) -> Report:
        report.deleted_at = datetime.now(UTC)
        self.db.add(report)
        self.db.flush()
        return report
