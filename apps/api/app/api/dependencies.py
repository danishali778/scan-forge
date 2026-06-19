from typing import Annotated

from fastapi import Depends
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.db.session import get_db_session
from app.integrations.queue import CeleryQueueClient, QueueClient
from app.integrations.runtime import RuntimeServiceClient
from app.integrations.storage import StorageAdapter, SupabaseStorageAdapter
from app.integrations.supabase.auth import SupabaseAuthAdapter
from app.repositories.analytics import AnalyticsRepository
from app.repositories.auth import AuthRepository
from app.repositories.control_plane import (
    ApiTokenRepository,
    AuditRepository,
    ConfigurationRepository,
    UserRepository,
    WorkspaceRepository,
)
from app.repositories.memory import MemoryRepository
from app.repositories.projects import ProjectRepository
from app.repositories.replay import ReplayRepository
from app.repositories.review import ReviewRepository
from app.repositories.sessions import SessionRepository
from app.services.agents import AgentService
from app.services.analytics import AnalyticsService
from app.services.api_tokens import ApiTokenService
from app.services.approvals import ApprovalService
from app.services.audit_events import AuditEventService
from app.services.auth import AuthService
from app.services.memory import MemoryService
from app.services.policies import PolicyService
from app.services.projects import ProjectService
from app.services.provider_profiles import ProviderProfileService
from app.services.replay import ReplayService
from app.services.review import ReviewService
from app.services.sessions import SessionService
from app.services.targets import TargetService
from app.services.tools import ToolDefinitionService
from app.services.users import UserService
from app.services.workspace import WorkspaceService


def get_supabase_auth_adapter() -> SupabaseAuthAdapter:
    return SupabaseAuthAdapter()


def get_queue_client() -> QueueClient:
    return CeleryQueueClient()


def get_runtime_client() -> RuntimeServiceClient:
    return RuntimeServiceClient()


def get_storage_adapter() -> StorageAdapter:
    return SupabaseStorageAdapter()


def get_auth_service(
    db: Annotated[Session, Depends(get_db_session)],
    adapter: Annotated[SupabaseAuthAdapter, Depends(get_supabase_auth_adapter)],
) -> AuthService:
    return AuthService(
        db=db,
        repository=AuthRepository(db),
        audit_repository=AuditRepository(db),
        supabase_auth=adapter,
        settings=get_settings(),
    )


def get_project_service(db: Annotated[Session, Depends(get_db_session)]) -> ProjectService:
    return ProjectService(
        db=db,
        repository=ProjectRepository(db),
        audit_repository=AuditRepository(db),
    )


def get_session_service(
    db: Annotated[Session, Depends(get_db_session)],
    queue_client: Annotated[QueueClient, Depends(get_queue_client)],
    runtime_client: Annotated[RuntimeServiceClient, Depends(get_runtime_client)],
) -> SessionService:
    return SessionService(
        db=db,
        repository=SessionRepository(db),
        project_repository=ProjectRepository(db),
        configuration_repository=ConfigurationRepository(db),
        audit_repository=AuditRepository(db),
        queue_client=queue_client,
        runtime_client=runtime_client,
    )


def get_workspace_service(db: Annotated[Session, Depends(get_db_session)]) -> WorkspaceService:
    return WorkspaceService(
        db=db,
        repository=WorkspaceRepository(db),
        audit_repository=AuditRepository(db),
    )


def get_user_service(db: Annotated[Session, Depends(get_db_session)]) -> UserService:
    return UserService(
        db=db,
        user_repository=UserRepository(db),
        workspace_repository=WorkspaceRepository(db),
        audit_repository=AuditRepository(db),
    )


def get_api_token_service(db: Annotated[Session, Depends(get_db_session)]) -> ApiTokenService:
    return ApiTokenService(
        db=db,
        repository=ApiTokenRepository(db),
        audit_repository=AuditRepository(db),
    )


def get_target_service(db: Annotated[Session, Depends(get_db_session)]) -> TargetService:
    return TargetService(
        db=db,
        repository=ProjectRepository(db),
        audit_repository=AuditRepository(db),
    )


def get_provider_profile_service(
    db: Annotated[Session, Depends(get_db_session)],
) -> ProviderProfileService:
    return ProviderProfileService(
        db=db,
        repository=ConfigurationRepository(db),
        audit_repository=AuditRepository(db),
        settings=get_settings(),
    )


def get_policy_service(db: Annotated[Session, Depends(get_db_session)]) -> PolicyService:
    return PolicyService(
        db=db,
        repository=ConfigurationRepository(db),
        audit_repository=AuditRepository(db),
    )


def get_audit_event_service(db: Annotated[Session, Depends(get_db_session)]) -> AuditEventService:
    return AuditEventService(db=db, repository=AuditRepository(db))


def get_agent_service(
    db: Annotated[Session, Depends(get_db_session)],
    queue_client: Annotated[QueueClient, Depends(get_queue_client)],
) -> AgentService:
    return AgentService(
        db=db,
        repository=SessionRepository(db),
        queue_client=queue_client,
    )


def get_approval_service(
    db: Annotated[Session, Depends(get_db_session)],
    queue_client: Annotated[QueueClient, Depends(get_queue_client)],
) -> ApprovalService:
    return ApprovalService(
        db=db,
        repository=SessionRepository(db),
        audit_repository=AuditRepository(db),
        queue_client=queue_client,
    )


def get_tool_definition_service(
    db: Annotated[Session, Depends(get_db_session)],
) -> ToolDefinitionService:
    return ToolDefinitionService(
        repository=SessionRepository(db),
        settings=get_settings(),
    )


def get_review_service(
    db: Annotated[Session, Depends(get_db_session)],
    queue_client: Annotated[QueueClient, Depends(get_queue_client)],
    runtime_client: Annotated[RuntimeServiceClient, Depends(get_runtime_client)],
    storage_adapter: Annotated[StorageAdapter, Depends(get_storage_adapter)],
) -> ReviewService:
    return ReviewService(
        db=db,
        review_repository=ReviewRepository(db),
        session_repository=SessionRepository(db),
        audit_repository=AuditRepository(db),
        queue_client=queue_client,
        runtime_client=runtime_client,
        storage_adapter=storage_adapter,
        settings=get_settings(),
    )


def get_memory_service(
    db: Annotated[Session, Depends(get_db_session)],
    queue_client: Annotated[QueueClient, Depends(get_queue_client)],
) -> MemoryService:
    return MemoryService(
        db=db,
        memory_repository=MemoryRepository(db),
        session_repository=SessionRepository(db),
        project_repository=ProjectRepository(db),
        review_repository=ReviewRepository(db),
        configuration_repository=ConfigurationRepository(db),
        audit_repository=AuditRepository(db),
        queue_client=queue_client,
        settings=get_settings(),
    )


def get_replay_service(
    db: Annotated[Session, Depends(get_db_session)],
    storage_adapter: Annotated[StorageAdapter, Depends(get_storage_adapter)],
) -> ReplayService:
    return ReplayService(
        db=db,
        replay_repository=ReplayRepository(db),
        session_repository=SessionRepository(db),
        review_repository=ReviewRepository(db),
        audit_repository=AuditRepository(db),
        storage_adapter=storage_adapter,
        settings=get_settings(),
    )


def get_analytics_service(
    db: Annotated[Session, Depends(get_db_session)],
) -> AnalyticsService:
    return AnalyticsService(
        repository=AnalyticsRepository(db),
        project_repository=ProjectRepository(db),
        settings=get_settings(),
    )


AuthServiceDep = Annotated[AuthService, Depends(get_auth_service)]
ProjectServiceDep = Annotated[ProjectService, Depends(get_project_service)]
SessionServiceDep = Annotated[SessionService, Depends(get_session_service)]
WorkspaceServiceDep = Annotated[WorkspaceService, Depends(get_workspace_service)]
UserServiceDep = Annotated[UserService, Depends(get_user_service)]
ApiTokenServiceDep = Annotated[ApiTokenService, Depends(get_api_token_service)]
TargetServiceDep = Annotated[TargetService, Depends(get_target_service)]
ProviderProfileServiceDep = Annotated[
    ProviderProfileService,
    Depends(get_provider_profile_service),
]
PolicyServiceDep = Annotated[PolicyService, Depends(get_policy_service)]
AuditEventServiceDep = Annotated[AuditEventService, Depends(get_audit_event_service)]
AgentServiceDep = Annotated[AgentService, Depends(get_agent_service)]
ApprovalServiceDep = Annotated[ApprovalService, Depends(get_approval_service)]
ToolDefinitionServiceDep = Annotated[
    ToolDefinitionService,
    Depends(get_tool_definition_service),
]
ReviewServiceDep = Annotated[ReviewService, Depends(get_review_service)]
MemoryServiceDep = Annotated[MemoryService, Depends(get_memory_service)]
ReplayServiceDep = Annotated[ReplayService, Depends(get_replay_service)]
AnalyticsServiceDep = Annotated[AnalyticsService, Depends(get_analytics_service)]
