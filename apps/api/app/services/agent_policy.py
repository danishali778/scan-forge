from dataclasses import dataclass

from app.domain.exceptions import DomainError
from app.models.control_plane import Policy


@dataclass(frozen=True)
class PolicyDecisionResult:
    decision: str
    risk_level: str
    reasons: list[str]
    matched_rules: dict[str, object]
    constraints: dict[str, object]
    input_summary: dict[str, object]

    def as_tool_call_policy(self) -> dict[str, object]:
        return {
            "decision": self.decision,
            "risk_level": self.risk_level,
            "reasons": self.reasons,
            "matched_rules": self.matched_rules,
            "constraints": self.constraints,
        }


class AgentPolicyService:
    def evaluate(
        self,
        *,
        tool_name: str,
        arguments: dict[str, object],
        policy: Policy | None,
    ) -> PolicyDecisionResult:
        if tool_name not in {
            "terminal.execute",
            "file.list",
            "file.read",
            "file.write",
            "step.complete",
            "memory.search",
            "memory.propose",
        }:
            return self._deny(tool_name, arguments, "Unknown tools are denied.")

        override = self._policy_override(policy, tool_name)
        if override:
            if override == "deny":
                return self._deny(tool_name, arguments, "Policy rules denied this tool.")
            if override == "allow":
                return self._allow(tool_name, arguments, "Policy rules allowed this tool.")
            if override == "require_approval":
                return self._approval(
                    tool_name,
                    arguments,
                    "Policy rules require approval for this tool.",
                )
            raise DomainError(f"Unsupported policy decision override: {override}.")

        if tool_name in {
            "file.list",
            "file.read",
            "step.complete",
            "memory.search",
            "memory.propose",
        }:
            return self._allow(tool_name, arguments, "Tool is safe by default.")
        if tool_name in {"terminal.execute", "file.write"}:
            return self._approval(
                tool_name,
                arguments,
                "Phase 5 requires approval for model-requested runtime changes.",
            )
        return self._deny(tool_name, arguments, "Tool is denied by default.")

    def _allow(
        self,
        tool_name: str,
        arguments: dict[str, object],
        reason: str,
    ) -> PolicyDecisionResult:
        return PolicyDecisionResult(
            decision="allow",
            risk_level=_risk(tool_name),
            reasons=[reason],
            matched_rules={"default": "allow"},
            constraints=_constraints(arguments),
            input_summary=_summary(tool_name, arguments),
        )

    def _approval(
        self,
        tool_name: str,
        arguments: dict[str, object],
        reason: str,
    ) -> PolicyDecisionResult:
        return PolicyDecisionResult(
            decision="require_approval",
            risk_level=_risk(tool_name),
            reasons=[reason],
            matched_rules={"default": "require_approval"},
            constraints=_constraints(arguments),
            input_summary=_summary(tool_name, arguments),
        )

    def _deny(
        self,
        tool_name: str,
        arguments: dict[str, object],
        reason: str,
    ) -> PolicyDecisionResult:
        return PolicyDecisionResult(
            decision="deny",
            risk_level=_risk(tool_name),
            reasons=[reason],
            matched_rules={"default": "deny"},
            constraints=_constraints(arguments),
            input_summary=_summary(tool_name, arguments),
        )

    @staticmethod
    def _policy_override(policy: Policy | None, tool_name: str) -> str | None:
        if policy is None:
            return None
        rules = policy.rules or {}
        tool_decisions = rules.get("tool_decisions")
        if isinstance(tool_decisions, dict):
            value = tool_decisions.get(tool_name)
            return value if isinstance(value, str) else None
        return None


def _risk(tool_name: str) -> str:
    if tool_name in {"terminal.execute", "file.write"}:
        return "medium"
    return "low"


def _constraints(arguments: dict[str, object]) -> dict[str, object]:
    return {
        "network_mode": "none",
        "timeout_seconds": arguments.get("timeout_seconds"),
        "max_output_bytes": arguments.get("max_output_bytes"),
    }


def _summary(tool_name: str, arguments: dict[str, object]) -> dict[str, object]:
    if tool_name == "terminal.execute":
        command = arguments.get("command")
        return {"command": command[:1] if isinstance(command, list) else []}
    if tool_name == "file.write":
        content = arguments.get("content")
        return {
            "path": arguments.get("path"),
            "content_size": len(content.encode("utf-8")) if isinstance(content, str) else 0,
        }
    if tool_name == "memory.propose":
        content = arguments.get("content")
        return {
            "title": arguments.get("title"),
            "content_size": len(content.encode("utf-8")) if isinstance(content, str) else 0,
        }
    if tool_name == "memory.search":
        return {"query": arguments.get("query"), "limit": arguments.get("limit")}
    return {"path": arguments.get("path"), "summary": arguments.get("summary")}
