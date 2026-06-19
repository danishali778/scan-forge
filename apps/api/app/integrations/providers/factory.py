from app.core.config import Settings
from app.core.security import TokenCipher
from app.domain.exceptions import DomainError
from app.integrations.providers.base import EmbeddingProviderClient, ProviderClient
from app.integrations.providers.fake import FakeEmbeddingProviderClient, FakeProviderClient
from app.integrations.providers.openai_compatible import (
    OpenAICompatibleEmbeddingProviderClient,
    OpenAICompatibleProviderClient,
)
from app.models.control_plane import ProviderProfile, Secret


def build_provider_client(
    *,
    profile: ProviderProfile,
    secret: Secret | None,
    settings: Settings,
) -> ProviderClient:
    if profile.provider_type == "fake":
        return FakeProviderClient()

    if profile.provider_type not in {"openai", "openai_compatible"}:
        raise DomainError(f"Unsupported provider type: {profile.provider_type}.")
    if secret is None:
        raise DomainError("Provider profile is missing an API key secret.")

    api_key = TokenCipher(settings.auth_encryption_key).decrypt(secret.ciphertext)
    if not api_key:
        raise DomainError("Provider API key could not be loaded.")

    return OpenAICompatibleProviderClient(
        base_url=profile.base_url or "https://api.openai.com/v1",
        api_key=api_key,
        provider_type=profile.provider_type,
    )


def build_embedding_client(
    *,
    profile: ProviderProfile,
    secret: Secret | None,
    settings: Settings,
) -> EmbeddingProviderClient:
    if profile.provider_type == "fake":
        return FakeEmbeddingProviderClient(dimensions=settings.memory_embedding_dimensions)

    if profile.provider_type not in {"openai", "openai_compatible"}:
        raise DomainError(f"Unsupported embedding provider type: {profile.provider_type}.")
    if secret is None:
        raise DomainError("Embedding provider profile is missing an API key secret.")

    api_key = TokenCipher(settings.auth_encryption_key).decrypt(secret.ciphertext)
    if not api_key:
        raise DomainError("Embedding provider API key could not be loaded.")

    return OpenAICompatibleEmbeddingProviderClient(
        base_url=profile.base_url or "https://api.openai.com/v1",
        api_key=api_key,
        provider_type=profile.provider_type,
    )
