import httpx

from app.core.config import get_settings
from app.domain.exceptions import DomainError


class RuntimeServiceClient:
    """Client boundary for worker/API calls to the internal runtime service."""

    def __init__(self, base_url: str | None = None) -> None:
        self.base_url = base_url or get_settings().runtime_service_url

    def health_url(self) -> str:
        return f"{self.base_url.rstrip('/')}/health"

    @property
    def _internal_base_url(self) -> str:
        return f"{self.base_url.rstrip('/')}/internal/runtime"

    def start_runtime(
        self,
        *,
        runtime_id: str,
        workspace_id: str,
        session_id: str,
        runtime_profile: str = "default",
        network_policy: dict[str, object] | None = None,
        resource_limits: dict[str, object] | None = None,
    ) -> dict[str, object]:
        return self._request_json(
            "POST",
            "/instances",
            json={
                "runtime_id": runtime_id,
                "workspace_id": workspace_id,
                "session_id": session_id,
                "runtime_profile": runtime_profile,
                "network_policy": network_policy or {},
                "resource_limits": resource_limits or {},
            },
        )

    def stop_runtime(self, *, runtime_id: str, reason: str = "requested") -> dict[str, object]:
        return self._request_json(
            "POST",
            f"/instances/{runtime_id}/stop",
            json={"reason": reason, "collect_artifacts": False},
        )

    def execute_command(
        self,
        *,
        runtime_id: str,
        tool_call_id: str,
        command: list[str],
        cwd: str,
        timeout_seconds: int,
        max_output_bytes: int,
        policy_decision_id: str,
    ) -> dict[str, object]:
        return self._request_json(
            "POST",
            f"/instances/{runtime_id}/commands",
            json={
                "tool_call_id": tool_call_id,
                "command": command,
                "cwd": cwd,
                "env": {},
                "timeout_seconds": timeout_seconds,
                "max_output_bytes": max_output_bytes,
                "policy_decision_id": policy_decision_id,
            },
            timeout=timeout_seconds + 15,
        )

    def list_files(self, *, runtime_id: str, path: str) -> dict[str, object]:
        return self._request_json(
            "GET",
            f"/instances/{runtime_id}/files",
            params={"path": path},
        )

    def read_file(self, *, runtime_id: str, path: str) -> dict[str, object]:
        return self._request_json(
            "GET",
            f"/instances/{runtime_id}/files/content",
            params={"path": path},
        )

    def write_file(self, *, runtime_id: str, path: str, content: str) -> dict[str, object]:
        return self._request_json(
            "PUT",
            f"/instances/{runtime_id}/files/content",
            json={"path": path, "content": content},
        )

    def _request_json(
        self,
        method: str,
        path: str,
        *,
        json: dict[str, object] | None = None,
        params: dict[str, object] | None = None,
        timeout: float = 30.0,
    ) -> dict[str, object]:
        url = f"{self._internal_base_url}{path}"
        try:
            response = httpx.request(method, url, json=json, params=params, timeout=timeout)
        except httpx.HTTPError as exc:
            raise DomainError(f"Runtime service request failed: {exc}") from exc
        if response.status_code >= 400:
            detail: object
            try:
                detail = response.json().get("detail", response.text)
            except ValueError:
                detail = response.text
            raise DomainError(f"Runtime service rejected request: {detail}")
        data = response.json()
        if not isinstance(data, dict):
            raise DomainError("Runtime service returned an invalid response.")
        return data
