import httpx

from app.domain.exceptions import DomainError
from app.integrations.providers.base import (
    EmbeddingProviderClient,
    EmbeddingRequest,
    EmbeddingResponse,
    ProviderClient,
    ProviderRequest,
    ProviderResponse,
)


class OpenAICompatibleProviderClient(ProviderClient):
    provider_type = "openai_compatible"

    def __init__(self, *, base_url: str, api_key: str, provider_type: str) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.provider_type = provider_type

    def complete(self, request: ProviderRequest) -> ProviderResponse:
        payload: dict[str, object] = {
            "model": request.model,
            "messages": [
                {"role": message.role, "content": message.content}
                for message in request.messages
            ],
            "temperature": request.temperature,
            "response_format": {"type": "json_object"},
        }
        if request.max_tokens is not None:
            payload["max_tokens"] = request.max_tokens

        try:
            response = httpx.post(
                f"{self.base_url}/chat/completions",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json=payload,
                timeout=60,
            )
        except httpx.HTTPError as exc:
            raise DomainError(f"Provider request failed: {exc}") from exc

        if response.status_code >= 400:
            raise DomainError(f"Provider rejected request: {response.text[:300]}")

        data = response.json()
        choices = data.get("choices")
        if not isinstance(choices, list) or not choices:
            raise DomainError("Provider returned no choices.")
        message = choices[0].get("message") if isinstance(choices[0], dict) else None
        content = message.get("content") if isinstance(message, dict) else None
        if not isinstance(content, str):
            raise DomainError("Provider returned an invalid message.")

        usage = data.get("usage") if isinstance(data.get("usage"), dict) else {}
        return ProviderResponse(
            content=content,
            model=str(data.get("model", request.model)),
            provider_type=self.provider_type,
            token_input=_int_or_none(usage.get("prompt_tokens")),
            token_output=_int_or_none(usage.get("completion_tokens")),
        )


def _int_or_none(value: object) -> int | None:
    return value if isinstance(value, int) else None


class OpenAICompatibleEmbeddingProviderClient(EmbeddingProviderClient):
    provider_type = "openai_compatible"

    def __init__(self, *, base_url: str, api_key: str, provider_type: str) -> None:
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.provider_type = provider_type

    def embed(self, request: EmbeddingRequest) -> EmbeddingResponse:
        try:
            response = httpx.post(
                f"{self.base_url}/embeddings",
                headers={"Authorization": f"Bearer {self.api_key}"},
                json={"model": request.model, "input": request.input},
                timeout=60,
            )
        except httpx.HTTPError as exc:
            raise DomainError(f"Embedding provider request failed: {exc}") from exc

        if response.status_code >= 400:
            raise DomainError(f"Embedding provider rejected request: {response.text[:300]}")

        data = response.json()
        items = data.get("data")
        if not isinstance(items, list) or not items:
            raise DomainError("Embedding provider returned no vectors.")
        first = items[0]
        embedding = first.get("embedding") if isinstance(first, dict) else None
        if not isinstance(embedding, list) or not all(
            isinstance(value, int | float) for value in embedding
        ):
            raise DomainError("Embedding provider returned an invalid vector.")
        usage = data.get("usage") if isinstance(data.get("usage"), dict) else {}
        return EmbeddingResponse(
            embedding=[float(value) for value in embedding],
            model=str(data.get("model", request.model)),
            provider_type=self.provider_type,
            token_input=_int_or_none(usage.get("prompt_tokens")),
        )
