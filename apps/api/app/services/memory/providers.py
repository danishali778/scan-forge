import uuid
from dataclasses import dataclass

from app.core.config import Settings
from app.domain.exceptions import DomainError
from app.integrations.providers import EmbeddingProviderClient, build_embedding_client
from app.models.control_plane import ProviderProfile
from app.repositories.control_plane import ConfigurationRepository


@dataclass(frozen=True)
class LoadedEmbeddingProvider:
    profile: ProviderProfile
    client: EmbeddingProviderClient
    model: str


def load_embedding_provider(
    *,
    repository: ConfigurationRepository,
    workspace_id: uuid.UUID,
    provider_profile_id: uuid.UUID | None,
    settings: Settings,
) -> LoadedEmbeddingProvider:
    if provider_profile_id is None:
        raise DomainError("An embedding provider profile is required.")
    profile = repository.get_provider_profile(
        workspace_id=workspace_id,
        profile_id=provider_profile_id,
    )
    if profile is None:
        raise DomainError("Embedding provider profile was not found.")
    secret = None
    if profile.credential_secret_id is not None:
        secret = repository.get_secret(
            workspace_id=workspace_id,
            secret_id=profile.credential_secret_id,
        )
    client = build_embedding_client(profile=profile, secret=secret, settings=settings)
    return LoadedEmbeddingProvider(profile=profile, client=client, model=_embedding_model(profile))


def _embedding_model(profile: ProviderProfile) -> str:
    models = profile.agent_models or {}
    value = models.get("embedding")
    if isinstance(value, str) and value:
        return value
    if profile.provider_type == "fake":
        return "fake-embedding"
    return "text-embedding-3-small"
