from fastapi import APIRouter

from app.config import settings
from app.models.response import HealthResponse

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(status="ok", environment=settings.environment)
