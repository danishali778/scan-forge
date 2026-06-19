from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.services.docker_runtime import (
    DockerRuntimeManager,
    RuntimeServiceError,
    get_runtime_manager,
)

router = APIRouter()


class RuntimeStartRequest(BaseModel):
    runtime_id: str | None = None
    workspace_id: str
    session_id: str
    runtime_profile: str = "default"
    network_policy: dict[str, object] = Field(default_factory=dict)
    resource_limits: dict[str, object] = Field(default_factory=dict)


class RuntimeStopRequest(BaseModel):
    reason: str = "requested"
    collect_artifacts: bool = False


class CommandExecuteRequest(BaseModel):
    tool_call_id: str
    command: list[str] = Field(min_length=1)
    cwd: str = "/workspace"
    env: dict[str, str] = Field(default_factory=dict)
    timeout_seconds: int = Field(default=300, ge=1, le=3600)
    max_output_bytes: int = Field(default=1_048_576, ge=1, le=10_485_760)
    policy_decision_id: str


class FileWriteRequest(BaseModel):
    path: str
    content: str


RuntimeManagerDep = Annotated[DockerRuntimeManager, Depends(get_runtime_manager)]


@router.post("", status_code=status.HTTP_201_CREATED)
def start_runtime(
    request: RuntimeStartRequest,
    manager: RuntimeManagerDep,
) -> dict[str, object]:
    return _handle_runtime_error(
        lambda: manager.start_runtime(
            runtime_id=request.runtime_id,
            workspace_id=request.workspace_id,
            session_id=request.session_id,
            runtime_profile=request.runtime_profile,
            network_policy=request.network_policy,
            resource_limits=request.resource_limits,
        )
    )


@router.get("/{runtime_id}")
def get_runtime(runtime_id: str, manager: RuntimeManagerDep) -> dict[str, object]:
    return _handle_runtime_error(lambda: manager.get_runtime(runtime_id=runtime_id))


@router.post("/{runtime_id}/stop")
def stop_runtime(
    runtime_id: str,
    request: RuntimeStopRequest,
    manager: RuntimeManagerDep,
) -> dict[str, object]:
    _ = request.collect_artifacts
    return _handle_runtime_error(
        lambda: manager.stop_runtime(runtime_id=runtime_id, reason=request.reason)
    )


@router.post("/{runtime_id}/commands", status_code=status.HTTP_201_CREATED)
def execute_command(
    runtime_id: str,
    request: CommandExecuteRequest,
    manager: RuntimeManagerDep,
) -> dict[str, object]:
    return _handle_runtime_error(
        lambda: manager.execute_command(
            runtime_id=runtime_id,
            tool_call_id=request.tool_call_id,
            command=request.command,
            cwd=request.cwd,
            env=request.env,
            timeout_seconds=request.timeout_seconds,
            max_output_bytes=request.max_output_bytes,
            policy_decision_id=request.policy_decision_id,
        )
    )


@router.get("/{runtime_id}/files")
def list_files(
    runtime_id: str,
    manager: RuntimeManagerDep,
    path: str = Query(default="/workspace"),
) -> dict[str, object]:
    return _handle_runtime_error(lambda: manager.list_files(runtime_id=runtime_id, path=path))


@router.get("/{runtime_id}/files/content")
def read_file(
    runtime_id: str,
    manager: RuntimeManagerDep,
    path: str = Query(...),
) -> dict[str, object]:
    return _handle_runtime_error(lambda: manager.read_file(runtime_id=runtime_id, path=path))


@router.put("/{runtime_id}/files/content")
def write_file(
    runtime_id: str,
    request: FileWriteRequest,
    manager: RuntimeManagerDep,
) -> dict[str, object]:
    return _handle_runtime_error(
        lambda: manager.write_file(
            runtime_id=runtime_id,
            path=request.path,
            content=request.content,
        )
    )


def _handle_runtime_error(operation):
    try:
        return operation()
    except RuntimeServiceError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
