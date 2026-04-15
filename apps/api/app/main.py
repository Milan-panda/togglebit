import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import create_pool, close_pool
from app.redis import create_redis, close_redis
from app.routes import health, eval, manage, keys, orgs
from app.services.usage import flush_eval_counts_loop


@asynccontextmanager
async def lifespan(app: FastAPI):
    await create_pool()
    await create_redis()
    flush_task = asyncio.create_task(flush_eval_counts_loop())
    yield
    flush_task.cancel()
    try:
        await flush_task
    except asyncio.CancelledError:
        pass
    await close_pool()
    await close_redis()


app = FastAPI(
    title="Togglebit API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.dashboard_url],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(health.router)
app.include_router(eval.router, prefix="/api/v1/eval")
app.include_router(manage.router, prefix="/api/v1/manage")
app.include_router(keys.router, prefix="/api/v1/manage")
app.include_router(orgs.router, prefix="/api/v1/manage")
