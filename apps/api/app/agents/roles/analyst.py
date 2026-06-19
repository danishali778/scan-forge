from app.agents.base import Agent
from app.agents.contracts import AnalystFindingOutput, parse_analyst_output
from app.integrations.providers import ProviderClient, ProviderMessage, ProviderRequest


class AnalystAgent(Agent):
    role = "analyst"

    def __init__(self, *, provider: ProviderClient, model: str) -> None:
        self.provider = provider
        self.model = model

    def run(self, context: dict[str, object]) -> AnalystFindingOutput:
        response = self.provider.complete(
            ProviderRequest(
                model=self.model,
                metadata={"agent_role": self.role},
                messages=[
                    ProviderMessage(
                        role="system",
                        content=(
                            "You are an evidence analyst. Return only JSON for a candidate "
                            "finding with title, severity, confidence, affected_assets, "
                            "description, impact, reproduction_steps, remediation, and references. "
                            "Do not mark anything confirmed."
                        ),
                    ),
                    ProviderMessage(role="user", content=str(context)),
                ],
            )
        )
        output = parse_analyst_output(response.content)
        context["provider_response"] = {
            "content": response.content,
            "model": response.model,
            "provider_type": response.provider_type,
            "token_input": response.token_input,
            "token_output": response.token_output,
        }
        return output
