from pathlib import PurePosixPath

from pydantic import BaseModel, Field, ValidationError

from app.core.config import Settings
from app.domain.exceptions import DomainError
from app.domain.pagination import Page
from app.repositories.sessions import SessionRepository
from app.schemas.agents import ToolDefinitionResponse

BUILT_IN_TOOL_DEFINITIONS: dict[str, dict[str, object]] = {
    "terminal.execute": {
        "version": "1.0.0",
        "description": "Execute an approved command in the session runtime.",
        "category": "runtime",
        "risk_level": "medium",
        "runtime_type": "container",
        "input_schema": {},
    },
    "file.list": {
        "version": "1.0.0",
        "description": "List files inside the session workspace.",
        "category": "runtime",
        "risk_level": "low",
        "runtime_type": "container",
        "input_schema": {},
    },
    "file.read": {
        "version": "1.0.0",
        "description": "Read a file inside the session workspace.",
        "category": "runtime",
        "risk_level": "low",
        "runtime_type": "container",
        "input_schema": {},
    },
    "file.write": {
        "version": "1.0.0",
        "description": "Write a file inside the session workspace.",
        "category": "runtime",
        "risk_level": "medium",
        "runtime_type": "container",
        "input_schema": {},
    },
    "step.complete": {
        "version": "1.0.0",
        "description": "Mark the current step complete with a short summary.",
        "category": "session",
        "risk_level": "low",
        "runtime_type": "builtin",
        "input_schema": {},
    },
    "memory.search": {
        "version": "1.0.0",
        "description": "Search approved scoped memory for relevant context.",
        "category": "memory",
        "risk_level": "low",
        "runtime_type": "builtin",
        "input_schema": {},
    },
    "memory.propose": {
        "version": "1.0.0",
        "description": "Create candidate memory for human review.",
        "category": "memory",
        "risk_level": "low",
        "runtime_type": "builtin",
        "input_schema": {},
    },
}


class TerminalExecuteArgs(BaseModel):
    command: list[str] = Field(min_length=1)
    cwd: str = "/workspace"
    timeout_seconds: int | None = Field(default=None, ge=1, le=3600)
    max_output_bytes: int | None = Field(default=None, ge=1, le=10_485_760)


class FilePathArgs(BaseModel):
    path: str = "/workspace"


class FileWriteArgs(BaseModel):
    path: str
    content: str


class StepCompleteArgs(BaseModel):
    summary: str = Field(min_length=1, max_length=2000)


class MemorySearchArgs(BaseModel):
    query: str = Field(min_length=1, max_length=4000)
    limit: int | None = Field(default=None, ge=1, le=20)


class MemoryProposeArgs(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    summary: str = Field(min_length=1, max_length=2000)
    content: str = Field(min_length=1)


class ToolRegistryService:
    def __init__(self, *, repository: SessionRepository, settings: Settings) -> None:
        self.repository = repository
        self.settings = settings

    def list_tools(self, *, workspace_id) -> Page[ToolDefinitionResponse]:
        tools = self.repository.list_tool_definitions(workspace_id=workspace_id)
        if tools:
            return Page(items=[tool_definition_response(tool) for tool in tools])
        return Page(
            items=[
                _built_in_tool_response(name, definition)
                for name, definition in BUILT_IN_TOOL_DEFINITIONS.items()
            ]
        )

    def validate_arguments(
        self,
        *,
        workspace_id,
        tool_name: str,
        arguments: dict[str, object],
    ) -> dict[str, object]:
        tool = self.repository.get_tool_definition(workspace_id=workspace_id, name=tool_name)
        if tool is None and tool_name not in BUILT_IN_TOOL_DEFINITIONS:
            raise DomainError(f"Unknown tool: {tool_name}.")
        if tool is not None and not tool.enabled:
            raise DomainError(f"Tool is disabled: {tool_name}.")

        try:
            if tool_name == "terminal.execute":
                value = TerminalExecuteArgs.model_validate(arguments)
                _validate_command(value.command, self.settings.runtime_allowed_commands)
                return {
                    "command": value.command,
                    "cwd": _workspace_path(value.cwd),
                    "timeout_seconds": (
                        value.timeout_seconds or self.settings.runtime_default_timeout_seconds
                    ),
                    "max_output_bytes": (
                        value.max_output_bytes or self.settings.runtime_max_output_bytes
                    ),
                }
            if tool_name in {"file.list", "file.read"}:
                value = FilePathArgs.model_validate(arguments)
                return {"path": _workspace_path(value.path)}
            if tool_name == "file.write":
                value = FileWriteArgs.model_validate(arguments)
                return {"path": _workspace_path(value.path), "content": value.content}
            if tool_name == "step.complete":
                value = StepCompleteArgs.model_validate(arguments)
                return {"summary": value.summary}
            if tool_name == "memory.search":
                value = MemorySearchArgs.model_validate(arguments)
                return {"query": value.query, "limit": value.limit}
            if tool_name == "memory.propose":
                value = MemoryProposeArgs.model_validate(arguments)
                return {
                    "title": value.title,
                    "summary": value.summary,
                    "content": value.content,
                }
        except ValidationError as exc:
            raise DomainError(f"Tool arguments are invalid for {tool_name}.") from exc

        raise DomainError(f"Tool has no validator: {tool_name}.")


def tool_definition_response(tool) -> ToolDefinitionResponse:
    return ToolDefinitionResponse(
        id=str(tool.id),
        name=tool.name,
        version=tool.version,
        description=tool.description,
        category=tool.category,
        risk_level=tool.risk_level,
        runtime_type=tool.runtime_type,
        input_schema=tool.input_schema,
        output_schema=tool.output_schema,
        enabled=tool.enabled,
    )


def _built_in_tool_response(name: str, definition: dict[str, object]) -> ToolDefinitionResponse:
    return ToolDefinitionResponse(
        id=f"builtin:{name}",
        name=name,
        version=str(definition["version"]),
        description=str(definition["description"]),
        category=str(definition["category"]),
        risk_level=str(definition["risk_level"]),
        runtime_type=str(definition["runtime_type"]),
        input_schema=_dict(definition.get("input_schema")),
        output_schema={},
        enabled=True,
    )


def _workspace_path(value: str) -> str:
    path = PurePosixPath(value)
    parts = path.parts
    if not path.is_absolute() or len(parts) < 2 or parts[1] != "workspace":
        raise DomainError("Runtime paths must be inside /workspace.")
    if ".." in parts:
        raise DomainError("Runtime paths cannot contain parent directory traversal.")
    return str(path)


def _validate_command(command: list[str], allowed_commands: set[str]) -> None:
    executable = command[0]
    if "/" in executable or "\\" in executable:
        raise DomainError("Command executable must be a simple allowed command name.")
    if executable not in allowed_commands:
        raise DomainError(f"Command is not allowed by the conservative runtime gate: {executable}.")


def _dict(value: object) -> dict[str, object]:
    return value if isinstance(value, dict) else {}
