from abc import ABC, abstractmethod
from dataclasses import dataclass, field


@dataclass(frozen=True)
class ProviderMessage:
    role: str
    content: str


@dataclass(frozen=True)
class ProviderRequest:
    messages: list[ProviderMessage]
    model: str
    metadata: dict[str, object] = field(default_factory=dict)
    temperature: float = 0.0
    max_tokens: int | None = None


@dataclass(frozen=True)
class ProviderResponse:
    content: str
    model: str
    provider_type: str
    token_input: int | None = None
    token_output: int | None = None
    cost_input: float | None = None
    cost_output: float | None = None


@dataclass(frozen=True)
class EmbeddingRequest:
    input: str
    model: str
    metadata: dict[str, object] = field(default_factory=dict)


@dataclass(frozen=True)
class EmbeddingResponse:
    embedding: list[float]
    model: str
    provider_type: str
    token_input: int | None = None
    cost_input: float | None = None


class ProviderClient(ABC):
    provider_type: str

    @abstractmethod
    def complete(self, request: ProviderRequest) -> ProviderResponse:
        """Return visible model output only; never private reasoning."""


class EmbeddingProviderClient(ABC):
    provider_type: str

    @abstractmethod
    def embed(self, request: EmbeddingRequest) -> EmbeddingResponse:
        """Return a single embedding vector for the given input."""
