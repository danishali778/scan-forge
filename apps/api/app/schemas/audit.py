from datetime import datetime

from pydantic import BaseModel


class AuditEventResponse(BaseModel):
    id: str
    actor_type: str
    actor_id: str
    action: str
    resource_type: str
    resource_id: str
    before: dict[str, object] | None = None
    after: dict[str, object] | None = None
    metadata: dict[str, object]
    created_at: datetime
