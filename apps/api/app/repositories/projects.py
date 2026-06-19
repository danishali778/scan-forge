import uuid
from datetime import UTC, datetime

from sqlalchemy import select

from app.models.project import Project, Scope, Target
from app.repositories.base import BaseRepository


class ProjectRepository(BaseRepository):
    def list_projects(self, *, workspace_id: uuid.UUID) -> list[Project]:
        return list(
            self.db.scalars(
                select(Project)
                .where(Project.workspace_id == workspace_id, Project.deleted_at.is_(None))
                .order_by(Project.created_at.desc())
            )
        )

    def create_project(
        self,
        *,
        workspace_id: uuid.UUID,
        name: str,
        description: str | None,
        metadata: dict[str, object],
        created_by: uuid.UUID | None = None,
    ) -> Project:
        project = Project(
            workspace_id=workspace_id,
            name=name,
            description=description,
            metadata_json=metadata,
            created_by=created_by,
            status="active",
        )
        self.db.add(project)
        self.db.flush()
        return project

    def get_project(self, *, workspace_id: uuid.UUID, project_id: uuid.UUID) -> Project | None:
        return self.db.scalar(
            select(Project).where(
                Project.id == project_id,
                Project.workspace_id == workspace_id,
                Project.deleted_at.is_(None),
            )
        )

    def list_scopes(self, *, workspace_id: uuid.UUID, project_id: uuid.UUID) -> list[Scope]:
        return list(
            self.db.scalars(
                select(Scope)
                .where(
                    Scope.workspace_id == workspace_id,
                    Scope.project_id == project_id,
                    Scope.deleted_at.is_(None),
                )
                .order_by(Scope.created_at.desc())
            )
        )

    def create_scope(
        self,
        *,
        workspace_id: uuid.UUID,
        project_id: uuid.UUID,
        name: str,
        description: str | None,
        rules: dict[str, object],
    ) -> Scope:
        scope = Scope(
            workspace_id=workspace_id,
            project_id=project_id,
            name=name,
            description=description,
            rules=rules,
        )
        self.db.add(scope)
        self.db.flush()
        return scope

    def get_scope(
        self,
        *,
        workspace_id: uuid.UUID,
        project_id: uuid.UUID,
        scope_id: uuid.UUID,
    ) -> Scope | None:
        return self.db.scalar(
            select(Scope).where(
                Scope.id == scope_id,
                Scope.workspace_id == workspace_id,
                Scope.project_id == project_id,
                Scope.deleted_at.is_(None),
            )
        )

    def list_targets(self, *, workspace_id: uuid.UUID, project_id: uuid.UUID) -> list[Target]:
        return list(
            self.db.scalars(
                select(Target)
                .where(
                    Target.workspace_id == workspace_id,
                    Target.project_id == project_id,
                    Target.deleted_at.is_(None),
                )
                .order_by(Target.created_at.desc())
            )
        )

    def create_target(
        self,
        *,
        workspace_id: uuid.UUID,
        project_id: uuid.UUID,
        target_type: str,
        value: str,
        label: str | None,
        metadata: dict[str, object],
    ) -> Target:
        target = Target(
            workspace_id=workspace_id,
            project_id=project_id,
            type=target_type,
            value=value,
            label=label,
            metadata_json=metadata,
        )
        self.db.add(target)
        self.db.flush()
        return target

    def get_target(self, *, workspace_id: uuid.UUID, target_id: uuid.UUID) -> Target | None:
        return self.db.scalar(
            select(Target).where(
                Target.id == target_id,
                Target.workspace_id == workspace_id,
                Target.deleted_at.is_(None),
            )
        )

    def update_target(
        self,
        target: Target,
        *,
        target_type: str | None,
        value: str | None,
        label: str | None,
        metadata: dict[str, object] | None,
    ) -> Target:
        if target_type is not None:
            target.type = target_type
        if value is not None:
            target.value = value
        if label is not None:
            target.label = label
        if metadata is not None:
            target.metadata_json = metadata
        self.db.add(target)
        self.db.flush()
        return target

    def delete_target(self, target: Target) -> Target:
        target.deleted_at = datetime.now(UTC)
        self.db.add(target)
        self.db.flush()
        return target
