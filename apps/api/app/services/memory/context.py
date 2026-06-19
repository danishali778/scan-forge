from app.core.config import Settings
from app.domain.exceptions import DomainError
from app.integrations.providers import EmbeddingRequest
from app.repositories.control_plane import ConfigurationRepository
from app.repositories.memory import MemoryRepository
from app.services.memory.providers import load_embedding_provider


def scoped_memory_context(
    *,
    memory_repository: MemoryRepository,
    configuration_repository: ConfigurationRepository,
    settings: Settings,
    session,
    query: str,
    limit: int | None = None,
) -> list[dict[str, object]]:
    if session.provider_profile_id is None:
        return []
    try:
        provider = load_embedding_provider(
            repository=configuration_repository,
            workspace_id=session.workspace_id,
            provider_profile_id=session.provider_profile_id,
            settings=settings,
        )
        response = provider.client.embed(EmbeddingRequest(input=query, model=provider.model))
        if len(response.embedding) != settings.memory_embedding_dimensions:
            return []
        rows = memory_repository.search(
            workspace_id=session.workspace_id,
            query_embedding=response.embedding,
            project_id=session.project_id,
            session_id=session.id,
            visibility=["session", "project", "workspace"],
            limit=limit or settings.memory_search_default_limit,
            embedding_model=response.model,
        )
    except DomainError:
        return []

    return [
        {
            "document_id": str(row.document.id),
            "chunk_id": str(row.chunk.id),
            "title": row.document.title,
            "summary": row.document.summary,
            "content": row.chunk.content,
            "visibility": row.document.visibility,
            "score": row.score,
            "source_type": row.document.source_type,
        }
        for row in rows
    ]
