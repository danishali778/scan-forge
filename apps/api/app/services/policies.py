import uuid

from sqlalchemy.orm import Session

from app.auth.dependencies import AuthContext
from app.domain.exceptions import NotFoundError
from app.domain.ids import parse_uuid
from app.domain.pagination import Page
from app.repositories.control_plane import AuditRepository, ConfigurationRepository
from app.schemas.policies import PolicyCreateRequest, PolicyResponse, PolicyUpdateRequest
from app.services.audit import AuditRecorder


class PolicyService:
    def __init__(
        self,
        *,
        db: Session,
        repository: ConfigurationRepository,
        audit_repository: AuditRepository,
    ) -> None:
        self.db = db
        self.repository = repository
        self.audit = AuditRecorder(audit_repository)

    def list_policies(self, *, auth: AuthContext) -> Page[PolicyResponse]:
        policies = self.repository.list_policies(workspace_id=uuid.UUID(auth.workspace_id))
        return Page(items=[self._response(policy) for policy in policies])

    def create_policy(
        self,
        request: PolicyCreateRequest,
        *,
        auth: AuthContext,
    ) -> PolicyResponse:
        policy = self.repository.create_policy(
            workspace_id=uuid.UUID(auth.workspace_id),
            name=request.name,
            description=request.description,
            rules=request.rules,
        )
        self.audit.record(
            auth=auth,
            action="policy.created",
            resource_type="policy",
            resource_id=str(policy.id),
            after=self._audit_payload(policy),
        )
        self.db.commit()
        return self._response(policy)

    def get_policy(self, *, policy_id: str, auth: AuthContext) -> PolicyResponse:
        policy = self._get_policy(policy_id=policy_id, auth=auth)
        return self._response(policy)

    def update_policy(
        self,
        *,
        policy_id: str,
        request: PolicyUpdateRequest,
        auth: AuthContext,
    ) -> PolicyResponse:
        policy = self._get_policy(policy_id=policy_id, auth=auth)
        before = self._audit_payload(policy)
        policy = self.repository.update_policy(
            policy,
            name=request.name,
            description=request.description,
            rules=request.rules,
            status=request.status,
        )
        self.audit.record(
            auth=auth,
            action="policy.updated",
            resource_type="policy",
            resource_id=str(policy.id),
            before=before,
            after=self._audit_payload(policy),
        )
        self.db.commit()
        return self._response(policy)

    def delete_policy(self, *, policy_id: str, auth: AuthContext) -> PolicyResponse:
        policy = self._get_policy(policy_id=policy_id, auth=auth)
        before = self._audit_payload(policy)
        policy = self.repository.delete_policy(policy)
        self.audit.record(
            auth=auth,
            action="policy.deleted",
            resource_type="policy",
            resource_id=str(policy.id),
            before=before,
            after={"deleted": True},
        )
        self.db.commit()
        return self._response(policy)

    def _get_policy(self, *, policy_id: str, auth: AuthContext):
        policy_uuid = parse_uuid(policy_id, field_name="policy_id")
        policy = self.repository.get_policy(
            workspace_id=uuid.UUID(auth.workspace_id),
            policy_id=policy_uuid,
        )
        if policy is None:
            raise NotFoundError("Policy was not found.")
        return policy

    @staticmethod
    def _response(policy) -> PolicyResponse:
        return PolicyResponse(
            id=str(policy.id),
            name=policy.name,
            description=policy.description,
            rules=policy.rules,
            status=policy.status,
        )

    @staticmethod
    def _audit_payload(policy) -> dict[str, object]:
        return {
            "name": policy.name,
            "description": policy.description,
            "rules": policy.rules,
            "status": policy.status,
        }
