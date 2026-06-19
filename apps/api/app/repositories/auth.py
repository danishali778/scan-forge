import uuid
from datetime import UTC, datetime

from sqlalchemy import func, select

from app.domain.permissions import DEFAULT_ROLE_DESCRIPTIONS, ROLE_PERMISSIONS
from app.models.control_plane import ApiToken
from app.models.identity import AuthSession, Role, RolePermission, User, Workspace
from app.repositories.base import BaseRepository


class AuthRepository(BaseRepository):
    def count_workspaces(self) -> int:
        return self.db.scalar(select(func.count(Workspace.id))) or 0

    def get_user_by_supabase_id(self, supabase_user_id: uuid.UUID) -> User | None:
        return self.db.scalar(
            select(User).where(
                User.supabase_user_id == supabase_user_id,
                User.deleted_at.is_(None),
                User.status == "active",
            )
        )

    def list_invited_users_by_email(self, email: str) -> list[User]:
        return list(
            self.db.scalars(
                select(User).where(
                    User.email == email,
                    User.supabase_user_id.is_(None),
                    User.deleted_at.is_(None),
                    User.status == "invited",
                )
            )
        )

    def activate_invited_user(self, user: User, *, supabase_user_id: uuid.UUID) -> User:
        user.supabase_user_id = supabase_user_id
        user.status = "active"
        user.last_login_at = datetime.now(UTC)
        self.db.add(user)
        self.db.flush()
        return user

    def create_bootstrap_user(self, *, supabase_user_id: uuid.UUID, email: str) -> User:
        now = datetime.now(UTC)
        workspace = Workspace(
            name="Default Workspace",
            slug="default",
            settings={},
        )
        self.db.add(workspace)
        self.db.flush()

        roles = self.create_default_roles(workspace_id=workspace.id)
        role = roles["Owner"]

        user = User(
            workspace_id=workspace.id,
            supabase_user_id=supabase_user_id,
            email=email,
            name=email,
            type="human",
            status="active",
            role_id=role.id,
            last_login_at=now,
        )
        self.db.add(user)
        self.db.flush()
        return user

    def create_default_roles(self, *, workspace_id: uuid.UUID) -> dict[str, Role]:
        roles: dict[str, Role] = {}
        for role_name, permissions in ROLE_PERMISSIONS.items():
            role = self.db.scalar(
                select(Role).where(Role.workspace_id == workspace_id, Role.name == role_name)
            )
            if role is None:
                role = Role(
                    workspace_id=workspace_id,
                    name=role_name,
                    description=DEFAULT_ROLE_DESCRIPTIONS[role_name],
                )
                self.db.add(role)
                self.db.flush()
            roles[role_name] = role

            existing_permissions = set(self.list_permissions(role.id))
            new_permissions = [
                RolePermission(role_id=role.id, permission=permission)
                for permission in permissions
                if permission not in existing_permissions
            ]
            self.db.add_all(new_permissions)
        self.db.flush()
        return roles

    def mark_user_login(self, user: User) -> None:
        user.last_login_at = datetime.now(UTC)
        self.db.add(user)

    def list_permissions(self, role_id: uuid.UUID) -> list[str]:
        return list(
            self.db.scalars(
                select(RolePermission.permission)
                .where(RolePermission.role_id == role_id)
                .order_by(RolePermission.permission)
            )
        )

    def create_auth_session(
        self,
        *,
        workspace_id: uuid.UUID,
        user_id: uuid.UUID,
        session_hash: str,
        csrf_hash: str,
        encrypted_refresh_token: str | None,
        supabase_session_id: str | None,
        expires_at: datetime,
        user_agent: str | None,
    ) -> AuthSession:
        now = datetime.now(UTC)
        auth_session = AuthSession(
            workspace_id=workspace_id,
            user_id=user_id,
            session_hash=session_hash,
            csrf_hash=csrf_hash,
            encrypted_refresh_token=encrypted_refresh_token,
            supabase_session_id=supabase_session_id,
            user_agent=user_agent,
            status="active",
            expires_at=expires_at,
            last_seen_at=now,
            created_at=now,
        )
        self.db.add(auth_session)
        self.db.flush()
        return auth_session

    def get_active_session_by_hash(self, session_hash: str) -> AuthSession | None:
        return self.db.scalar(
            select(AuthSession).where(
                AuthSession.session_hash == session_hash,
                AuthSession.status == "active",
            )
        )

    def revoke_session(self, auth_session: AuthSession) -> None:
        auth_session.status = "revoked"
        auth_session.revoked_at = datetime.now(UTC)
        self.db.add(auth_session)

    def update_session_refresh_token(
        self,
        auth_session: AuthSession,
        *,
        encrypted_refresh_token: str | None,
        expires_at: datetime,
    ) -> None:
        auth_session.encrypted_refresh_token = encrypted_refresh_token
        auth_session.expires_at = expires_at
        auth_session.last_seen_at = datetime.now(UTC)
        self.db.add(auth_session)

    def get_active_api_token_by_hash(self, token_hash: str) -> ApiToken | None:
        return self.db.scalar(
            select(ApiToken).where(
                ApiToken.token_hash == token_hash,
                ApiToken.status == "active",
                ApiToken.deleted_at.is_(None),
            )
        )

    def mark_api_token_used(self, api_token: ApiToken) -> None:
        api_token.last_used_at = datetime.now(UTC)
        self.db.add(api_token)
