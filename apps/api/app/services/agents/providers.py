from dataclasses import dataclass

from app.core.config import Settings
from app.domain.exceptions import DomainError
from app.integrations.providers import ProviderClient, build_provider_client
from app.models.control_plane import ProviderProfile
from app.models.session import SessionModel
from app.repositories.control_plane import ConfigurationRepository


@dataclass(frozen=True)
class LoadedProvider:
    profile: ProviderProfile
    client: ProviderClient
    model: str


def load_session_provider(
    *,
    repository: ConfigurationRepository,
    session: SessionModel,
    settings: Settings,
) -> LoadedProvider | None:
    if session.provider_profile_id is None:
        return None

    profile = repository.get_provider_profile(
        workspace_id=session.workspace_id,
        profile_id=session.provider_profile_id,
    )
    if profile is None:
        raise DomainError("Session provider profile was not found.")

    secret = None
    if profile.credential_secret_id is not None:
        secret = repository.get_secret(
            workspace_id=session.workspace_id,
            secret_id=profile.credential_secret_id,
        )
    client = build_provider_client(profile=profile, secret=secret, settings=settings)
    return LoadedProvider(profile=profile, client=client, model=_model_for(profile))


def _model_for(profile: ProviderProfile) -> str:
    models = profile.agent_models or {}
    for key in ("executor", "planner", "analyst", "default", "model"):
        value = models.get(key)
        if isinstance(value, str) and value:
            return value
    if profile.provider_type == "fake":
        return "fake-agent"
    return "gpt-4.1-mini"
