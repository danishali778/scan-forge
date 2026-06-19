from typing import Annotated

from fastapi import APIRouter, Depends

from app.api.dependencies import ToolDefinitionServiceDep
from app.auth.dependencies import AuthContextDep, require_permission
from app.domain.pagination import Page
from app.schemas.agents import ToolDefinitionResponse

router = APIRouter()

ToolsReadDep = Annotated[None, Depends(require_permission("tools.read"))]


@router.get("", response_model=Page[ToolDefinitionResponse])
def list_tools(
    service: ToolDefinitionServiceDep,
    auth: AuthContextDep,
    _permission: ToolsReadDep,
) -> Page[ToolDefinitionResponse]:
    return service.list_tools(auth=auth)
