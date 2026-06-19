from typing import Any

from pydantic import BaseModel, Field


class RealtimeEvent(BaseModel):
    type: str = "session.event"
    event_id: str
    session_id: str
    event_type: str
    payload: dict[str, Any] = Field(default_factory=dict)

