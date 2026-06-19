import uuid
from datetime import UTC, datetime

from sqlalchemy import select

from app.models.control_plane import ApiToken, AuditEvent, Policy, ProviderProfile, Secret
from app.models.identity import Role, User, Workspace
from app.repositories.base import BaseRepository


class AuditRepository(BaseRepository):
    def create_event(
        self,
        *,
        workspace_id: uuid.UUID,
        actor_type: str,
        actor_id: str,
        action: str,
        resource_type: str,
        resource_id: str,
        before: dict[str, object] | None = None,
        after: dict[str, object] | None = None,
        metadata: dict[str, object] | None = None,
        ip_address: str | None = None,
        user_agent: str | None = None,
    ) -> AuditEvent:
        event = AuditEvent(
            workspace_id=workspace_id,
            actor_type=actor_type,
            actor_id=actor_id,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            before_json=before,
            after_json=after,
            metadata_json=metadata or {},
            ip_address=ip_address,
            user_agent=user_agent,
            created_at=datetime.now(UTC),
        )
        self.db.add(event)
        self.db.flush()
        return event

    def list_events(
        self,
        *,
        workspace_id: uuid.UUID,
        action: str | None = None,
        resource_type: str | None = None,
        limit: int = 50,
    ) -> list[AuditEvent]:
        statement = select(AuditEvent).where(AuditEvent.workspace_id == workspace_id)
        if action:
            statement = statement.where(AuditEvent.action == action)
        if resource_type:
            statement = statement.where(AuditEvent.resource_type == resource_type)
        return list(self.db.scalars(statement.order_by(AuditEvent.created_at.desc()).limit(limit)))


class WorkspaceRepository(BaseRepository):
    def get_workspace(self, *, workspace_id: uuid.UUID) -> Workspace | None:
        return self.db.scalar(
            select(Workspace).where(Workspace.id == workspace_id, Workspace.deleted_at.is_(None))
        )

    def update_workspace(
        self,
        workspace: Workspace,
        *,
        name: str | None,
        settings: dict[str, object] | None,
    ) -> Workspace:
        if name is not None:
            workspace.name = name
        if settings is not None:
            workspace.settings = settings
        self.db.add(workspace)
        self.db.flush()
        return workspace

    def list_roles(self, *, workspace_id: uuid.UUID) -> list[Role]:
        return list(
            self.db.scalars(
                select(Role).where(Role.workspace_id == workspace_id).order_by(Role.name)
            )
        )

    def get_role(self, *, workspace_id: uuid.UUID, role_id: uuid.UUID) -> Role | None:
        return self.db.scalar(
            select(Role).where(Role.workspace_id == workspace_id, Role.id == role_id)
        )


class UserRepository(BaseRepository):
    def list_users(self, *, workspace_id: uuid.UUID) -> list[User]:
        return list(
            self.db.scalars(
                select(User)
                .where(User.workspace_id == workspace_id, User.deleted_at.is_(None))
                .order_by(User.created_at.desc())
            )
        )

    def get_user(self, *, workspace_id: uuid.UUID, user_id: uuid.UUID) -> User | None:
        return self.db.scalar(
            select(User).where(
                User.workspace_id == workspace_id,
                User.id == user_id,
                User.deleted_at.is_(None),
            )
        )

    def get_user_by_email(self, *, workspace_id: uuid.UUID, email: str) -> User | None:
        return self.db.scalar(
            select(User).where(
                User.workspace_id == workspace_id,
                User.email == email,
                User.deleted_at.is_(None),
            )
        )

    def create_invited_user(
        self,
        *,
        workspace_id: uuid.UUID,
        email: str,
        name: str | None,
        role_id: uuid.UUID,
    ) -> User:
        user = User(
            workspace_id=workspace_id,
            email=email,
            name=name or email,
            status="invited",
            type="human",
            role_id=role_id,
        )
        self.db.add(user)
        self.db.flush()
        return user

    def update_user(
        self,
        user: User,
        *,
        name: str | None,
        role_id: uuid.UUID | None,
        status: str | None,
    ) -> User:
        if name is not None:
            user.name = name
        if role_id is not None:
            user.role_id = role_id
        if status is not None:
            user.status = status
        self.db.add(user)
        self.db.flush()
        return user


class ApiTokenRepository(BaseRepository):
    def list_tokens(self, *, workspace_id: uuid.UUID) -> list[ApiToken]:
        return list(
            self.db.scalars(
                select(ApiToken)
                .where(ApiToken.workspace_id == workspace_id, ApiToken.deleted_at.is_(None))
                .order_by(ApiToken.created_at.desc())
            )
        )

    def create_token(
        self,
        *,
        workspace_id: uuid.UUID,
        user_id: uuid.UUID,
        name: str,
        token_prefix: str,
        token_hash: str,
        expires_at: datetime | None,
    ) -> ApiToken:
        token = ApiToken(
            workspace_id=workspace_id,
            user_id=user_id,
            name=name,
            token_prefix=token_prefix,
            token_hash=token_hash,
            expires_at=expires_at,
            status="active",
            created_at=datetime.now(UTC),
        )
        self.db.add(token)
        self.db.flush()
        return token

    def get_token(self, *, workspace_id: uuid.UUID, token_id: uuid.UUID) -> ApiToken | None:
        return self.db.scalar(
            select(ApiToken).where(
                ApiToken.workspace_id == workspace_id,
                ApiToken.id == token_id,
                ApiToken.deleted_at.is_(None),
            )
        )

    def revoke_token(self, token: ApiToken) -> ApiToken:
        token.status = "revoked"
        token.revoked_at = datetime.now(UTC)
        self.db.add(token)
        self.db.flush()
        return token


class ConfigurationRepository(BaseRepository):
    def create_secret(
        self,
        *,
        workspace_id: uuid.UUID,
        name: str,
        secret_type: str,
        ciphertext: str,
        created_by: uuid.UUID,
    ) -> Secret:
        secret = Secret(
            workspace_id=workspace_id,
            name=name,
            secret_type=secret_type,
            ciphertext=ciphertext,
            created_by=created_by,
            created_at=datetime.now(UTC),
        )
        self.db.add(secret)
        self.db.flush()
        return secret

    def update_secret(self, secret: Secret, *, ciphertext: str) -> Secret:
        secret.ciphertext = ciphertext
        self.db.add(secret)
        self.db.flush()
        return secret

    def get_secret(self, *, workspace_id: uuid.UUID, secret_id: uuid.UUID) -> Secret | None:
        return self.db.scalar(
            select(Secret).where(
                Secret.workspace_id == workspace_id,
                Secret.id == secret_id,
                Secret.deleted_at.is_(None),
            )
        )

    def list_provider_profiles(self, *, workspace_id: uuid.UUID) -> list[ProviderProfile]:
        return list(
            self.db.scalars(
                select(ProviderProfile)
                .where(
                    ProviderProfile.workspace_id == workspace_id,
                    ProviderProfile.deleted_at.is_(None),
                )
                .order_by(ProviderProfile.created_at.desc())
            )
        )

    def get_provider_profile(
        self,
        *,
        workspace_id: uuid.UUID,
        profile_id: uuid.UUID,
    ) -> ProviderProfile | None:
        return self.db.scalar(
            select(ProviderProfile).where(
                ProviderProfile.workspace_id == workspace_id,
                ProviderProfile.id == profile_id,
                ProviderProfile.deleted_at.is_(None),
            )
        )

    def create_provider_profile(
        self,
        *,
        workspace_id: uuid.UUID,
        name: str,
        provider_type: str,
        base_url: str | None,
        credential_secret_id: uuid.UUID | None,
        agent_models: dict[str, object],
        options: dict[str, object],
        budgets: dict[str, object],
    ) -> ProviderProfile:
        profile = ProviderProfile(
            workspace_id=workspace_id,
            name=name,
            provider_type=provider_type,
            base_url=base_url,
            credential_secret_id=credential_secret_id,
            agent_models=agent_models,
            options=options,
            budgets=budgets,
            status="active",
        )
        self.db.add(profile)
        self.db.flush()
        return profile

    def update_provider_profile(
        self,
        profile: ProviderProfile,
        *,
        name: str | None,
        provider_type: str | None,
        base_url: str | None,
        credential_secret_id: uuid.UUID | None,
        agent_models: dict[str, object] | None,
        options: dict[str, object] | None,
        budgets: dict[str, object] | None,
        status: str | None,
    ) -> ProviderProfile:
        if name is not None:
            profile.name = name
        if provider_type is not None:
            profile.provider_type = provider_type
        if base_url is not None:
            profile.base_url = base_url
        if credential_secret_id is not None:
            profile.credential_secret_id = credential_secret_id
        if agent_models is not None:
            profile.agent_models = agent_models
        if options is not None:
            profile.options = options
        if budgets is not None:
            profile.budgets = budgets
        if status is not None:
            profile.status = status
        self.db.add(profile)
        self.db.flush()
        return profile

    def delete_provider_profile(self, profile: ProviderProfile) -> ProviderProfile:
        profile.deleted_at = datetime.now(UTC)
        self.db.add(profile)
        self.db.flush()
        return profile

    def list_policies(self, *, workspace_id: uuid.UUID) -> list[Policy]:
        return list(
            self.db.scalars(
                select(Policy)
                .where(Policy.workspace_id == workspace_id, Policy.deleted_at.is_(None))
                .order_by(Policy.created_at.desc())
            )
        )

    def get_policy(self, *, workspace_id: uuid.UUID, policy_id: uuid.UUID) -> Policy | None:
        return self.db.scalar(
            select(Policy).where(
                Policy.workspace_id == workspace_id,
                Policy.id == policy_id,
                Policy.deleted_at.is_(None),
            )
        )

    def create_policy(
        self,
        *,
        workspace_id: uuid.UUID,
        name: str,
        description: str | None,
        rules: dict[str, object],
    ) -> Policy:
        policy = Policy(
            workspace_id=workspace_id,
            name=name,
            description=description,
            rules=rules,
            status="active",
        )
        self.db.add(policy)
        self.db.flush()
        return policy

    def update_policy(
        self,
        policy: Policy,
        *,
        name: str | None,
        description: str | None,
        rules: dict[str, object] | None,
        status: str | None,
    ) -> Policy:
        if name is not None:
            policy.name = name
        if description is not None:
            policy.description = description
        if rules is not None:
            policy.rules = rules
        if status is not None:
            policy.status = status
        self.db.add(policy)
        self.db.flush()
        return policy

    def delete_policy(self, policy: Policy) -> Policy:
        policy.deleted_at = datetime.now(UTC)
        self.db.add(policy)
        self.db.flush()
        return policy
