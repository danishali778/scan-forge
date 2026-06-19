from fastapi import APIRouter

from app.api.routes import (
    analytics,
    api_tokens,
    approvals,
    audit_events,
    auth,
    evidence,
    findings,
    health,
    memory,
    policies,
    projects,
    provider_profiles,
    replay,
    reports,
    sessions,
    targets,
    tools,
    users,
    workspace,
)

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(workspace.router, tags=["workspace"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(api_tokens.router, prefix="/api-tokens", tags=["api tokens"])
api_router.include_router(tools.router, prefix="/tools", tags=["tools"])
api_router.include_router(projects.router, prefix="/projects", tags=["projects"])
api_router.include_router(targets.router, tags=["targets"])
api_router.include_router(sessions.router, prefix="/sessions", tags=["sessions"])
api_router.include_router(replay.router, tags=["session replay"])
api_router.include_router(evidence.router, tags=["evidence"])
api_router.include_router(findings.router, tags=["findings"])
api_router.include_router(reports.router, tags=["reports"])
api_router.include_router(memory.router, tags=["memory"])
api_router.include_router(
    provider_profiles.router,
    prefix="/provider-profiles",
    tags=["provider profiles"],
)
api_router.include_router(policies.router, prefix="/policies", tags=["policies"])
api_router.include_router(approvals.router, prefix="/approvals", tags=["approvals"])
api_router.include_router(audit_events.router, prefix="/audit-events", tags=["audit events"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
