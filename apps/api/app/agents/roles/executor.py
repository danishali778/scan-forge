from app.agents.base import Agent
from app.agents.contracts import ExecutorOutput, parse_executor_output
from app.integrations.providers import ProviderClient, ProviderMessage, ProviderRequest


class ExecutorAgent(Agent):
    role = "executor"

    def __init__(self, *, provider: ProviderClient, model: str) -> None:
        self.provider = provider
        self.model = model

    def run(self, context: dict[str, object]) -> ExecutorOutput:
        response = self.provider.complete(
            ProviderRequest(
                model=self.model,
                metadata={
                    "agent_role": self.role,
                    "has_succeeded_tool_call": bool(context.get("has_succeeded_tool_call")),
                },
                messages=[
                    ProviderMessage(
                        role="system",
                        content=(
                            "You are the executor for a bounded assisted workflow. Return only "
                            "JSON with summary, action, and arguments. Choose exactly one action "
                            "from terminal.execute, file.list, file.read, file.write, "
                            "or step.complete."
                        ),
                    ),
                    ProviderMessage(role="user", content=str(context)),
                ],
            )
        )
        output = parse_executor_output(response.content)
        context["provider_response"] = {
            "content": response.content,
            "model": response.model,
            "provider_type": response.provider_type,
            "token_input": response.token_input,
            "token_output": response.token_output,
        }
        return output
