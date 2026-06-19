"""Provider client boundaries for agent orchestration."""

from app.integrations.providers.base import (
    EmbeddingProviderClient,
    EmbeddingRequest,
    EmbeddingResponse,
    ProviderClient,
    ProviderMessage,
    ProviderRequest,
    ProviderResponse,
)
from app.integrations.providers.factory import build_embedding_client, build_provider_client
from app.integrations.providers.fake import FakeEmbeddingProviderClient, FakeProviderClient
from app.integrations.providers.openai_compatible import (
    OpenAICompatibleEmbeddingProviderClient,
    OpenAICompatibleProviderClient,
)

__all__ = [
    "EmbeddingProviderClient",
    "EmbeddingRequest",
    "EmbeddingResponse",
    "FakeEmbeddingProviderClient",
    "FakeProviderClient",
    "OpenAICompatibleEmbeddingProviderClient",
    "OpenAICompatibleProviderClient",
    "ProviderClient",
    "ProviderMessage",
    "ProviderRequest",
    "ProviderResponse",
    "build_embedding_client",
    "build_provider_client",
]
