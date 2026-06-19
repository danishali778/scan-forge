import json
from typing import Literal

from pydantic import BaseModel, Field, ValidationError

from app.domain.exceptions import DomainError


class PlannerStepOutput(BaseModel):
    title: str
    description: str | None = None


class PlannerTaskOutput(BaseModel):
    title: str
    description: str | None = None
    steps: list[PlannerStepOutput | str] = Field(min_length=1)


class PlannerOutput(BaseModel):
    summary: str | None = None
    tasks: list[PlannerTaskOutput] = Field(min_length=1, max_length=20)


class ExecutorOutput(BaseModel):
    summary: str
    action: Literal[
        "terminal.execute",
        "file.list",
        "file.read",
        "file.write",
        "step.complete",
        "memory.search",
        "memory.propose",
    ]
    arguments: dict[str, object]


class AnalystFindingOutput(BaseModel):
    title: str
    severity: Literal["info", "low", "medium", "high", "critical"] = "medium"
    confidence: Literal["low", "medium", "high"] = "medium"
    affected_assets: list[object] = Field(default_factory=list)
    description: str
    impact: str
    reproduction_steps: str
    remediation: str
    references: list[object] = Field(default_factory=list)


def parse_planner_output(content: str) -> PlannerOutput:
    return _parse_json_model(content, PlannerOutput, label="planner")


def parse_executor_output(content: str) -> ExecutorOutput:
    return _parse_json_model(content, ExecutorOutput, label="executor")


def parse_analyst_output(content: str) -> AnalystFindingOutput:
    return _parse_json_model(content, AnalystFindingOutput, label="analyst")


def _parse_json_model(content: str, model_type, *, label: str):
    try:
        data = json.loads(content)
    except json.JSONDecodeError as exc:
        raise DomainError(f"{label.title()} returned invalid JSON.") from exc
    try:
        return model_type.model_validate(data)
    except ValidationError as exc:
        raise DomainError(f"{label.title()} output did not match the required schema.") from exc
