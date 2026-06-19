import uuid

from app.domain.exceptions import NotFoundError


def parse_uuid(value: str, *, field_name: str = "id") -> uuid.UUID:
    try:
        return uuid.UUID(value)
    except ValueError as exc:
        raise NotFoundError(f"Invalid {field_name}.") from exc

