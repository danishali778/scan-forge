import uuid

from sqlalchemy.orm import Session

from app.agents.roles.executor import ExecutorAgent
from app.core.config import get_settings
from app.domain.exceptions import DomainError
from app.integrations.queue import CeleryQueueClient, QueueClient
from app.repositories.control_plane import ConfigurationRepository
from app.repositories.memory import MemoryRepository
from app.repositories.sessions import SessionRepository
from app.services.agent_policy import AgentPolicyService, PolicyDecisionResult
from app.services.agents.providers import load_session_provider
from app.services.memory.context import scoped_memory_context
from app.services.memory.scanner import scan_for_secrets
from app.services.tool_registry import ToolRegistryService


class AgentRunSessionRunner:
    def __init__(
        self,
        *,
        db: Session,
        worker_id: str,
        queue_client: QueueClient | None = None,
    ) -> None:
        self.db = db
        self.repository = SessionRepository(db)
        self.configuration = ConfigurationRepository(db)
        self.memory = MemoryRepository(db)
        self.worker_id = worker_id
        self.queue = queue_client or CeleryQueueClient()
        self.settings = get_settings()
        self.registry = ToolRegistryService(repository=self.repository, settings=self.settings)
        self.policy = AgentPolicyService()

    def run(self, *, job_id: str) -> bool:
        job = self.repository.get_job_by_id(job_id=uuid.UUID(job_id))
        if job is None:
            return False
        if job.status == "succeeded":
            return True

        claimed = self.repository.claim_job(job, worker_id=self.worker_id)
        if claimed is None:
            return False
        if claimed.session_id is None:
            self.repository.fail_job(claimed, error="Agent run job is missing a session.")
            self.db.commit()
            return False

        self._emit_job_event(claimed, "running")
        self.db.commit()

        try:
            self._run(claimed.id)
            return True
        except Exception as exc:
            self.db.rollback()
            self._mark_failed(job_id=claimed.id, error=str(exc))
            raise

    def _run(self, job_id: uuid.UUID) -> None:
        job = self.repository.get_job_by_id(job_id=job_id)
        if job is None or job.session_id is None:
            raise RuntimeError("Agent run job was not found.")
        session = self.repository.get_session(
            workspace_id=job.workspace_id,
            session_id=job.session_id,
        )
        if session is None:
            raise RuntimeError("Agent run session was not found.")
        if session.status != "running":
            raise RuntimeError(f"Cannot run agent for session status {session.status}.")

        loaded_provider = load_session_provider(
            repository=self.configuration,
            session=session,
            settings=self.settings,
        )
        if loaded_provider is None:
            raise DomainError("Agent run requires a provider profile.")

        policy = (
            self.configuration.get_policy(
                workspace_id=session.workspace_id,
                policy_id=session.policy_id,
            )
            if session.policy_id is not None
            else None
        )
        max_turns = (
            _payload_int(job.payload.get("max_turns"))
            or self.settings.agent_max_turns_per_job
        )

        turns_used = 0
        for _ in range(max_turns):
            session = self.repository.get_session(
                workspace_id=job.workspace_id,
                session_id=job.session_id,
            )
            if session is None or session.status != "running":
                break
            step = self.repository.get_next_ready_step(
                workspace_id=session.workspace_id,
                session_id=session.id,
            )
            if step is None:
                self._complete_session_if_ready(session)
                break

            turns_used += 1
            if step.status == "ready":
                self.repository.update_step_status(step, status="running")
                self.repository.create_event(
                    workspace_id=session.workspace_id,
                    session_id=session.id,
                    event_type="agent.step.started",
                    payload={"step_id": str(step.id), "task_id": str(step.task_id)},
                    actor_type="system",
                    actor_id=self.worker_id,
                )

            tool_calls = self.repository.list_tool_calls_for_step(
                workspace_id=session.workspace_id,
                step_id=step.id,
            )
            memory_context = scoped_memory_context(
                memory_repository=self.memory,
                configuration_repository=self.configuration,
                settings=self.settings,
                session=session,
                query=f"{session.objective}\n{step.title}\n{step.description or ''}",
            )
            executor_context: dict[str, object] = {
                "session": {
                    "id": str(session.id),
                    "objective": session.objective,
                    "mode": session.mode,
                },
                "step": {
                    "id": str(step.id),
                    "title": step.title,
                    "description": step.description,
                },
                "has_succeeded_tool_call": any(call.status == "succeeded" for call in tool_calls),
                "memory_context": memory_context,
            }
            output = ExecutorAgent(
                provider=loaded_provider.client,
                model=loaded_provider.model,
            ).run(executor_context)
            provider_response = _dict(executor_context.get("provider_response"))
            agent_message = self.repository.create_agent_message(
                workspace_id=session.workspace_id,
                session_id=session.id,
                task_id=step.task_id,
                step_id=step.id,
                agent_role="executor",
                message_type="assistant",
                content=str(provider_response.get("content", output.model_dump_json())),
                metadata={
                    "summary": output.summary,
                    "action": output.action,
                    "model": provider_response.get("model"),
                    "provider_type": provider_response.get("provider_type"),
                    "memory_result_count": len(memory_context),
                },
                token_input=_int_or_none(provider_response.get("token_input")),
                token_output=_int_or_none(provider_response.get("token_output")),
            )
            self.repository.create_event(
                workspace_id=session.workspace_id,
                session_id=session.id,
                event_type="agent.message",
                payload={"message_id": str(agent_message.id), "agent_role": "executor"},
                actor_type="system",
                actor_id=self.worker_id,
            )

            try:
                arguments = self.registry.validate_arguments(
                    workspace_id=session.workspace_id,
                    tool_name=output.action,
                    arguments=output.arguments,
                )
                decision = self.policy.evaluate(
                    tool_name=output.action,
                    arguments=arguments,
                    policy=policy,
                )
            except DomainError as exc:
                decision = PolicyDecisionResult(
                    decision="deny",
                    risk_level="medium",
                    reasons=[str(exc)],
                    matched_rules={"registry": "deny"},
                    constraints={},
                    input_summary={"tool_name": output.action},
                )
                arguments = output.arguments

            policy_decision = self.repository.create_policy_decision(
                workspace_id=session.workspace_id,
                session_id=session.id,
                task_id=step.task_id,
                step_id=step.id,
                action_type="tool_call",
                tool_name=output.action,
                decision=decision.decision,
                risk_level=decision.risk_level,
                reasons=decision.reasons,
                matched_rules=decision.matched_rules,
                constraints=decision.constraints,
                input_summary=decision.input_summary,
                actor_type="system",
                actor_id=self.worker_id,
            )
            self.repository.create_event(
                workspace_id=session.workspace_id,
                session_id=session.id,
                event_type="policy.decision",
                payload={
                    "policy_decision_id": str(policy_decision.id),
                    "tool_name": output.action,
                    "decision": decision.decision,
                },
                actor_type="system",
                actor_id=self.worker_id,
            )

            if decision.decision == "deny":
                tool_call = self.repository.create_tool_call(
                    workspace_id=session.workspace_id,
                    session_id=session.id,
                    task_id=step.task_id,
                    step_id=step.id,
                    agent_message_id=agent_message.id,
                    tool_name=output.action,
                    tool_version="1.0.0",
                    status="denied",
                    arguments=arguments,
                    policy_decision=decision.as_tool_call_policy(),
                    error_message="; ".join(decision.reasons),
                )
                self.repository.create_event(
                    workspace_id=session.workspace_id,
                    session_id=session.id,
                    event_type="tool_call.failed",
                    payload={"tool_call_id": str(tool_call.id), "status": "denied"},
                    actor_type="system",
                    actor_id=self.worker_id,
                )
                break

            if decision.decision == "require_approval":
                self._request_approval(
                    session=session,
                    step=step,
                    agent_message_id=agent_message.id,
                    tool_name=output.action,
                    arguments=arguments,
                    decision=decision,
                )
                break

            if output.action == "step.complete":
                self.repository.update_step_status(
                    step,
                    status="completed",
                    result=str(arguments.get("summary", output.summary)),
                )
                self.repository.create_event(
                    workspace_id=session.workspace_id,
                    session_id=session.id,
                    event_type="agent.step.completed",
                    payload={"step_id": str(step.id), "summary": arguments.get("summary")},
                    actor_type="system",
                    actor_id=self.worker_id,
                )
                self._complete_session_if_ready(session)
                break

            if output.action == "memory.search":
                self._run_memory_search(
                    session=session,
                    step=step,
                    agent_message_id=agent_message.id,
                    arguments=arguments,
                    decision=decision,
                )
                break

            if output.action == "memory.propose":
                self._propose_memory(
                    session=session,
                    step=step,
                    agent_message_id=agent_message.id,
                    arguments=arguments,
                    decision=decision,
                )
                break

            if output.action == "terminal.execute":
                self._queue_terminal_tool(
                    session=session,
                    step=step,
                    agent_message_id=agent_message.id,
                    arguments=arguments,
                    decision=decision,
                )
                break

            self.repository.create_tool_call(
                workspace_id=session.workspace_id,
                session_id=session.id,
                task_id=step.task_id,
                step_id=step.id,
                agent_message_id=agent_message.id,
                tool_name=output.action,
                tool_version="1.0.0",
                status="succeeded",
                arguments=arguments,
                policy_decision=decision.as_tool_call_policy(),
            )

        self.repository.succeed_job(job, result={"turns_used": turns_used})
        self._emit_job_event(job, "succeeded")
        self.db.commit()

    def _request_approval(
        self,
        *,
        session,
        step,
        agent_message_id: uuid.UUID,
        tool_name: str,
        arguments: dict[str, object],
        decision: PolicyDecisionResult,
    ) -> None:
        tool_call = self.repository.create_tool_call(
            workspace_id=session.workspace_id,
            session_id=session.id,
            task_id=step.task_id,
            step_id=step.id,
            agent_message_id=agent_message_id,
            tool_name=tool_name,
            tool_version="1.0.0",
            status="awaiting_approval",
            arguments=arguments,
            policy_decision=decision.as_tool_call_policy(),
        )
        approval = self.repository.create_approval_request(
            workspace_id=session.workspace_id,
            session_id=session.id,
            task_id=step.task_id,
            step_id=step.id,
            tool_call_id=tool_call.id,
            risk_level=decision.risk_level,
            reason="; ".join(decision.reasons),
            requested_action={"tool_name": tool_name, "arguments": arguments},
            requested_by_agent="executor",
        )
        previous_status = session.status
        self.repository.update_session_status(session, status="awaiting_approval")
        self.repository.create_event(
            workspace_id=session.workspace_id,
            session_id=session.id,
            event_type="approval.requested",
            payload={"approval_id": str(approval.id), "tool_call_id": str(tool_call.id)},
            actor_type="system",
            actor_id=self.worker_id,
        )
        self.repository.create_event(
            workspace_id=session.workspace_id,
            session_id=session.id,
            event_type="session.status_changed",
            payload={"previous_status": previous_status, "new_status": session.status},
            actor_type="system",
            actor_id=self.worker_id,
        )

    def _queue_terminal_tool(
        self,
        *,
        session,
        step,
        agent_message_id: uuid.UUID,
        arguments: dict[str, object],
        decision: PolicyDecisionResult,
    ) -> None:
        tool_call = self.repository.create_tool_call(
            workspace_id=session.workspace_id,
            session_id=session.id,
            task_id=step.task_id,
            step_id=step.id,
            agent_message_id=agent_message_id,
            tool_name="terminal.execute",
            tool_version="1.0.0",
            status="queued",
            arguments=arguments,
            policy_decision=decision.as_tool_call_policy(),
        )
        job = self.repository.create_job(
            workspace_id=session.workspace_id,
            session_id=session.id,
            job_type="execute_tool_call",
            payload={"tool_call_id": str(tool_call.id), "session_id": str(session.id)},
        )
        self.repository.create_event(
            workspace_id=session.workspace_id,
            session_id=session.id,
            event_type="tool_call.queued",
            payload={"tool_call_id": str(tool_call.id), "job_id": str(job.id)},
            actor_type="system",
            actor_id=self.worker_id,
        )
        self.db.commit()
        celery_task_id = self.queue.enqueue_tool_execute(job_id=str(job.id))
        self.repository.mark_job_enqueued(job, celery_task_id=celery_task_id)

    def _run_memory_search(
        self,
        *,
        session,
        step,
        agent_message_id: uuid.UUID,
        arguments: dict[str, object],
        decision: PolicyDecisionResult,
    ) -> None:
        query = str(arguments.get("query", session.objective))
        limit = arguments.get("limit")
        results = scoped_memory_context(
            memory_repository=self.memory,
            configuration_repository=self.configuration,
            settings=self.settings,
            session=session,
            query=query,
            limit=limit if isinstance(limit, int) else None,
        )
        tool_call = self.repository.create_tool_call(
            workspace_id=session.workspace_id,
            session_id=session.id,
            task_id=step.task_id,
            step_id=step.id,
            agent_message_id=agent_message_id,
            tool_name="memory.search",
            tool_version="1.0.0",
            status="running",
            arguments=arguments,
            policy_decision=decision.as_tool_call_policy(),
        )
        self.repository.finish_tool_call(
            tool_call,
            status="succeeded",
            result={"items": results, "count": len(results)},
        )
        self.repository.create_event(
            workspace_id=session.workspace_id,
            session_id=session.id,
            event_type="tool_call.finished",
            payload={"tool_call_id": str(tool_call.id), "status": "succeeded"},
            actor_type="system",
            actor_id=self.worker_id,
        )

    def _propose_memory(
        self,
        *,
        session,
        step,
        agent_message_id: uuid.UUID,
        arguments: dict[str, object],
        decision: PolicyDecisionResult,
    ) -> None:
        content = str(arguments.get("content", ""))
        scan = scan_for_secrets(content)
        document = self.memory.create_document(
            workspace_id=session.workspace_id,
            project_id=session.project_id,
            session_id=session.id,
            provider_profile_id=session.provider_profile_id,
            title=str(arguments.get("title", "Agent memory candidate"))[:255],
            summary=str(arguments.get("summary", "Agent-proposed memory candidate.")),
            content=content,
            source_type="agent",
            visibility="session",
            metadata={
                "step_id": str(step.id),
                "agent_message_id": str(agent_message_id),
                "secret_scan_reasons": scan.reasons,
            },
            embedding_status="blocked" if scan.status == "flagged" else "pending",
            secret_scan_status=scan.status,
        )
        self.repository.create_event(
            workspace_id=session.workspace_id,
            session_id=session.id,
            event_type="memory.document_created",
            payload={"document_id": str(document.id), "source_type": "agent"},
            actor_type="system",
            actor_id=self.worker_id,
        )
        tool_call = self.repository.create_tool_call(
            workspace_id=session.workspace_id,
            session_id=session.id,
            task_id=step.task_id,
            step_id=step.id,
            agent_message_id=agent_message_id,
            tool_name="memory.propose",
            tool_version="1.0.0",
            status="running",
            arguments=arguments,
            policy_decision=decision.as_tool_call_policy(),
        )
        self.repository.finish_tool_call(
            tool_call,
            status="succeeded",
            result={"document_id": str(document.id), "status": document.status},
        )
        self.repository.create_event(
            workspace_id=session.workspace_id,
            session_id=session.id,
            event_type="tool_call.finished",
            payload={"tool_call_id": str(tool_call.id), "status": "succeeded"},
            actor_type="system",
            actor_id=self.worker_id,
        )

    def _complete_session_if_ready(self, session) -> None:
        tasks = self.repository.list_tasks(
            workspace_id=session.workspace_id,
            session_id=session.id,
        )
        steps = self.repository.list_steps(
            workspace_id=session.workspace_id,
            session_id=session.id,
        )
        for task in tasks:
            task_steps = [step for step in steps if step.task_id == task.id]
            if task_steps and all(step.status == "completed" for step in task_steps):
                self.repository.update_task_result(
                    task,
                    status="completed",
                    result_summary="All steps completed.",
                )
        if tasks and all(task.status == "completed" for task in tasks):
            previous_status = session.status
            self.repository.update_session_status(
                session,
                status="completed",
                summary="Agent completed all planned steps.",
            )
            self.repository.create_event(
                workspace_id=session.workspace_id,
                session_id=session.id,
                event_type="session.status_changed",
                payload={"previous_status": previous_status, "new_status": "completed"},
                actor_type="system",
                actor_id=self.worker_id,
            )

    def _mark_failed(self, *, job_id: uuid.UUID, error: str) -> None:
        job = self.repository.get_job_by_id(job_id=job_id)
        if job is None:
            return
        self.repository.fail_job(job, error=error)
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


def _payload_int(value: object) -> int | None:
    return value if isinstance(value, int) else None


def _dict(value: object) -> dict[str, object]:
    return value if isinstance(value, dict) else {}


def _int_or_none(value: object) -> int | None:
    return value if isinstance(value, int) else None
