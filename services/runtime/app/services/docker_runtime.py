import base64
import io
import json
import tarfile
import threading
import time
import uuid
from functools import lru_cache
from pathlib import PurePosixPath
from typing import Any

import docker
from docker.errors import DockerException, NotFound

from app.core.config import get_settings


class RuntimeServiceError(Exception):
    pass


class DockerRuntimeManager:
    def __init__(self) -> None:
        self.settings = get_settings()
        self.client = docker.from_env()
        self.commands: dict[str, dict[str, Any]] = {}

    def docker_available(self) -> bool:
        try:
            self.client.ping()
            return True
        except DockerException:
            return False

    def active_runtime_count(self) -> int:
        try:
            return len(
                self.client.containers.list(
                    filters={"label": f"{self._label_key('managed')}=true"}
                )
            )
        except DockerException:
            return 0

    def start_runtime(
        self,
        *,
        runtime_id: str | None,
        workspace_id: str,
        session_id: str,
        runtime_profile: str,
        network_policy: dict[str, object],
        resource_limits: dict[str, object],
    ) -> dict[str, object]:
        _ = runtime_profile, network_policy
        runtime_id = runtime_id or str(uuid.uuid4())
        image = self.settings.runtime_default_image
        self._ensure_image(image)
        volume_name = self._volume_name(runtime_id)
        try:
            volume = self.client.volumes.get(volume_name)
        except NotFound:
            volume = self.client.volumes.create(
                name=volume_name,
                labels={
                    self._label_key("managed"): "true",
                    self._label_key("runtime_id"): runtime_id,
                    self._label_key("workspace_id"): workspace_id,
                    self._label_key("session_id"): session_id,
                },
            )

        container = self._find_container(runtime_id)
        if container is None:
            container_name = self._container_name(runtime_id)
            run_kwargs: dict[str, object] = {
                "image": image,
                "command": ["sleep", "infinity"],
                "detach": True,
                "network_mode": self.settings.runtime_network_mode,
                "volumes": {volume.name: {"bind": "/workspace", "mode": "rw"}},
                "working_dir": "/workspace",
                "labels": {
                    self._label_key("managed"): "true",
                    self._label_key("runtime_id"): runtime_id,
                    self._label_key("workspace_id"): workspace_id,
                    self._label_key("session_id"): session_id,
                },
                "name": container_name,
            }
            memory_mb = resource_limits.get("memory_mb")
            if isinstance(memory_mb, int) and memory_mb > 0:
                run_kwargs["mem_limit"] = f"{memory_mb}m"
            container = self.client.containers.run(**run_kwargs)
        elif container.status != "running":
            container.start()

        self._exec_checked(
            container,
            [
                "python",
                "-c",
                "import os; [os.makedirs(p, exist_ok=True) for p in "
                "('/workspace/input','/workspace/output','/workspace/artifacts',"
                "'/workspace/scripts','/workspace/tmp')]",
            ],
            cwd="/workspace",
        )
        container.reload()
        return {
            "runtime_id": runtime_id,
            "status": "running",
            "workspace_path": "/workspace",
            "external_id": container.id,
            "image": image,
            "resource_limits": resource_limits,
        }

    def get_runtime(self, *, runtime_id: str) -> dict[str, object]:
        container = self._require_container(runtime_id)
        container.reload()
        return {
            "runtime_id": runtime_id,
            "status": "running" if container.status == "running" else container.status,
            "workspace_path": "/workspace",
            "external_id": container.id,
            "image": self.settings.runtime_default_image,
        }

    def stop_runtime(self, *, runtime_id: str, reason: str) -> dict[str, object]:
        _ = reason
        container = self._find_container(runtime_id)
        if container is not None:
            container.reload()
            if container.status == "running":
                container.stop(timeout=5)
            container.remove(v=True, force=True)
        try:
            self.client.volumes.get(self._volume_name(runtime_id)).remove(force=True)
        except NotFound:
            pass
        return {"runtime_id": runtime_id, "status": "stopped"}

    def execute_command(
        self,
        *,
        runtime_id: str,
        tool_call_id: str,
        command: list[str],
        cwd: str,
        env: dict[str, str],
        timeout_seconds: int,
        max_output_bytes: int,
        policy_decision_id: str,
    ) -> dict[str, object]:
        if not policy_decision_id:
            raise RuntimeServiceError("policy_decision_id is required.")
        self._validate_command(command)
        cwd = self._validate_container_path(cwd)
        container = self._require_container(runtime_id)
        self._assert_realpath_inside_workspace(container, cwd)
        command_id = str(uuid.uuid4())
        started = time.monotonic()
        self.commands[command_id] = {
            "command_id": command_id,
            "runtime_id": runtime_id,
            "tool_call_id": tool_call_id,
            "status": "running",
        }

        result_holder: dict[str, object] = {}

        def run_exec() -> None:
            result_holder["result"] = container.exec_run(
                command,
                workdir=cwd,
                environment=env,
                demux=True,
            )

        thread = threading.Thread(target=run_exec, daemon=True)
        thread.start()
        thread.join(timeout_seconds)
        timed_out = thread.is_alive()
        if timed_out:
            try:
                container.kill()
            except DockerException:
                pass
            status = "timed_out"
            exit_code = None
            output = ""
            error_message = "Command timed out."
        else:
            result = result_holder.get("result")
            exit_code = getattr(result, "exit_code", 1)
            stdout, stderr = getattr(result, "output", (b"", b""))
            output_bytes = (stdout or b"") + (stderr or b"")
            output, output_truncated = _truncate_output(output_bytes, max_output_bytes)
            status = "succeeded" if exit_code == 0 else "failed"
            error_message = None if exit_code == 0 else f"Command exited with code {exit_code}."

        duration_ms = int((time.monotonic() - started) * 1000)
        response = {
            "command_id": command_id,
            "status": status,
            "exit_code": exit_code,
            "duration_ms": duration_ms,
            "output": output,
            "output_truncated": False if timed_out else output_truncated,
            "error_message": error_message,
        }
        self.commands[command_id] = response
        return response

    def command_status(self, *, command_id: str) -> dict[str, object]:
        command = self.commands.get(command_id)
        if command is None:
            raise RuntimeServiceError("Runtime command was not found.")
        return command

    def cancel_command(self, *, command_id: str) -> dict[str, object]:
        command = self.commands.get(command_id)
        if command is None:
            raise RuntimeServiceError("Runtime command was not found.")
        command["status"] = "cancelled"
        return command

    def list_files(self, *, runtime_id: str, path: str) -> dict[str, object]:
        path = self._validate_container_path(path)
        container = self._require_container(runtime_id)
        self._assert_realpath_inside_workspace(container, path)
        script = """
import json, os, sys
path = sys.argv[1]
entries = []
for name in sorted(os.listdir(path)):
    full = os.path.join(path, name)
    kind = "directory" if os.path.isdir(full) else "file"
    size = None if os.path.isdir(full) else os.path.getsize(full)
    entries.append({"name": name, "path": full, "type": kind, "size_bytes": size})
print(json.dumps({"path": path, "entries": entries}))
"""
        output = self._exec_checked(container, ["python", "-c", script, path], cwd="/workspace")
        return json.loads(output)

    def read_file(self, *, runtime_id: str, path: str) -> dict[str, object]:
        path = self._validate_container_path(path)
        container = self._require_container(runtime_id)
        self._assert_realpath_inside_workspace(container, path)
        script = """
import os, sys
path = sys.argv[1]
limit = int(sys.argv[2])
with open(path, "rb") as handle:
    data = handle.read(limit + 1)
if len(data) > limit:
    raise SystemExit(3)
sys.stdout.buffer.write(data)
"""
        output = self._exec_checked(
            container,
            ["python", "-c", script, path, str(self.settings.runtime_file_read_max_bytes)],
            cwd="/workspace",
        )
        size_bytes = len(output.encode("utf-8"))
        return {"path": path, "content": output, "size_bytes": size_bytes}

    def write_file(self, *, runtime_id: str, path: str, content: str) -> dict[str, object]:
        path = self._validate_container_path(path)
        data = content.encode("utf-8")
        if len(data) > self.settings.runtime_file_write_max_bytes:
            raise RuntimeServiceError("File write exceeds the configured size limit.")
        container = self._require_container(runtime_id)
        parent = str(PurePosixPath(path).parent)
        self._assert_realpath_inside_workspace(container, parent)
        encoded = base64.b64encode(data).decode("ascii")
        script = """
import base64, os, sys
path = sys.argv[1]
data = base64.b64decode(sys.argv[2].encode("ascii"))
parent = os.path.dirname(path)
os.makedirs(parent, exist_ok=True)
real_parent = os.path.realpath(parent)
if real_parent != "/workspace" and not real_parent.startswith("/workspace/"):
    raise SystemExit(2)
with open(path, "wb") as handle:
    handle.write(data)
print(len(data))
"""
        output = self._exec_checked(container, ["python", "-c", script, path, encoded], cwd="/")
        return {"path": path, "size_bytes": int(output.strip())}

    def _require_container(self, runtime_id: str):
        container = self._find_container(runtime_id)
        if container is None:
            raise RuntimeServiceError("Runtime container was not found.")
        container.reload()
        if container.status != "running":
            raise RuntimeServiceError("Runtime container is not running.")
        return container

    def _find_container(self, runtime_id: str):
        containers = self.client.containers.list(
            all=True,
            filters={"label": f"{self._label_key('runtime_id')}={runtime_id}"},
        )
        return containers[0] if containers else None

    def _ensure_image(self, image: str) -> None:
        try:
            self.client.images.get(image)
            return
        except NotFound:
            pass
        if image != "scopeforge-runtime-python:local":
            raise RuntimeServiceError(f"Runtime image was not found: {image}")
        self.client.images.build(
            fileobj=_sandbox_build_context(),
            custom_context=True,
            tag=image,
            rm=True,
        )

    def _validate_command(self, command: list[str]) -> None:
        allowed = {
            item.strip()
            for item in self.settings.runtime_allowed_commands.split(",")
            if item.strip()
        }
        if not command:
            raise RuntimeServiceError("Command cannot be empty.")
        executable = command[0]
        if "/" in executable or "\\" in executable or executable not in allowed:
            raise RuntimeServiceError("Command is not allowed by runtime policy.")

    def _validate_container_path(self, value: str) -> str:
        path = PurePosixPath(value)
        parts = path.parts
        if not path.is_absolute() or len(parts) < 2 or parts[1] != "workspace":
            raise RuntimeServiceError("Path must be inside /workspace.")
        if ".." in parts:
            raise RuntimeServiceError("Path cannot contain parent directory traversal.")
        return str(path)

    def _assert_realpath_inside_workspace(self, container, path: str) -> None:
        script = """
import os, sys
path = os.path.realpath(sys.argv[1])
print(path)
raise SystemExit(0 if path == "/workspace" or path.startswith("/workspace/") else 2)
"""
        self._exec_checked(container, ["python", "-c", script, path], cwd="/workspace")

    def _exec_checked(self, container, command: list[str], *, cwd: str) -> str:
        result = container.exec_run(command, workdir=cwd, demux=True)
        stdout, stderr = result.output
        output = (stdout or b"") + (stderr or b"")
        if result.exit_code != 0:
            raise RuntimeServiceError(output.decode("utf-8", errors="replace").strip())
        return output.decode("utf-8", errors="replace")

    def _label_key(self, name: str) -> str:
        return f"{self.settings.runtime_container_label_prefix}.{name}"

    def _container_name(self, runtime_id: str) -> str:
        return f"{self.settings.runtime_container_label_prefix}-runtime-{runtime_id}"

    def _volume_name(self, runtime_id: str) -> str:
        return f"{self.settings.runtime_container_label_prefix}-workspace-{runtime_id}"


def _sandbox_build_context() -> io.BytesIO:
    dockerfile = """
FROM python:3.12-slim
RUN useradd -m -u 10001 runtime \
    && mkdir -p /workspace/input \
        /workspace/output \
        /workspace/artifacts \
        /workspace/scripts \
        /workspace/tmp \
    && chown -R runtime:runtime /workspace
WORKDIR /workspace
USER runtime
CMD ["sleep", "infinity"]
"""
    buffer = io.BytesIO()
    with tarfile.open(fileobj=buffer, mode="w") as tar:
        data = dockerfile.encode("utf-8")
        info = tarfile.TarInfo("Dockerfile")
        info.size = len(data)
        tar.addfile(info, io.BytesIO(data))
    buffer.seek(0)
    return buffer


def _truncate_output(output: bytes, max_output_bytes: int) -> tuple[str, bool]:
    truncated = len(output) > max_output_bytes
    if truncated:
        output = output[:max_output_bytes]
    return output.decode("utf-8", errors="replace"), truncated


@lru_cache
def get_runtime_manager() -> DockerRuntimeManager:
    return DockerRuntimeManager()
