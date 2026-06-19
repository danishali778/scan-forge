from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status

from app.services.docker_runtime import (
    DockerRuntimeManager,
    RuntimeServiceError,
    get_runtime_manager,
)

router = APIRouter()

RuntimeManagerDep = Annotated[DockerRuntimeManager, Depends(get_runtime_manager)]


@router.get("/commands/{command_id}")
def command_status(command_id: str, manager: RuntimeManagerDep) -> dict[str, object]:
    return _handle_runtime_error(lambda: manager.command_status(command_id=command_id))


@router.post("/commands/{command_id}/cancel")
def cancel_command(command_id: str, manager: RuntimeManagerDep) -> dict[str, object]:
    return _handle_runtime_error(lambda: manager.cancel_command(command_id=command_id))


def _handle_runtime_error(operation):
    try:
        return operation()
    except RuntimeServiceError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
