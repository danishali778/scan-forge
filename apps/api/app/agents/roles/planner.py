from app.agents.base import Agent
from app.agents.contracts import PlannerOutput, parse_planner_output
from app.integrations.providers import ProviderClient, ProviderMessage, ProviderRequest


class PlannerAgent(Agent):
    role = "planner"

    def __init__(self, *, provider: ProviderClient, model: str) -> None:
        self.provider = provider
        self.model = model

    def run(self, context: dict[str, object]) -> PlannerOutput:
        response = self.provider.complete(
            ProviderRequest(
                model=self.model,
                metadata={"agent_role": self.role},
                messages=[
                    ProviderMessage(
                        role="system",
                        content=(
                            "You are the planner for a defensive security testing workflow. "
                            "Return only JSON with summary and tasks. Each task must include "
                            "title, optional description, and steps."
                        ),
                    ),
                    ProviderMessage(role="user", content=str(context)),
                ],
            )
        )
        output = parse_planner_output(response.content)
        context["provider_response"] = {
            "content": response.content,
            "model": response.model,
            "provider_type": response.provider_type,
            "token_input": response.token_input,
            "token_output": response.token_output,
        }
        return output
