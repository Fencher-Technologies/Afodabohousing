import logging
import time
import uuid
from collections import defaultdict
from contextlib import asynccontextmanager
from json import dumps

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from config import get_settings
from dependencies.database import get_supabase_client
from routers import (
    auth_router,
    leases_router,
    maintenance_requests_router,
    messages_router,
    payments_router,
    properties_router,
    rental_units_router,
    tenants_router,
    webhooks_router,
)

settings = get_settings()
logging.basicConfig(
    level=logging.INFO,
    format='{"time":"%(asctime)s","level":"%(levelname)s","name":"%(name)s","message":"%(message)s"}',
)
logger = logging.getLogger(__name__)


if settings.sentry_dsn:
    try:
        import sentry_sdk
        sentry_sdk.init(
            dsn=settings.sentry_dsn,
            environment=settings.environment,
            traces_sample_rate=0.25,
            profiles_sample_rate=0.1,
        )
        logger.info("Sentry initialized")
    except Exception as e:
        logger.warning("Failed to initialize Sentry: %s", str(e))


_scheduler_started = False

_metrics: dict = {
    "requests_total": 0,
    "errors_total": 0,
    "requests_by_path": defaultdict(int),
    "latency_buckets": defaultdict(int),
}
LATENCY_BUCKETS = [0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]


class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        start = time.monotonic()
        response = await call_next(request)
        elapsed = time.monotonic() - start
        response.headers["X-Request-ID"] = request_id
        response.headers["X-Response-Time-Ms"] = str(round(elapsed * 1000, 2))

        global _metrics
        _metrics["requests_total"] += 1
        path = request.url.path
        _metrics["requests_by_path"][path] += 1
        for bucket in sorted(LATENCY_BUCKETS):
            if elapsed <= bucket:
                _metrics["latency_buckets"][bucket] += 1
                break
        if response.status_code >= 500:
            _metrics["errors_total"] += 1

        logger.info(
            dumps({
                "request_id": request_id,
                "method": request.method,
                "path": path,
                "status": response.status_code,
                "latency_ms": round(elapsed * 1000, 2),
            })
        )
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app, requests: int = 100, window_seconds: int = 60):
        super().__init__(app)
        self.requests = requests
        self.window = window_seconds
        self._clients: dict[str, list[float]] = {}

    async def dispatch(self, request: Request, call_next):
        if not settings.rate_limit_enabled or request.url.path in ("/health", "/health/ready", "/metrics"):
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        now = time.monotonic()
        cutoff = now - self.window

        if client_ip in self._clients:
            self._clients[client_ip] = [t for t in self._clients[client_ip] if t > cutoff]
            if len(self._clients[client_ip]) >= self.requests:
                logger.warning("Rate limit exceeded for %s", client_ip)
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Too many requests", "retry_after_seconds": self.window},
                )
            self._clients[client_ip].append(now)
        else:
            self._clients[client_ip] = [now]

        return await call_next(request)


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _scheduler_started
    logger.info(f"Starting Rental Management API v{app.version}")
    if settings.environment != "test" and not _scheduler_started:
        try:
            from services.scheduler import start_scheduler, stop_scheduler
            start_scheduler()
            _scheduler_started = True
        except Exception as e:
            logger.warning("Failed to start background scheduler: %s", str(e))
    yield
    if _scheduler_started:
        try:
            from services.scheduler import stop_scheduler
            stop_scheduler()
        except Exception:
            pass
    logger.info("Shutting down Rental Management API")


app = FastAPI(
    title="Rental Management API",
    description="FastAPI backend for Afodabo Housing rental management application",
    version="0.2.0",
    docs_url="/docs" if settings.environment != "production" else None,
    redoc_url="/redoc" if settings.environment != "production" else None,
    lifespan=lifespan,
)

app.add_middleware(RequestIDMiddleware)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Client-Info", "X-Request-ID"],
)
app.add_middleware(RateLimitMiddleware)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    request_id = getattr(request.state, "request_id", "unknown")
    logger.error(
        dumps({
            "request_id": request_id,
            "error": str(exc),
            "path": str(request.url),
            "method": request.method,
        }),
        exc_info=True,
    )
    return JSONResponse(
        status_code=500,
        headers={"X-Request-ID": request_id},
        content={"detail": "Internal server error", "request_id": request_id},
    )


app.include_router(auth_router)
app.include_router(properties_router)
app.include_router(tenants_router)
app.include_router(leases_router)
app.include_router(messages_router)
app.include_router(payments_router)
app.include_router(rental_units_router)
app.include_router(maintenance_requests_router)
app.include_router(webhooks_router)


@app.get("/health")
async def health_check() -> dict:
    return {
        "status": "healthy",
        "version": "0.2.0",
        "environment": settings.environment,
    }


@app.get("/health/ready")
async def readiness_check() -> dict:
    try:
        supabase = get_supabase_client()
        supabase.table("properties").select("id").limit(1).execute()
        db_status = "ready"
    except Exception:
        db_status = "not_ready"

    if db_status != "ready":
        return JSONResponse(
            status_code=503,
            content={"status": "not_ready", "database": db_status},
        )

    return {"status": "ready", "database": db_status}


@app.get("/")
def root() -> dict:
    return {
        "message": "Afodabo Housing API",
        "version": "0.2.0",
        "docs": "/docs",
        "health": "/health",
    }


@app.get("/metrics")
def metrics() -> dict:
    total = _metrics["requests_total"]
    errors = _metrics["errors_total"]
    latencies = dict(sorted(_metrics["latency_buckets"].items()))
    error_rate = round(errors / total, 4) if total > 0 else 0
    top_paths = dict(
        sorted(_metrics["requests_by_path"].items(), key=lambda x: x[1], reverse=True)[:10]
    )
    return {
        "requests_total": total,
        "errors_total": errors,
        "error_rate": error_rate,
        "latency_distribution": latencies,
        "top_paths": top_paths,
    }


@app.get("/api/endpoints")
def list_endpoints() -> dict:
    routes = []
    for route in app.routes:
        if hasattr(route, "methods") and hasattr(route, "path"):
            routes.append({
                "path": route.path,
                "methods": sorted(route.methods - {"HEAD", "OPTIONS"}),
            })
    return {"endpoints": sorted(routes, key=lambda r: r["path"])}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
