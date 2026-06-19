import uuid

from sqlalchemy import func, select

from app.models.review import Evidence, Finding
from app.models.session import ApprovalRequest, SessionEvent, Task, ToolCall
from app.repositories.base import BaseRepository


class ReplayRepository(BaseRepository):
    def list_events(
        self,
        *,
        workspace_id: uuid.UUID,
        session_id: uuid.UUID,
        from_event_id: int | None,
        to_event_id: int | None,
        event_type: str | None,
        limit: int,
    ) -> list[SessionEvent]:
        statement = select(SessionEvent).where(
            SessionEvent.workspace_id == workspace_id,
            SessionEvent.session_id == session_id,
        )
        if from_event_id is not None:
            statement = statement.where(SessionEvent.id >= from_event_id)
        if to_event_id is not None:
            statement = statement.where(SessionEvent.id <= to_event_id)
        if event_type is not None:
            statement = statement.where(SessionEvent.event_type == event_type)
        return list(self.db.scalars(statement.order_by(SessionEvent.id).limit(limit)))

    def count_tasks(self, *, workspace_id: uuid.UUID, session_id: uuid.UUID) -> int:
        return int(
            self.db.scalar(
                select(func.count(Task.id)).where(
                    Task.workspace_id == workspace_id,
                    Task.session_id == session_id,
                )
            )
            or 0
        )

    def count_tool_calls(self, *, workspace_id: uuid.UUID, session_id: uuid.UUID) -> int:
        return int(
            self.db.scalar(
                select(func.count(ToolCall.id)).where(
                    ToolCall.workspace_id == workspace_id,
                    ToolCall.session_id == session_id,
                )
            )
            or 0
        )

    def count_evidence(self, *, workspace_id: uuid.UUID, session_id: uuid.UUID) -> int:
        return int(
            self.db.scalar(
                select(func.count(Evidence.id)).where(
                    Evidence.workspace_id == workspace_id,
                    Evidence.session_id == session_id,
                    Evidence.deleted_at.is_(None),
                )
            )
            or 0
        )

    def count_findings(self, *, workspace_id: uuid.UUID, session_id: uuid.UUID) -> int:
        return int(
            self.db.scalar(
                select(func.count(Finding.id)).where(
                    Finding.workspace_id == workspace_id,
                    Finding.session_id == session_id,
                    Finding.deleted_at.is_(None),
                )
            )
            or 0
        )

    def count_approvals(self, *, workspace_id: uuid.UUID, session_id: uuid.UUID) -> int:
        return int(
            self.db.scalar(
                select(func.count(ApprovalRequest.id)).where(
                    ApprovalRequest.workspace_id == workspace_id,
                    ApprovalRequest.session_id == session_id,
                )
            )
            or 0
        )

