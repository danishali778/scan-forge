import uuid

from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.integrations.runtime import RuntimeServiceClient
from app.integrations.storage import StorageAdapter, SupabaseStorageAdapter
from app.repositories.review import ReviewRepository
from app.repositories.sessions import SessionRepository
from app.services.review.artifacts import ArtifactWriter


class ToolExecutionRunner:
    def __init__(
        self,
        *,
        db: Session,
        worker_id: str,
        runtime_client: RuntimeServiceClient | None = None,
        storage_adapter: StorageAdapter | None = None,
    ) -> None:
        self.db = db
        self.repository = SessionRepository(db)
        self.review_repository = ReviewRepository(db)
        self.worker_id = worker_id
        self.runtime = runtime_client or RuntimeServiceClient()
        self.storage = storage_adapter

    def run(self, *, job_id: str) -> bool:
        job_uuid = uuid.UUID(job_id)
        job = self.repository.get_job_by_id(job_id=job_uuid)
        if job is None:
            return False
        if job.status == "succeeded":
            return True

        claimed = self.repository.claim_job(job, worker_id=self.worker_id)
        if claimed is None:
            return False
        tool_call_id = claimed.payload.get("tool_call_id")
        if not isinstance(tool_call_id, str):
            self.repository.fail_job(claimed, error="Tool execution job is missing tool_call_id.")
            self.db.commit()
            return False

        self._emit_job_event(claimed, "running")
        self.db.commit()

        try:
            self._execute(claimed.id, tool_call_id=uuid.UUID(tool_call_id))
            return True
        except Exception as exc:
            self.db.rollback()
            self._mark_failed(job_id=claimed.id, error=str(exc))
            raise

    def _execute(self, job_id: uuid.UUID, *, tool_call_id: uuid.UUID) -> None:
        job = self.repository.get_job_by_id(job_id=job_id)
        tool_call = self.repository.get_tool_call_by_id(tool_call_id=tool_call_id)
        if job is None or tool_call is None:
            raise RuntimeError("Tool execution job or tool call was not found.")
        if job.session_id is None:
            raise RuntimeError("Tool execution job is missing a session.")
        if tool_call.status in {"succeeded", "failed", "timed_out", "cancelled", "denied"}:
            self.repository.succeed_job(
                job,
                result={"tool_call_id": str(tool_call.id), "tool_call_status": tool_call.status},
            )
            self._emit_job_event(job, "succeeded")
            self.db.commit()
            return

        session = self.repository.get_session(
            workspace_id=job.workspace_id,
            session_id=job.session_id,
        )
        if session is None:
            raise RuntimeError("Tool execution session was not found.")
        if session.status != "running":
            raise RuntimeError(f"Cannot execute tool call for session status {session.status}.")

        runtime = self._ensure_runtime(session)
        self.repository.mark_tool_call_running(tool_call, runtime_instance_id=runtime.id)
        self.repository.create_event(
            workspace_id=session.workspace_id,
            session_id=session.id,
            event_type="tool_call.started",
            payload={"tool_call_id": str(tool_call.id), "runtime_id": str(runtime.id)},
            actor_type="system",
            actor_id=self.worker_id,
        )
        self.db.commit()

        arguments = tool_call.arguments
        command = arguments.get("command")
        cwd = arguments.get("cwd")
        timeout_seconds = arguments.get("timeout_seconds")
        max_output_bytes = arguments.get("max_output_bytes")
        if not isinstance(command, list) or not all(isinstance(item, str) for item in command):
            raise RuntimeError("Tool call command arguments are invalid.")
        if not isinstance(cwd, str):
            raise RuntimeError("Tool call cwd argument is invalid.")
        if not isinstance(timeout_seconds, int) or not isinstance(max_output_bytes, int):
            raise RuntimeError("Tool call runtime limits are invalid.")

        response = self.runtime.execute_command(
            runtime_id=str(runtime.id),
            tool_call_id=str(tool_call.id),
            command=command,
            cwd=cwd,
            timeout_seconds=timeout_seconds,
            max_output_bytes=max_output_bytes,
            policy_decision_id=str(tool_call.id),
        )
        status = str(response.get("status", "failed"))
        output = str(response.get("output", ""))
        error = response.get("error_message")
        command_id = response.get("command_id")
        duration_ms = response.get("duration_ms")
        exit_code = response.get("exit_code")
        output_truncated = bool(response.get("output_truncated", False))
        if output:
            self.repository.create_event(
                workspace_id=session.workspace_id,
                session_id=session.id,
                event_type="tool_call.output",
                payload={
                    "tool_call_id": str(tool_call.id),
                    "stream": "combined",
                    "content": output,
                    "truncated": output_truncated,
                },
                actor_type="system",
                actor_id=self.worker_id,
            )

        final_status = status if status in {"succeeded", "timed_out", "cancelled"} else "failed"
        self.repository.finish_tool_call(
            tool_call,
            status=final_status,
            result={"exit_code": exit_code, "output_truncated": output_truncated},
            raw_output=output,
            error_message=str(error) if error else None,
            runtime_command_id=str(command_id) if command_id else None,
            duration_ms=duration_ms if isinstance(duration_ms, int) else None,
        )
        self.repository.create_event(
            workspace_id=session.workspace_id,
            session_id=session.id,
            event_type="tool_call.finished" if final_status == "succeeded" else "tool_call.failed",
            payload={
                "tool_call_id": str(tool_call.id),
                "status": final_status,
                "exit_code": exit_code,
            },
            actor_type="system",
            actor_id=self.worker_id,
        )
        if final_status == "succeeded" and output:
            self._record_terminal_evidence(session=session, tool_call=tool_call, output=output)
        self.repository.succeed_job(
            job,
            result={"tool_call_id": str(tool_call.id), "tool_call_status": final_status},
        )
        self._emit_job_event(job, "succeeded")
        self.db.commit()

    def _ensure_runtime(self, session):
        runtime = self.repository.get_running_runtime_instance(
            workspace_id=session.workspace_id,
            session_id=session.id,
        )
        if runtime is not None:
            return runtime

        runtime_id = uuid.uuid4()
        settings = get_settings()
        resource_limits: dict[str, object] = {
            "timeout_seconds": settings.runtime_default_timeout_seconds,
            "max_output_bytes": settings.runtime_max_output_bytes,
        }
        runtime = self.repository.create_runtime_instance(
            runtime_id=runtime_id,
            workspace_id=session.workspace_id,
            session_id=session.id,
            image="pentagi-runtime-python:local",
            status="starting",
            resource_limits=resource_limits,
        )
        self.db.commit()

        try:
            response = self.runtime.start_runtime(
                runtime_id=str(runtime.id),
                workspace_id=str(session.workspace_id),
                session_id=str(session.id),
                resource_limits=resource_limits,
                network_policy={"mode": "none"},
            )
        except Exception:
            self.repository.update_runtime_instance(runtime, status="failed")
            self.db.commit()
            raise

        self.repository.update_runtime_instance(
            runtime,
            status=str(response.get("status", "running")),
            external_id=str(response["external_id"]) if response.get("external_id") else None,
            image=str(response.get("image", runtime.image)),
            workspace_path=str(response.get("workspace_path", runtime.workspace_path)),
        )
        self.repository.create_event(
            workspace_id=session.workspace_id,
            session_id=session.id,
            event_type="runtime.started",
            payload={"runtime_id": str(runtime.id), "status": runtime.status},
            actor_type="system",
            actor_id=self.worker_id,
        )
        self.db.commit()
        return runtime

    def _record_terminal_evidence(self, *, session, tool_call, output: str) -> None:
        existing = self.review_repository.get_evidence_by_tool_call(
            workspace_id=session.workspace_id,
            tool_call_id=tool_call.id,
        )
        if existing is not None:
            return

        settings = get_settings()
        raw = output.encode("utf-8")
        content: str | None = output
        asset_id = None
        if len(raw) > settings.evidence_inline_max_bytes:
            storage = self.storage or SupabaseStorageAdapter(settings=settings)
            asset = ArtifactWriter(
                repository=self.review_repository,
                storage=storage,
                settings=settings,
            ).store_bytes(
                workspace_id=session.workspace_id,
                prefix=f"evidence/{session.id}",
                filename=f"tool-call-{tool_call.id}.txt",
                content=raw,
                mime_type="text/plain",
                metadata={"source": "terminal_tool_call", "tool_call_id": str(tool_call.id)},
                created_by=None,
            )
            asset_id = asset.id
            content = None

        evidence = self.review_repository.create_evidence(
            workspace_id=session.workspace_id,
            project_id=session.project_id,
            session_id=session.id,
            task_id=tool_call.task_id,
            step_id=tool_call.step_id,
            tool_call_id=tool_call.id,
            evidence_type="terminal",
            title="Terminal command output",
            summary=_short_summary(output),
            content=content,
            asset_id=asset_id,
            metadata={"tool_name": tool_call.tool_name, "status": tool_call.status},
            created_by_agent=True,
        )
        self.repository.create_event(
            workspace_id=session.workspace_id,
            session_id=session.id,
            event_type="evidence.created",
            payload={
                "evidence_id": str(evidence.id),
                "tool_call_id": str(tool_call.id),
                "type": evidence.type,
            },
            actor_type="system",
            actor_id=self.worker_id,
        )

    def _mark_failed(self, *, job_id: uuid.UUID, error: str) -> None:
        job = self.repository.get_job_by_id(job_id=job_id)
        if job is None:
            return
        self.repository.fail_job(job, error=error)
        tool_call_id = job.payload.get("tool_call_id")
        if isinstance(tool_call_id, str):
            tool_call = self.repository.get_tool_call_by_id(tool_call_id=uuid.UUID(tool_call_id))
            if tool_call is not None and tool_call.status not in {
                "succeeded",
                "failed",
                "timed_out",
                "cancelled",
                "denied",
            }:
                self.repository.finish_tool_call(
                    tool_call,
                    status="failed",
                    error_message=error,
                )
                if job.session_id is not None:
                    self.repository.create_event(
                        workspace_id=job.workspace_id,
                        session_id=job.session_id,
                        event_type="tool_call.failed",
                        payload={"tool_call_id": str(tool_call.id), "status": "failed"},
                        actor_type="system",
                        actor_id=self.worker_id,
                    )
        self._emit_job_event(job, "failed")
        self.db.commit()

    def _emit_job_event(self, job, status: str) -> None:
        if job.session_id is None:
            return
        self.repository.create_event(
            workspace_id=job.workspace_id,
            session_id=job.session_id,
            event_type="job.updated",
            payload={"job_id": str(job.id), "status": status, "type": job.type},
            actor_type="system",
            actor_id=self.worker_id,
        )


def _short_summary(value: str) -> str:
    first_line = value.strip().splitlines()[0] if value.strip() else "Terminal output captured."
    return first_line[:240]
