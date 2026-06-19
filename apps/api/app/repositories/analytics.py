import uuid
from datetime import datetime

from sqlalchemy import select

from app.models.review import Finding
from app.models.session import ApprovalRequest, Job, SessionModel, ToolCall
from app.repositories.base import BaseRepository


class AnalyticsRepository(BaseRepository):
    def list_sessions(
        self,
        *,
        workspace_id: uuid.UUID,
        from_date: datetime,
        to_date: datetime,
        project_id: uuid.UUID | None,
    ) -> list[SessionModel]:
        statement = select(SessionModel).where(
            SessionModel.workspace_id == workspace_id,
            SessionModel.deleted_at.is_(None),
            SessionModel.created_at >= from_date,
            SessionModel.created_at <= to_date,
        )
        if project_id is not None:
            statement = statement.where(SessionModel.project_id == project_id)
        return list(self.db.scalars(statement.order_by(SessionModel.created_at.desc())))

    def list_tool_calls(
        self,
        *,
        workspace_id: uuid.UUID,
        from_date: datetime,
        to_date: datetime,
        project_id: uuid.UUID | None,
    ) -> list[ToolCall]:
        statement = select(ToolCall).where(
            ToolCall.workspace_id == workspace_id,
            ToolCall.created_at >= from_date,
            ToolCall.created_at <= to_date,
        )
        if project_id is not None:
            statement = statement.join(SessionModel, ToolCall.session_id == SessionModel.id).where(
                SessionModel.project_id == project_id,
                SessionModel.workspace_id == workspace_id,
            )
        return list(self.db.scalars(statement.order_by(ToolCall.created_at.desc())))

    def list_jobs(
        self,
        *,
        workspace_id: uuid.UUID,
        from_date: datetime,
        to_date: datetime,
        project_id: uuid.UUID | None,
    ) -> list[Job]:
        statement = select(Job).where(
            Job.workspace_id == workspace_id,
            Job.created_at >= from_date,
            Job.created_at <= to_date,
        )
        if project_id is not None:
            statement = statement.join(SessionModel, Job.session_id == SessionModel.id).where(
                SessionModel.project_id == project_id,
                SessionModel.workspace_id == workspace_id,
            )
        return list(self.db.scalars(statement.order_by(Job.created_at.desc())))

    def list_findings(
        self,
        *,
        workspace_id: uuid.UUID,
        from_date: datetime,
        to_date: datetime,
        project_id: uuid.UUID | None,
    ) -> list[Finding]:
        statement = select(Finding).where(
            Finding.workspace_id == workspace_id,
            Finding.deleted_at.is_(None),
            Finding.created_at >= from_date,
            Finding.created_at <= to_date,
        )
        if project_id is not None:
            statement = statement.where(Finding.project_id == project_id)
        return list(self.db.scalars(statement.order_by(Finding.created_at.desc())))

    def list_approvals(
        self,
        *,
        workspace_id: uuid.UUID,
        from_date: datetime,
        to_date: datetime,
        project_id: uuid.UUID | None,
    ) -> list[ApprovalRequest]:
        statement = select(ApprovalRequest).where(
            ApprovalRequest.workspace_id == workspace_id,
            ApprovalRequest.created_at >= from_date,
            ApprovalRequest.created_at <= to_date,
        )
        if project_id is not None:
            statement = statement.join(
                SessionModel,
                ApprovalRequest.session_id == SessionModel.id,
            ).where(
                SessionModel.project_id == project_id,
                SessionModel.workspace_id == workspace_id,
            )
        return list(self.db.scalars(statement.order_by(ApprovalRequest.created_at.desc())))
