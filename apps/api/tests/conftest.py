import os
import uuid
from collections.abc import Generator

import pytest
from app.api.dependencies import (
    get_queue_client,
    get_runtime_client,
    get_storage_adapter,
    get_supabase_auth_adapter,
)
from app.core.config import get_settings
from app.db.session import set_session_factory
from app.integrations.storage import InMemoryStorageAdapter
from app.integrations.supabase.auth import SupabaseAuthResult
from app.main import create_app
from app.models import Base
from cryptography.fernet import Fernet
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool


def configure_test_env() -> None:
    os.environ.setdefault("ENVIRONMENT", "test")
    os.environ.setdefault("DATABASE_URL", "sqlite+pysqlite:///:memory:")
    os.environ.setdefault("SUPABASE_URL", "http://supabase.test")
    os.environ.setdefault("SUPABASE_ANON_KEY", "test-key")
    os.environ.setdefault("AUTH_ENCRYPTION_KEY", Fernet.generate_key().decode("utf-8"))
    os.environ.setdefault("COOKIE_SECURE", "false")


class FakeSupabaseAuthAdapter:
    def __init__(self) -> None:
        self.next_user_id = uuid.uuid4()
        self.next_email = "owner@example.com"
        self.refresh_token = "refresh-token-1"
        self.refreshed_token = "refresh-token-2"

    def sign_in_with_password(self, *, email: str, password: str) -> SupabaseAuthResult:
        _ = password
        self.next_email = email
        return SupabaseAuthResult(
            supabase_user_id=self.next_user_id,
            email=email,
            access_token="access-token",
            refresh_token=self.refresh_token,
            expires_in=3600,
            supabase_session_id="supabase-session",
        )

    def refresh_session(self, *, refresh_token: str) -> SupabaseAuthResult:
        _ = refresh_token
        return SupabaseAuthResult(
            supabase_user_id=self.next_user_id,
            email=self.next_email,
            access_token="access-token-refreshed",
            refresh_token=self.refreshed_token,
            expires_in=3600,
            supabase_session_id="supabase-session-refreshed",
        )

    def sign_out(self, *, access_token: str | None = None) -> None:
        _ = access_token


class FakeQueueClient:
    def __init__(self) -> None:
        self.enqueued_job_ids: list[str] = []
        self.enqueued_tool_job_ids: list[str] = []
        self.enqueued_agent_job_ids: list[str] = []
        self.enqueued_finding_job_ids: list[str] = []
        self.enqueued_report_job_ids: list[str] = []
        self.enqueued_memory_job_ids: list[str] = []

    def enqueue_session_plan(self, *, job_id: str) -> str:
        self.enqueued_job_ids.append(job_id)
        return f"test-celery-{job_id}"

    def enqueue_tool_execute(self, *, job_id: str) -> str:
        self.enqueued_tool_job_ids.append(job_id)
        return f"test-tool-celery-{job_id}"

    def enqueue_agent_run(self, *, job_id: str) -> str:
        self.enqueued_agent_job_ids.append(job_id)
        return f"test-agent-celery-{job_id}"

    def enqueue_finding_proposal(self, *, job_id: str) -> str:
        self.enqueued_finding_job_ids.append(job_id)
        return f"test-finding-celery-{job_id}"

    def enqueue_report_render(self, *, job_id: str) -> str:
        self.enqueued_report_job_ids.append(job_id)
        return f"test-report-celery-{job_id}"

    def enqueue_memory_embed(self, *, job_id: str) -> str:
        self.enqueued_memory_job_ids.append(job_id)
        return f"test-memory-celery-{job_id}"


class FakeRuntimeClient:
    def __init__(self) -> None:
        self.started_runtime_ids: list[str] = []
        self.stopped_runtime_ids: list[str] = []
        self.files: dict[str, str] = {"/workspace": ""}

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
        _ = workspace_id, session_id, runtime_profile, network_policy
        self.started_runtime_ids.append(runtime_id)
        return {
            "runtime_id": runtime_id,
            "status": "running",
            "workspace_path": "/workspace",
            "external_id": f"container-{runtime_id}",
            "image": "pentagi-runtime-python:local",
            "resource_limits": resource_limits or {},
        }

    def stop_runtime(self, *, runtime_id: str, reason: str = "requested") -> dict[str, object]:
        _ = reason
        self.stopped_runtime_ids.append(runtime_id)
        return {"runtime_id": runtime_id, "status": "stopped"}

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
        _ = runtime_id, tool_call_id, cwd, timeout_seconds, max_output_bytes, policy_decision_id
        output = " ".join(command)
        return {
            "command_id": "runtime-command",
            "status": "succeeded",
            "exit_code": 0,
            "duration_ms": 10,
            "output": output,
            "output_truncated": False,
            "error_message": None,
        }

    def list_files(self, *, runtime_id: str, path: str) -> dict[str, object]:
        _ = runtime_id
        entries = [
            {
                "name": file_path.rsplit("/", 1)[-1],
                "path": file_path,
                "type": "file",
                "size_bytes": len(content.encode("utf-8")),
            }
            for file_path, content in sorted(self.files.items())
            if file_path != "/workspace" and file_path.startswith(f"{path.rstrip('/')}/")
        ]
        return {"path": path, "entries": entries}

    def read_file(self, *, runtime_id: str, path: str) -> dict[str, object]:
        _ = runtime_id
        content = self.files.get(path, "")
        return {"path": path, "content": content, "size_bytes": len(content.encode("utf-8"))}

    def write_file(self, *, runtime_id: str, path: str, content: str) -> dict[str, object]:
        _ = runtime_id
        self.files[path] = content
        return {"path": path, "size_bytes": len(content.encode("utf-8"))}


@pytest.fixture()
def db_session_factory() -> Generator[sessionmaker[Session], None, None]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    TestingSessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    Base.metadata.create_all(engine)
    set_session_factory(TestingSessionLocal)
    try:
        yield TestingSessionLocal
    finally:
        Base.metadata.drop_all(engine)
        engine.dispose()


@pytest.fixture()
def fake_supabase() -> FakeSupabaseAuthAdapter:
    return FakeSupabaseAuthAdapter()


@pytest.fixture()
def fake_queue() -> FakeQueueClient:
    return FakeQueueClient()


@pytest.fixture()
def fake_runtime() -> FakeRuntimeClient:
    return FakeRuntimeClient()


@pytest.fixture()
def fake_storage() -> InMemoryStorageAdapter:
    return InMemoryStorageAdapter()


@pytest.fixture()
def client(
    db_session_factory: sessionmaker[Session],
    fake_supabase: FakeSupabaseAuthAdapter,
    fake_queue: FakeQueueClient,
    fake_runtime: FakeRuntimeClient,
    fake_storage: InMemoryStorageAdapter,
) -> Generator[TestClient, None, None]:
    _ = db_session_factory
    configure_test_env()
    get_settings.cache_clear()
    app = create_app()
    app.dependency_overrides[get_supabase_auth_adapter] = lambda: fake_supabase
    app.dependency_overrides[get_queue_client] = lambda: fake_queue
    app.dependency_overrides[get_runtime_client] = lambda: fake_runtime
    app.dependency_overrides[get_storage_adapter] = lambda: fake_storage
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def csrf_headers(client: TestClient) -> dict[str, str]:
    csrf = client.cookies.get("app_csrf")
    return {"X-CSRF-Token": csrf or ""}


def login(client: TestClient, email: str = "owner@example.com", password: str = "password"):
    return client.post("/api/v1/auth/login", json={"email": email, "password": password})
