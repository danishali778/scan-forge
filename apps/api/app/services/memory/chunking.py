from app.core.config import Settings


def chunk_text(content: str, *, settings: Settings) -> list[str]:
    max_chars = max(200, settings.memory_chunk_max_chars)
    overlap = min(max(settings.memory_chunk_overlap_chars, 0), max_chars // 2)
    text = content.strip()
    if not text:
        return []
    chunks = []
    start = 0
    while start < len(text):
        end = min(len(text), start + max_chars)
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end == len(text):
            break
        start = max(end - overlap, start + 1)
    return chunks
