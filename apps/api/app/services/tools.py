import uuid

from app.auth.dependencies import AuthContext
from app.core.config import Settings
from app.domain.pagination import Page
from app.repositories.sessions import SessionRepository
from app.schemas.agents import ToolDefinitionResponse
from app.services.tool_registry import ToolRegistryService


class ToolDefinitionService:
    def __init__(self, *, repository: SessionRepository, settings: Settings) -> None:
        self.registry = ToolRegistryService(repository=repository, settings=settings)

    def list_tools(self, *, auth: AuthContext) -> Page[ToolDefinitionResponse]:
        return self.registry.list_tools(workspace_id=uuid.UUID(auth.workspace_id))
