import logging
import time
import uuid
from collections.abc import Awaitable, Callable

from fastapi import Request, Response

from app.core.config import get_settings

logger = logging.getLogger("pentagi.api")


async def request_context_middleware(
    request: Request,
    call_next: Callable[[Request], Awaitable[Response]],
) -> Response:
    settings = get_settings()
    request_id = request.headers.get(settings.request_id_header_name) or str(uuid.uuid4())
    request.state.request_id = request_id

    started = time.perf_counter()
    response = await call_next(request)
    duration_ms = int((time.perf_counter() - started) * 1000)
    response.headers[settings.request_id_header_name] = request_id

    logger.info(
        "request.completed",
        extra={
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "status_code": response.status_code,
            "duration_ms": duration_ms,
        },
    )
    return response

