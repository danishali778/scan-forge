from typing import Annotated

from fastapi import APIRouter, Depends, Query, status

from app.api.dependencies import AgentServiceDep, SessionServiceDep
from app.auth.dependencies import AuthContextDep, CsrfDep, require_permission
from app.domain.pagination import Page
from app.schemas.agents import AgentMessageResponse, AgentRunRequest, AgentRunResponse
from app.schemas.sessions import (
    JobResponse,
    RuntimeFileContentResponse,
    RuntimeFileListResponse,
    RuntimeFileWriteRequest,
    RuntimeFileWriteResponse,
    RuntimeInstanceResponse,
    SessionCreateRequest,
    SessionDetail,
    SessionEventResponse,
    SessionSummary,
    TaskResponse,
    TerminalCommandRequest,
    ToolCallResponse,
)

router = APIRouter()

SessionsReadDep = Annotated[None, Depends(require_permission("sessions.read"))]
SessionsCreateDep = Annotated[None, Depends(require_permission("sessions.create"))]
SessionsStartDep = Annotated[None, Depends(require_permission("sessions.start"))]
SessionsPauseDep = Annotated[None, Depends(require_permission("sessions.pause"))]
SessionsResumeDep = Annotated[None, Depends(require_permission("sessions.resume"))]
SessionsStopDep = Annotated[None, Depends(require_permission("sessions.stop"))]
SessionsArchiveDep = Annotated[None, Depends(require_permission("sessions.archive"))]
TasksReadDep = Annotated[None, Depends(require_permission("tasks.read"))]
JobsReadDep = Annotated[None, Depends(require_permission("jobs.read"))]
RuntimeReadDep = Annotated[None, Depends(require_permission("runtime_instances.read"))]
RuntimeManageDep = Annotated[None, Depends(require_permission("runtime_instances.manage"))]
ToolCallsReadDep = Annotated[None, Depends(require_permission("tool_calls.read"))]
ToolCallsExecuteDep = Annotated[None, Depends(require_permission("tool_calls.execute"))]
FilesReadDep = Annotated[None, Depends(require_permission("files.read"))]
FilesWriteDep = Annotated[None, Depends(require_permission("files.write"))]
AgentsReadDep = Annotated[None, Depends(require_permission("agents.read"))]
AgentsExecuteDep = Annotated[None, Depends(require_permission("agents.execute"))]


@router.get("")
def list_sessions(
    service: SessionServiceDep,
    auth: AuthContextDep,
    _permission: SessionsReadDep,
) -> Page[SessionSummary]:
    return service.list_sessions(auth=auth)


@router.post("", status_code=status.HTTP_201_CREATED, response_model=SessionDetail)
def create_session(
    request: SessionCreateRequest,
    service: SessionServiceDep,
    auth: AuthContextDep,
    _permission: SessionsCreateDep,
    _: CsrfDep,
) -> SessionDetail:
    return service.create_session(request, auth=auth)


@router.get("/{session_id}", response_model=SessionDetail)
def get_session(
    session_id: str,
    service: SessionServiceDep,
    auth: AuthContextDep,
    _permission: SessionsReadDep,
) -> SessionDetail:
    return service.get_session(session_id=session_id, auth=auth)


@router.get("/{session_id}/events", response_model=Page[SessionEventResponse])
def list_session_events(
    session_id: str,
    service: SessionServiceDep,
    auth: AuthContextDep,
    _permission: SessionsReadDep,
    last_event_id: int | None = Query(default=None),
) -> Page[SessionEventResponse]:
    return service.list_events(session_id=session_id, auth=auth, after_id=last_event_id)


@router.get("/{session_id}/agent-messages", response_model=Page[AgentMessageResponse])
def list_agent_messages(
    session_id: str,
    service: AgentServiceDep,
    auth: AuthContextDep,
    _permission: AgentsReadDep,
) -> Page[AgentMessageResponse]:
    return service.list_messages(session_id=session_id, auth=auth)


@router.post("/{session_id}/agent/run", response_model=AgentRunResponse)
def run_agent(
    session_id: str,
    request: AgentRunRequest,
    service: AgentServiceDep,
    auth: AuthContextDep,
    _permission: AgentsExecuteDep,
    _: CsrfDep,
) -> AgentRunResponse:
    return service.run_session(request, session_id=session_id, auth=auth)


@router.post("/{session_id}/start", response_model=SessionDetail)
def start_session(
    session_id: str,
    service: SessionServiceDep,
    auth: AuthContextDep,
    _permission: SessionsStartDep,
    _: CsrfDep,
) -> SessionDetail:
    return service.start_session(session_id=session_id, auth=auth)


@router.post("/{session_id}/pause", response_model=SessionDetail)
def pause_session(
    session_id: str,
    service: SessionServiceDep,
    auth: AuthContextDep,
    _permission: SessionsPauseDep,
    _: CsrfDep,
) -> SessionDetail:
    return service.pause_session(session_id=session_id, auth=auth)


@router.post("/{session_id}/resume", response_model=SessionDetail)
def resume_session(
    session_id: str,
    service: SessionServiceDep,
    auth: AuthContextDep,
    _permission: SessionsResumeDep,
    _: CsrfDep,
) -> SessionDetail:
    return service.resume_session(session_id=session_id, auth=auth)


@router.post("/{session_id}/stop", response_model=SessionDetail)
def stop_session(
    session_id: str,
    service: SessionServiceDep,
    auth: AuthContextDep,
    _permission: SessionsStopDep,
    _: CsrfDep,
) -> SessionDetail:
    return service.stop_session(session_id=session_id, auth=auth)


@router.post("/{session_id}/archive", response_model=SessionDetail)
def archive_session(
    session_id: str,
    service: SessionServiceDep,
    auth: AuthContextDep,
    _permission: SessionsArchiveDep,
    _: CsrfDep,
) -> SessionDetail:
    return service.archive_session(session_id=session_id, auth=auth)


@router.get("/{session_id}/tasks", response_model=Page[TaskResponse])
def list_session_tasks(
    session_id: str,
    service: SessionServiceDep,
    auth: AuthContextDep,
    _permission: TasksReadDep,
) -> Page[TaskResponse]:
    return service.list_tasks(session_id=session_id, auth=auth)


@router.get("/{session_id}/jobs", response_model=Page[JobResponse])
def list_session_jobs(
    session_id: str,
    service: SessionServiceDep,
    auth: AuthContextDep,
    _permission: JobsReadDep,
) -> Page[JobResponse]:
    return service.list_jobs(session_id=session_id, auth=auth)


@router.get("/{session_id}/runtime", response_model=RuntimeInstanceResponse | None)
def get_session_runtime(
    session_id: str,
    service: SessionServiceDep,
    auth: AuthContextDep,
    _permission: RuntimeReadDep,
) -> RuntimeInstanceResponse | None:
    return service.get_runtime(session_id=session_id, auth=auth)


@router.post("/{session_id}/runtime/start", response_model=RuntimeInstanceResponse)
def start_session_runtime(
    session_id: str,
    service: SessionServiceDep,
    auth: AuthContextDep,
    _permission: RuntimeManageDep,
    _: CsrfDep,
) -> RuntimeInstanceResponse:
    return service.start_runtime(session_id=session_id, auth=auth)


@router.post("/{session_id}/runtime/stop", response_model=RuntimeInstanceResponse)
def stop_session_runtime(
    session_id: str,
    service: SessionServiceDep,
    auth: AuthContextDep,
    _permission: RuntimeManageDep,
    _: CsrfDep,
) -> RuntimeInstanceResponse:
    return service.stop_runtime(session_id=session_id, auth=auth)


@router.get("/{session_id}/tool-calls", response_model=Page[ToolCallResponse])
def list_session_tool_calls(
    session_id: str,
    service: SessionServiceDep,
    auth: AuthContextDep,
    _permission: ToolCallsReadDep,
) -> Page[ToolCallResponse]:
    return service.list_tool_calls(session_id=session_id, auth=auth)


@router.post(
    "/{session_id}/tool-calls/terminal",
    status_code=status.HTTP_201_CREATED,
    response_model=ToolCallResponse,
)
def create_terminal_tool_call(
    session_id: str,
    request: TerminalCommandRequest,
    service: SessionServiceDep,
    auth: AuthContextDep,
    _permission: ToolCallsExecuteDep,
    _: CsrfDep,
) -> ToolCallResponse:
    return service.create_terminal_tool_call(request, session_id=session_id, auth=auth)


@router.get("/{session_id}/files", response_model=RuntimeFileListResponse)
def list_runtime_files(
    session_id: str,
    service: SessionServiceDep,
    auth: AuthContextDep,
    _permission: FilesReadDep,
    path: str = Query(default="/workspace"),
) -> RuntimeFileListResponse:
    return service.list_runtime_files(session_id=session_id, path=path, auth=auth)


@router.get("/{session_id}/files/content", response_model=RuntimeFileContentResponse)
def read_runtime_file(
    session_id: str,
    service: SessionServiceDep,
    auth: AuthContextDep,
    _permission: FilesReadDep,
    path: str = Query(...),
) -> RuntimeFileContentResponse:
    return service.read_runtime_file(session_id=session_id, path=path, auth=auth)


@router.put("/{session_id}/files/content", response_model=RuntimeFileWriteResponse)
def write_runtime_file(
    session_id: str,
    request: RuntimeFileWriteRequest,
    service: SessionServiceDep,
    auth: AuthContextDep,
    _permission: FilesWriteDep,
    _: CsrfDep,
) -> RuntimeFileWriteResponse:
    return service.write_runtime_file(request, session_id=session_id, auth=auth)
