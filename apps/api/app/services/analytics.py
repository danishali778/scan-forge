import uuid
from collections import Counter, defaultdict
from datetime import UTC, datetime, timedelta

from app.auth.dependencies import AuthContext
from app.core.config import Settings
from app.domain.exceptions import DomainError
from app.domain.ids import parse_uuid
from app.repositories.analytics import AnalyticsRepository
from app.repositories.projects import ProjectRepository
from app.schemas.analytics import (
    AnalyticsApprovalsResponse,
    AnalyticsFindingsResponse,
    AnalyticsOverviewResponse,
    AnalyticsSessionsResponse,
    AnalyticsToolsResponse,
    AnalyticsWindow,
    CountItem,
    ProjectFindingItem,
    ToolAnalyticsItem,
)


class AnalyticsService:
    def __init__(
        self,
        *,
        repository: AnalyticsRepository,
        project_repository: ProjectRepository,
        settings: Settings,
    ) -> None:
        self.repository = repository
        self.projects = project_repository
        self.settings = settings

    def overview(
        self,
        *,
        auth: AuthContext,
        project_id: str | None,
        from_date: str | None,
        to_date: str | None,
    ) -> AnalyticsOverviewResponse:
        workspace_id, project_uuid, start, end, window = self._filters(
            auth=auth,
            project_id=project_id,
            from_date=from_date,
            to_date=to_date,
        )
        sessions = self.repository.list_sessions(
            workspace_id=workspace_id,
            project_id=project_uuid,
            from_date=start,
            to_date=end,
        )
        findings = self.repository.list_findings(
            workspace_id=workspace_id,
            project_id=project_uuid,
            from_date=start,
            to_date=end,
        )
        tool_calls = self.repository.list_tool_calls(
            workspace_id=workspace_id,
            project_id=project_uuid,
            from_date=start,
            to_date=end,
        )
        approvals = self.repository.list_approvals(
            workspace_id=workspace_id,
            project_id=project_uuid,
            from_date=start,
            to_date=end,
        )
        jobs = self.repository.list_jobs(
            workspace_id=workspace_id,
            project_id=project_uuid,
            from_date=start,
            to_date=end,
        )
        return AnalyticsOverviewResponse(
            window=window,
            session_count=len(sessions),
            session_status_counts=_count_items(session.status for session in sessions),
            finding_severity_counts=_count_items(finding.severity for finding in findings),
            tool_call_count=len(tool_calls),
            tool_success_rate=_success_rate(tool_calls),
            approval_counts=_count_items(approval.status for approval in approvals),
            job_failure_count=sum(1 for job in jobs if job.status == "failed"),
        )

    def sessions(
        self,
        *,
        auth: AuthContext,
        project_id: str | None,
        from_date: str | None,
        to_date: str | None,
    ) -> AnalyticsSessionsResponse:
        workspace_id, project_uuid, start, end, window = self._filters(
            auth=auth,
            project_id=project_id,
            from_date=from_date,
            to_date=to_date,
        )
        sessions = self.repository.list_sessions(
            workspace_id=workspace_id,
            project_id=project_uuid,
            from_date=start,
            to_date=end,
        )
        durations = [
            _seconds_between(session.started_at, session.completed_at)
            for session in sessions
            if session.started_at is not None and session.completed_at is not None
        ]
        return AnalyticsSessionsResponse(
            window=window,
            total=len(sessions),
            status_counts=_count_items(session.status for session in sessions),
            average_duration_seconds=_average(durations),
            completed_count=sum(1 for session in sessions if session.status == "completed"),
            failed_count=sum(1 for session in sessions if session.status == "failed"),
            stopped_count=sum(1 for session in sessions if session.status == "stopped"),
        )

    def tools(
        self,
        *,
        auth: AuthContext,
        project_id: str | None,
        from_date: str | None,
        to_date: str | None,
    ) -> AnalyticsToolsResponse:
        workspace_id, project_uuid, start, end, window = self._filters(
            auth=auth,
            project_id=project_id,
            from_date=from_date,
            to_date=to_date,
        )
        tool_calls = self.repository.list_tool_calls(
            workspace_id=workspace_id,
            project_id=project_uuid,
            from_date=start,
            to_date=end,
        )
        by_tool = _tool_items(tool_calls)
        return AnalyticsToolsResponse(
            window=window,
            total=len(tool_calls),
            status_counts=_count_items(call.status for call in tool_calls),
            by_tool=by_tool,
            top_failed_tools=sorted(by_tool, key=lambda item: item.failed, reverse=True)[:5],
        )

    def findings(
        self,
        *,
        auth: AuthContext,
        project_id: str | None,
        from_date: str | None,
        to_date: str | None,
    ) -> AnalyticsFindingsResponse:
        workspace_id, project_uuid, start, end, window = self._filters(
            auth=auth,
            project_id=project_id,
            from_date=from_date,
            to_date=to_date,
        )
        findings = self.repository.list_findings(
            workspace_id=workspace_id,
            project_id=project_uuid,
            from_date=start,
            to_date=end,
        )
        by_project = Counter(str(finding.project_id) for finding in findings)
        return AnalyticsFindingsResponse(
            window=window,
            total=len(findings),
            by_severity=_count_items(finding.severity for finding in findings),
            by_status=_count_items(finding.status for finding in findings),
            by_confidence=_count_items(finding.confidence for finding in findings),
            by_project=[
                ProjectFindingItem(project_id=key, count=count)
                for key, count in sorted(by_project.items())
            ],
        )

    def approvals(
        self,
        *,
        auth: AuthContext,
        project_id: str | None,
        from_date: str | None,
        to_date: str | None,
    ) -> AnalyticsApprovalsResponse:
        workspace_id, project_uuid, start, end, window = self._filters(
            auth=auth,
            project_id=project_id,
            from_date=from_date,
            to_date=to_date,
        )
        approvals = self.repository.list_approvals(
            workspace_id=workspace_id,
            project_id=project_uuid,
            from_date=start,
            to_date=end,
        )
        resolution_times = [
            _seconds_between(approval.created_at, approval.resolved_at)
            for approval in approvals
            if approval.resolved_at is not None
        ]
        return AnalyticsApprovalsResponse(
            window=window,
            total=len(approvals),
            status_counts=_count_items(approval.status for approval in approvals),
            average_resolution_seconds=_average(resolution_times),
            pending_count=sum(1 for approval in approvals if approval.status == "pending"),
            approved_count=sum(1 for approval in approvals if approval.status == "approved"),
            denied_count=sum(1 for approval in approvals if approval.status == "denied"),
        )

    def _filters(
        self,
        *,
        auth: AuthContext,
        project_id: str | None,
        from_date: str | None,
        to_date: str | None,
    ) -> tuple[uuid.UUID, uuid.UUID | None, datetime, datetime, AnalyticsWindow]:
        workspace_id = parse_uuid(auth.workspace_id, field_name="workspace_id")
        end = _parse_datetime(to_date, end_of_day=True) if to_date else datetime.now(UTC)
        start = (
            _parse_datetime(from_date, end_of_day=False)
            if from_date
            else end - timedelta(days=self.settings.analytics_default_window_days)
        )
        if start > end:
            raise DomainError("from_date must be before to_date.")
        if end - start > timedelta(days=self.settings.analytics_max_window_days):
            raise DomainError("Analytics date window exceeds the configured maximum.")

        project_uuid = parse_uuid(project_id, field_name="project_id") if project_id else None
        if project_uuid is not None:
            project = self.projects.get_project(workspace_id=workspace_id, project_id=project_uuid)
            if project is None:
                from app.domain.exceptions import NotFoundError

                raise NotFoundError("Project not found.")
        return (
            workspace_id,
            project_uuid,
            start,
            end,
            AnalyticsWindow(
                from_date=start.isoformat(),
                to_date=end.isoformat(),
                project_id=str(project_uuid) if project_uuid else None,
            ),
        )


def _parse_datetime(value: str, *, end_of_day: bool) -> datetime:
    raw = value.strip()
    if not raw:
        raise DomainError("Date filters cannot be empty.")
    if len(raw) == 10:
        suffix = "T23:59:59.999999+00:00" if end_of_day else "T00:00:00+00:00"
        raw = f"{raw}{suffix}"
    raw = raw.replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(raw)
    except ValueError as exc:
        raise DomainError("Date filters must be ISO-8601 dates or datetimes.") from exc
    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=UTC)
    return parsed.astimezone(UTC)


def _count_items(values) -> list[CountItem]:
    counts = Counter(str(value) for value in values if value is not None)
    return [CountItem(key=key, count=count) for key, count in sorted(counts.items())]


def _average(values: list[float]) -> float | None:
    if not values:
        return None
    return round(sum(values) / len(values), 2)


def _seconds_between(start: datetime, end: datetime) -> float:
    return max((_aware(end) - _aware(start)).total_seconds(), 0.0)


def _aware(value: datetime) -> datetime:
    return value.replace(tzinfo=UTC) if value.tzinfo is None else value.astimezone(UTC)


def _success_rate(tool_calls) -> float | None:
    if not tool_calls:
        return None
    succeeded = sum(1 for call in tool_calls if call.status == "succeeded")
    return round(succeeded / len(tool_calls), 4)


def _tool_items(tool_calls) -> list[ToolAnalyticsItem]:
    grouped = defaultdict(list)
    for call in tool_calls:
        grouped[call.tool_name].append(call)

    items: list[ToolAnalyticsItem] = []
    for tool_name, calls in grouped.items():
        durations = [float(call.duration_ms) for call in calls if call.duration_ms is not None]
        items.append(
            ToolAnalyticsItem(
                tool_name=tool_name,
                count=len(calls),
                succeeded=sum(1 for call in calls if call.status == "succeeded"),
                failed=sum(
                    1
                    for call in calls
                    if call.status in {"failed", "timed_out", "cancelled", "denied"}
                ),
                average_duration_ms=_average(durations),
            )
        )
    return sorted(items, key=lambda item: (-item.count, item.tool_name))
