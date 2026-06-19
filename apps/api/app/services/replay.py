import json
import re
from collections import Counter
from typing import Any

from sqlalchemy.orm import Session

from app.auth.dependencies import AuthContext
from app.core.config import Settings
from app.domain.ids import parse_uuid
from app.integrations.storage import StorageAdapter
from app.repositories.control_plane import AuditRepository
from app.repositories.replay import ReplayRepository
from app.repositories.review import ReviewRepository
from app.repositories.sessions import SessionRepository
from app.schemas.replay import (
    ReplayFrame,
    ReplaySessionSummary,
    ReplaySummary,
    SessionReplayExportResponse,
    SessionReplayResponse,
)
from app.services.audit import AuditRecorder
from app.services.review.artifacts import ArtifactWriter
from app.services.review.service import file_asset_response
from app.services.sessions.guards import get_session_or_raise

SECRET_KEY_RE = re.compile(
    r"(token|secret|password|api[_-]?key|authorization|refresh|ciphertext)",
    re.IGNORECASE,
)
SECRET_VALUE_PATTERNS = [
    re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----.*?-----END [A-Z ]*PRIVATE KEY-----", re.DOTALL),
    re.compile(r"Bearer\s+[A-Za-z0-9._~+/=-]{16,}", re.IGNORECASE),
    re.compile(r"\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b"),
    re.compile(
        r"(?i)(api[_-]?key|secret|token|password)\s*[:=]\s*['\"]?[A-Za-z0-9._~+/=-]{8,}['\"]?"
    ),
    re.compile(r"\bsb_secret_[A-Za-z0-9_-]{16,}\b"),
]

RESOURCE_KEYS = {
    "tool_call_id": "tool_call",
    "task_id": "task",
    "step_id": "step",
    "job_id": "job",
    "runtime_id": "runtime_instance",
    "runtime_instance_id": "runtime_instance",
    "approval_id": "approval",
    "evidence_id": "evidence",
    "finding_id": "finding",
    "report_id": "report",
    "document_id": "memory_document",
    "memory_document_id": "memory_document",
    "asset_id": "file_asset",
    "file_asset_id": "file_asset",
    "session_id": "session",
}


class ReplayService:
    def __init__(
        self,
        *,
        db: Session,
        replay_repository: ReplayRepository,
        session_repository: SessionRepository,
        review_repository: ReviewRepository,
        audit_repository: AuditRepository,
        storage_adapter: StorageAdapter,
        settings: Settings,
    ) -> None:
        self.db = db
        self.replay = replay_repository
        self.sessions = session_repository
        self.audit = AuditRecorder(audit_repository)
        self.artifacts = ArtifactWriter(
            repository=review_repository,
            storage=storage_adapter,
            settings=settings,
        )
        self.settings = settings

    def get_replay(
        self,
        *,
        session_id: str,
        auth: AuthContext,
        from_event_id: int | None = None,
        to_event_id: int | None = None,
        event_type: str | None = None,
        limit: int | None = None,
    ) -> SessionReplayResponse:
        workspace_id = parse_uuid(auth.workspace_id, field_name="workspace_id")
        session_uuid = parse_uuid(session_id, field_name="session_id")
        session = get_session_or_raise(
            self.sessions,
            workspace_id=workspace_id,
            session_id=session_uuid,
        )
        event_limit = min(
            max(limit or self.settings.replay_max_events, 1),
            self.settings.replay_max_events,
        )
        events = self.replay.list_events(
            workspace_id=workspace_id,
            session_id=session_uuid,
            from_event_id=from_event_id,
            to_event_id=to_event_id,
            event_type=event_type,
            limit=event_limit,
        )
        frames = [self._frame(event) for event in events]
        categories = Counter(frame.category for frame in frames)
        summary = ReplaySummary(
            event_count=len(frames),
            counts_by_category=dict(sorted(categories.items())),
            first_event_id=frames[0].event_id if frames else None,
            last_event_id=frames[-1].event_id if frames else None,
            first_event_at=frames[0].timestamp if frames else None,
            last_event_at=frames[-1].timestamp if frames else None,
            session_status=session.status,
            task_count=self.replay.count_tasks(workspace_id=workspace_id, session_id=session_uuid),
            tool_call_count=self.replay.count_tool_calls(
                workspace_id=workspace_id,
                session_id=session_uuid,
            ),
            evidence_count=self.replay.count_evidence(
                workspace_id=workspace_id,
                session_id=session_uuid,
            ),
            finding_count=self.replay.count_findings(
                workspace_id=workspace_id,
                session_id=session_uuid,
            ),
            approval_count=self.replay.count_approvals(
                workspace_id=workspace_id,
                session_id=session_uuid,
            ),
        )
        return SessionReplayResponse(
            session=ReplaySessionSummary(
                id=str(session.id),
                title=session.title,
                status=session.status,
            ),
            summary=summary,
            frames=frames,
        )

    def export_replay(
        self,
        *,
        session_id: str,
        auth: AuthContext,
        from_event_id: int | None = None,
        to_event_id: int | None = None,
        event_type: str | None = None,
        limit: int | None = None,
    ) -> SessionReplayExportResponse:
        replay = self.get_replay(
            session_id=session_id,
            auth=auth,
            from_event_id=from_event_id,
            to_event_id=to_event_id,
            event_type=event_type,
            limit=limit,
        )
        workspace_id = parse_uuid(auth.workspace_id, field_name="workspace_id")
        session_uuid = parse_uuid(session_id, field_name="session_id")
        content = json.dumps(replay.model_dump(), ensure_ascii=True, indent=2).encode("utf-8")
        asset = self.artifacts.store_bytes(
            workspace_id=workspace_id,
            prefix=f"replay/{session_uuid}",
            filename=f"session-replay-{session_uuid}.json",
            content=content,
            mime_type="application/json",
            metadata={
                "source": "session_replay",
                "session_id": str(session_uuid),
                "event_count": replay.summary.event_count,
            },
            created_by=parse_uuid(auth.user_id, field_name="user_id"),
        )
        self.sessions.create_event(
            workspace_id=workspace_id,
            session_id=session_uuid,
            event_type="session_replay.exported",
            payload={"asset_id": str(asset.id), "event_count": replay.summary.event_count},
            actor_type=auth.actor_type,
            actor_id=auth.api_token_id or auth.user_id,
        )
        self.audit.record(
            auth=auth,
            action="session_replay.exported",
            resource_type="session",
            resource_id=str(session_uuid),
            metadata={"asset_id": str(asset.id), "event_count": replay.summary.event_count},
        )
        self.db.commit()
        return SessionReplayExportResponse(file_asset=file_asset_response(asset))

    def _frame(self, event) -> ReplayFrame:
        category = _category_for(event.event_type)
        payload, truncated = _sanitize_payload(
            event.payload,
            max_bytes=self.settings.replay_payload_max_bytes,
            event_type=event.event_type,
        )
        resource_type, resource_id = _resource_from_payload(payload)
        return ReplayFrame(
            event_id=event.id,
            timestamp=event.created_at.isoformat(),
            event_type=event.event_type,
            category=category,
            title=_title_for(event.event_type),
            actor_type=event.actor_type,
            actor_id=_redact_string(event.actor_id),
            resource_type=resource_type,
            resource_id=resource_id,
            task_id=_string_or_none(payload.get("task_id")),
            step_id=_string_or_none(payload.get("step_id")),
            summary=_summary_for(event.event_type, payload),
            payload=payload,
            payload_truncated=truncated,
        )


def _category_for(event_type: str) -> str:
    prefix = event_type.split(".", 1)[0]
    if event_type.startswith("session_replay."):
        return "session_replay"
    return {
        "tool_call": "tool_call",
        "runtime": "runtime",
        "session": "session",
        "task": "task",
        "step": "step",
        "job": "job",
        "agent": "agent",
        "policy": "policy",
        "approval": "approval",
        "evidence": "evidence",
        "finding": "finding",
        "report": "report",
        "memory": "memory",
        "file_asset": "file_asset",
        "file": "file",
    }.get(prefix, prefix or "event")


def _title_for(event_type: str) -> str:
    return event_type.replace(".", " ").replace("_", " ").title()


def _summary_for(event_type: str, payload: dict[str, Any]) -> str:
    if event_type == "session.status_changed":
        previous = payload.get("previous_status") or payload.get("old_status")
        new = payload.get("new_status") or payload.get("status")
        if previous and new:
            return f"Session status changed from {previous} to {new}."
    status = payload.get("status") or payload.get("new_status")
    tool_name = payload.get("tool_name")
    job_type = payload.get("job_type") or payload.get("type")
    if tool_name and status:
        return f"{tool_name} {status}."
    if job_type and status:
        return f"{job_type} job {status}."
    if status:
        return f"{_title_for(event_type)}: {status}."
    return _title_for(event_type)


def _resource_from_payload(payload: dict[str, Any]) -> tuple[str | None, str | None]:
    for key, resource_type in RESOURCE_KEYS.items():
        value = payload.get(key)
        if value is not None:
            return resource_type, str(value)
    return None, None


def _sanitize_payload(
    payload: dict[str, Any],
    *,
    max_bytes: int,
    event_type: str,
) -> tuple[dict[str, Any], bool]:
    sanitized = _redact_value(payload)
    truncated = False
    if not isinstance(sanitized, dict):
        sanitized = {"value": sanitized}
    sanitized, string_truncated = _truncate_large_strings(sanitized, max_chars=min(max_bytes, 1024))
    truncated = truncated or string_truncated
    encoded = json.dumps(sanitized, default=str, ensure_ascii=True).encode("utf-8")
    if len(encoded) <= max_bytes:
        return sanitized, truncated

    keys = sorted(str(key) for key in payload.keys())
    compact = {"_truncated": True, "event_type": event_type, "keys": keys}
    return compact, True


def _redact_value(value: Any) -> Any:
    if isinstance(value, dict):
        redacted: dict[str, Any] = {}
        for key, item in value.items():
            key_text = str(key)
            if SECRET_KEY_RE.search(key_text):
                redacted[key_text] = "[REDACTED]"
            else:
                redacted[key_text] = _redact_value(item)
        return redacted
    if isinstance(value, list):
        return [_redact_value(item) for item in value]
    if isinstance(value, str):
        return _redact_string(value)
    return value


def _redact_string(value: str) -> str:
    redacted = value
    for pattern in SECRET_VALUE_PATTERNS:
        redacted = pattern.sub("[REDACTED]", redacted)
    return redacted


def _truncate_large_strings(value: Any, *, max_chars: int) -> tuple[Any, bool]:
    if isinstance(value, dict):
        changed = False
        output: dict[str, Any] = {}
        for key, item in value.items():
            output_item, item_changed = _truncate_large_strings(item, max_chars=max_chars)
            output[key] = output_item
            changed = changed or item_changed
        return output, changed
    if isinstance(value, list):
        changed = False
        output = []
        for item in value:
            output_item, item_changed = _truncate_large_strings(item, max_chars=max_chars)
            output.append(output_item)
            changed = changed or item_changed
        return output, changed
    if isinstance(value, str) and len(value) > max_chars:
        return f"{value[:max_chars]}... [truncated]", True
    return value, False


def _string_or_none(value: Any) -> str | None:
    return str(value) if value is not None else None
