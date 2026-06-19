import uuid

from sqlalchemy.orm import Session

from app.auth.dependencies import AuthContext
from app.core.config import Settings
from app.core.security import TokenCipher
from app.domain.exceptions import NotFoundError
from app.domain.ids import parse_uuid
from app.domain.pagination import Page
from app.repositories.control_plane import AuditRepository, ConfigurationRepository
from app.schemas.provider_profiles import (
    ProviderProfileCreateRequest,
    ProviderProfileResponse,
    ProviderProfileUpdateRequest,
)
from app.services.audit import AuditRecorder


class ProviderProfileService:
    def __init__(
        self,
        *,
        db: Session,
        repository: ConfigurationRepository,
        audit_repository: AuditRepository,
        settings: Settings,
    ) -> None:
        self.db = db
        self.repository = repository
        self.audit = AuditRecorder(audit_repository)
        self.cipher = TokenCipher(settings.auth_encryption_key)

    def list_profiles(self, *, auth: AuthContext) -> Page[ProviderProfileResponse]:
        profiles = self.repository.list_provider_profiles(
            workspace_id=uuid.UUID(auth.workspace_id)
        )
        return Page(items=[self._response(profile) for profile in profiles])

    def create_profile(
        self,
        request: ProviderProfileCreateRequest,
        *,
        auth: AuthContext,
    ) -> ProviderProfileResponse:
        workspace_id = uuid.UUID(auth.workspace_id)
        profile = self.repository.create_provider_profile(
            workspace_id=workspace_id,
            name=request.name,
            provider_type=request.provider_type,
            base_url=request.base_url,
            credential_secret_id=None,
            agent_models=request.agent_models,
            options=request.options,
            budgets=request.budgets,
        )
        if request.api_key:
            secret = self.repository.create_secret(
                workspace_id=workspace_id,
                name=f"provider_profile:{profile.id}:api_key",
                secret_type="provider_api_key",
                ciphertext=self.cipher.encrypt(request.api_key) or "",
                created_by=uuid.UUID(auth.user_id),
            )
            profile = self.repository.update_provider_profile(
                profile,
                name=None,
                provider_type=None,
                base_url=None,
                credential_secret_id=secret.id,
                agent_models=None,
                options=None,
                budgets=None,
                status=None,
            )

        self.audit.record(
            auth=auth,
            action="provider_profile.created",
            resource_type="provider_profile",
            resource_id=str(profile.id),
            after=self._audit_payload(profile),
        )
        self.db.commit()
        return self._response(profile)

    def get_profile(self, *, profile_id: str, auth: AuthContext) -> ProviderProfileResponse:
        profile = self._get_profile(profile_id=profile_id, auth=auth)
        return self._response(profile)

    def update_profile(
        self,
        *,
        profile_id: str,
        request: ProviderProfileUpdateRequest,
        auth: AuthContext,
    ) -> ProviderProfileResponse:
        workspace_id = uuid.UUID(auth.workspace_id)
        profile = self._get_profile(profile_id=profile_id, auth=auth)
        before = self._audit_payload(profile)
        credential_secret_id = None

        if request.api_key:
            if profile.credential_secret_id is not None:
                secret = self.repository.get_secret(
                    workspace_id=workspace_id,
                    secret_id=profile.credential_secret_id,
                )
            else:
                secret = None

            if secret is None:
                secret = self.repository.create_secret(
                    workspace_id=workspace_id,
                    name=f"provider_profile:{profile.id}:api_key",
                    secret_type="provider_api_key",
                    ciphertext=self.cipher.encrypt(request.api_key) or "",
                    created_by=uuid.UUID(auth.user_id),
                )
            else:
                secret = self.repository.update_secret(
                    secret,
                    ciphertext=self.cipher.encrypt(request.api_key) or "",
                )
            credential_secret_id = secret.id

        profile = self.repository.update_provider_profile(
            profile,
            name=request.name,
            provider_type=request.provider_type,
            base_url=request.base_url,
            credential_secret_id=credential_secret_id,
            agent_models=request.agent_models,
            options=request.options,
            budgets=request.budgets,
            status=request.status,
        )
        self.audit.record(
            auth=auth,
            action="provider_profile.updated",
            resource_type="provider_profile",
            resource_id=str(profile.id),
            before=before,
            after=self._audit_payload(profile),
        )
        self.db.commit()
        return self._response(profile)

    def delete_profile(self, *, profile_id: str, auth: AuthContext) -> ProviderProfileResponse:
        profile = self._get_profile(profile_id=profile_id, auth=auth)
        before = self._audit_payload(profile)
        profile = self.repository.delete_provider_profile(profile)
        self.audit.record(
            auth=auth,
            action="provider_profile.deleted",
            resource_type="provider_profile",
            resource_id=str(profile.id),
            before=before,
            after={"deleted": True},
        )
        self.db.commit()
        return self._response(profile)

    def _get_profile(self, *, profile_id: str, auth: AuthContext):
        profile_uuid = parse_uuid(profile_id, field_name="profile_id")
        profile = self.repository.get_provider_profile(
            workspace_id=uuid.UUID(auth.workspace_id),
            profile_id=profile_uuid,
        )
        if profile is None:
            raise NotFoundError("Provider profile was not found.")
        return profile

    @staticmethod
    def _response(profile) -> ProviderProfileResponse:
        return ProviderProfileResponse(
            id=str(profile.id),
            name=profile.name,
            provider_type=profile.provider_type,
            base_url=profile.base_url,
            agent_models=profile.agent_models,
            options=profile.options,
            budgets=profile.budgets,
            status=profile.status,
            has_credential=profile.credential_secret_id is not None,
        )

    @staticmethod
    def _audit_payload(profile) -> dict[str, object]:
        return {
            "name": profile.name,
            "provider_type": profile.provider_type,
            "base_url": profile.base_url,
            "status": profile.status,
            "has_credential": profile.credential_secret_id is not None,
        }
