import uuid
from datetime import UTC, datetime

from sqlalchemy.orm import Session

from app.auth.dependencies import AuthContext
from app.core.security import generate_token, hash_token
from app.domain.exceptions import ConflictError, NotFoundError
from app.domain.ids import parse_uuid
from app.domain.pagination import Page
from app.repositories.control_plane import ApiTokenRepository, AuditRepository
from app.schemas.api_tokens import ApiTokenCreateRequest, ApiTokenCreateResponse, ApiTokenResponse
from app.services.audit import AuditRecorder


class ApiTokenService:
    def __init__(
        self,
        *,
        db: Session,
        repository: ApiTokenRepository,
        audit_repository: AuditRepository,
    ) -> None:
        self.db = db
        self.repository = repository
        self.audit = AuditRecorder(audit_repository)

    def list_tokens(self, *, auth: AuthContext) -> Page[ApiTokenResponse]:
        tokens = self.repository.list_tokens(workspace_id=uuid.UUID(auth.workspace_id))
        return Page(items=[self._response(token) for token in tokens])

    def create_token(
        self,
        request: ApiTokenCreateRequest,
        *,
        auth: AuthContext,
    ) -> ApiTokenCreateResponse:
        if request.expires_at is not None and self._is_past(request.expires_at):
            raise ConflictError("API token expiry must be in the future.")

        raw_token = f"sfg_live_{generate_token()}"
        token = self.repository.create_token(
            workspace_id=uuid.UUID(auth.workspace_id),
            user_id=uuid.UUID(auth.user_id),
            name=request.name,
            token_prefix=raw_token[:17],
            token_hash=hash_token(raw_token),
            expires_at=request.expires_at,
        )
        self.audit.record(
            auth=auth,
            action="api_token.created",
            resource_type="api_token",
            resource_id=str(token.id),
            after={
                "name": token.name,
                "token_prefix": token.token_prefix,
                "expires_at": token.expires_at.isoformat() if token.expires_at else None,
            },
        )
        self.db.commit()
        response = self._response(token).model_dump()
        return ApiTokenCreateResponse(**response, token=raw_token)

    def revoke_token(self, *, token_id: str, auth: AuthContext) -> ApiTokenResponse:
        token_uuid = parse_uuid(token_id, field_name="token_id")
        token = self.repository.get_token(
            workspace_id=uuid.UUID(auth.workspace_id),
            token_id=token_uuid,
        )
        if token is None:
            raise NotFoundError("API token was not found.")

        before = {"status": token.status}
        token = self.repository.revoke_token(token)
        self.audit.record(
            auth=auth,
            action="api_token.revoked",
            resource_type="api_token",
            resource_id=str(token.id),
            before=before,
            after={"status": token.status},
        )
        self.db.commit()
        return self._response(token)

    @staticmethod
    def _is_past(value: datetime) -> bool:
        if value.tzinfo is None:
            value = value.replace(tzinfo=UTC)
        return value < datetime.now(UTC)

    @staticmethod
    def _response(token) -> ApiTokenResponse:
        return ApiTokenResponse(
            id=str(token.id),
            name=token.name,
            token_prefix=token.token_prefix,
            status=token.status,
            expires_at=token.expires_at,
            last_used_at=token.last_used_at,
            created_at=token.created_at,
        )
