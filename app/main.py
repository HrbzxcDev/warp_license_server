from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.database import init_db
from app.routers import licenses

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title="Licensing Server",
    description="API server for managing software license keys",
    version="1.0.0",
    docs_url=None,  # Set to None to disable Swagger UI
    # Disable docs in production by setting docs_url=None, redoc_url=None
    # For now, keep enabled for development
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten this in production if needed
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(licenses.router, prefix="/api/v1", tags=["licenses"])


@app.on_event("startup")
async def startup():
    init_db()


@app.get("/health", tags=["health"])
def health_check():
    return {"status": "ok"}
