from abc import ABC, abstractmethod
from typing import Any


class Agent(ABC):
    role: str

    @abstractmethod
    def run(self, context: dict[str, Any]) -> dict[str, Any]:
        """Run one agent turn and return structured output."""

