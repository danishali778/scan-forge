import json
import math
from hashlib import sha256

from app.integrations.providers.base import (
    EmbeddingProviderClient,
    EmbeddingRequest,
    EmbeddingResponse,
    ProviderClient,
    ProviderRequest,
    ProviderResponse,
)


class FakeProviderClient(ProviderClient):
    provider_type = "fake"

    def complete(self, request: ProviderRequest) -> ProviderResponse:
        agent_role = str(request.metadata.get("agent_role", "executor"))
        if agent_role == "planner":
            content = json.dumps(
                {
                    "summary": "Fake provider generated a safe assisted plan.",
                    "tasks": [
                        {
                            "title": "Prepare runtime workspace",
                            "description": "Create a small workspace script and verify execution.",
                            "steps": [
                                {
                                    "title": "Create a harmless runtime check",
                                    "description": "Use the terminal to confirm the runtime works.",
                                },
                                {
                                    "title": "Record execution result",
                                    "description": "Summarize the completed runtime check.",
                                },
                            ],
                        }
                    ],
                }
            )
        elif agent_role == "analyst":
            content = json.dumps(
                {
                    "title": "Candidate runtime execution observation",
                    "severity": "low",
                    "confidence": "medium",
                    "affected_assets": ["runtime"],
                    "description": "Runtime command output was captured as reviewable evidence.",
                    "impact": "The observation demonstrates the evidence and reporting pipeline.",
                    "reproduction_steps": "Review the linked terminal evidence from the session.",
                    "remediation": "No remediation is required for this smoke-test candidate.",
                    "references": [],
                }
            )
        elif bool(request.metadata.get("has_succeeded_tool_call")):
            content = json.dumps(
                {
                    "summary": "The runtime check finished, so the step can be completed.",
                    "action": "step.complete",
                    "arguments": {"summary": "Runtime command completed successfully."},
                }
            )
        else:
            content = json.dumps(
                {
                    "summary": "Request approval for a harmless terminal command.",
                    "action": "terminal.execute",
                    "arguments": {
                        "command": ["python", "-c", "print('hello from agent')"],
                        "cwd": "/workspace",
                        "timeout_seconds": 60,
                        "max_output_bytes": 200000,
                    },
                }
            )
        return ProviderResponse(
            content=content,
            model=request.model,
            provider_type=self.provider_type,
            token_input=25,
            token_output=25,
        )


class FakeEmbeddingProviderClient(EmbeddingProviderClient):
    provider_type = "fake"

    def __init__(self, *, dimensions: int) -> None:
        self.dimensions = dimensions

    def embed(self, request: EmbeddingRequest) -> EmbeddingResponse:
        values: list[float] = []
        seed = request.input.encode("utf-8")
        counter = 0
        while len(values) < self.dimensions:
            digest = sha256(seed + counter.to_bytes(4, "big")).digest()
            for byte in digest:
                values.append((byte / 127.5) - 1.0)
                if len(values) == self.dimensions:
                    break
            counter += 1
        norm = math.sqrt(sum(value * value for value in values)) or 1.0
        return EmbeddingResponse(
            embedding=[value / norm for value in values],
            model=request.model,
            provider_type=self.provider_type,
            token_input=max(1, len(request.input.split())),
        )
