from fastapi import APIRouter

from app.api.routes import commands, health, instances

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(commands.router, tags=["commands"])
api_router.include_router(instances.router, prefix="/instances", tags=["instances"])
