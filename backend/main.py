import logging
import time
import uuid
from collections import defaultdict
from contextlib import asynccontextmanager
from json import dumps
from math import ceil

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from config import get_settings
from dependencies.database import get_service_client, get_supabase_client
from routers import (
    admin_router,
    agreements_router,
    auth_router,
    boosts_router,
    exports_router,
    leases_router,
    maintenance_requests_router,
    managers_router,
    messages_router,
    payments_router,
    properties_router,
    rental_units_router,
    subscriptions_router,
    tenants_router,
    uploads_router,
    webhooks_router,
)
from services.observability import (
    capture_sentry_exception,
    init_sentry,
    set_sentry_request_context,
)

settings = get_settings()
logging.basicConfig(
    level=logging.INFO,
    format='{"time":"%(asctime)s","level":"%(levelname)s","name":"%(name)s","message":"%(message)s"}',
)
logger = logging.getLogger(__name__)


init_sentry()


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
        set_sentry_request_context(request_id, request.method, request.url.path)
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
    def __init__(
        self,
        app,
        requests: int = 100,
        window_seconds: int = 60,
        auth_requests: int = 10,
        auth_window_seconds: int = 60,
        payment_requests: int = 30,
        payment_window_seconds: int = 60,
    ):
        super().__init__(app)
        self.requests = requests
        self.window = window_seconds
        self.auth_requests = auth_requests
        self.auth_window = auth_window_seconds
        self.payment_requests = payment_requests
        self.payment_window = payment_window_seconds
        self._clients: dict[str, dict[str, list[float]]] = {}

    def _client_key(self, request: Request) -> str:
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",", 1)[0].strip()
        return request.client.host if request.client else "unknown"

    def _policy_for_path(self, path: str) -> tuple[str, int, int]:
        auth_paths = {
            "/login",
            "/register",
            "/auth/signin",
            "/auth/signin/form",
            "/auth/signup",
        }
        if path in auth_paths:
            return "auth", self.auth_requests, self.auth_window
        if path.startswith("/payments"):
            return "payments", self.payment_requests, self.payment_window
        return "global", self.requests, self.window

    def _headers(
        self,
        *,
        limit: int,
        remaining: int,
        reset_at: float,
        policy: str,
        now: float,
    ) -> dict[str, str]:
        retry_after = max(0, ceil(reset_at - now))
        return {
            "Retry-After": str(retry_after),
            "X-RateLimit-Limit": str(limit),
            "X-RateLimit-Remaining": str(max(0, remaining)),
            "X-RateLimit-Reset": str(ceil(time.time() + retry_after)),
            "X-RateLimit-Policy": policy,
        }

    async def dispatch(self, request: Request, call_next):
        if not settings.rate_limit_enabled or request.url.path in ("/health", "/health/ready", "/metrics"):
            return await call_next(request)

        policy, limit, window = self._policy_for_path(request.url.path)
        client_ip = self._client_key(request)
        now = time.monotonic()
        cutoff = now - window
        client_buckets = self._clients.setdefault(client_ip, {})
        bucket = [timestamp for timestamp in client_buckets.get(policy, []) if timestamp > cutoff]
        reset_at = (min(bucket) + window) if bucket else (now + window)

        if len(bucket) >= limit:
            headers = self._headers(
                limit=limit,
                remaining=0,
                reset_at=reset_at,
                policy=policy,
                now=now,
            )
            logger.warning(
                "Rate limit exceeded for %s on %s with policy=%s limit=%s window=%ss",
                client_ip,
                request.url.path,
                policy,
                limit,
                window,
            )
            return JSONResponse(
                status_code=429,
                headers=headers,
                content={
                    "detail": "Too many requests",
                    "error": "rate_limit_exceeded",
                    "limit": limit,
                    "policy": policy,
                    "retry_after_seconds": int(headers["Retry-After"]),
                    "window_seconds": window,
                },
            )

        bucket.append(now)
        client_buckets[policy] = bucket
        response = await call_next(request)
        response.headers.update(
            self._headers(
                limit=limit,
                remaining=limit - len(bucket),
                reset_at=reset_at,
                policy=policy,
                now=now,
            )
        )
        return response


def _error_response(
    *,
    request_id: str,
    status_code: int,
    detail: str,
    error: str,
    extra: dict | None = None,
    headers: dict[str, str] | None = None,
) -> JSONResponse:
    payload = {
        "detail": detail,
        "error": error,
        "request_id": request_id,
        "status_code": status_code,
    }
    if extra:
        payload.update(extra)

    response_headers = {"X-Request-ID": request_id}
    if headers:
        response_headers.update(headers)

    return JSONResponse(status_code=status_code, headers=response_headers, content=payload)


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
app.add_middleware(
    RateLimitMiddleware,
    requests=settings.rate_limit_requests,
    window_seconds=settings.rate_limit_window_seconds,
    auth_requests=settings.auth_rate_limit_requests,
    auth_window_seconds=settings.auth_rate_limit_window_seconds,
    payment_requests=settings.payment_rate_limit_requests,
    payment_window_seconds=settings.payment_rate_limit_window_seconds,
)


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    request_id = getattr(request.state, "request_id", "unknown")
    capture_sentry_exception(exc)
    logger.error(
        dumps({
            "request_id": request_id,
            "error": str(exc),
            "path": str(request.url),
            "method": request.method,
        }),
        exc_info=True,
    )
    return _error_response(
        request_id=request_id,
        status_code=500,
        detail="Internal server error",
        error="internal_server_error",
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    request_id = getattr(request.state, "request_id", "unknown")
    if exc.status_code >= 500:
        capture_sentry_exception(exc)

    return _error_response(
        request_id=request_id,
        status_code=exc.status_code,
        detail=str(exc.detail),
        error="http_exception",
        headers=dict(exc.headers or {}),
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    request_id = getattr(request.state, "request_id", "unknown")
    return _error_response(
        request_id=request_id,
        status_code=422,
        detail="Request validation failed",
        error="validation_error",
        extra={"errors": exc.errors()},
    )


app.include_router(admin_router)
app.include_router(auth_router)
app.include_router(exports_router)
app.include_router(boosts_router)
app.include_router(agreements_router)
app.include_router(properties_router)
app.include_router(subscriptions_router)
app.include_router(tenants_router)
app.include_router(leases_router)
app.include_router(managers_router)
app.include_router(messages_router)
app.include_router(payments_router)
app.include_router(rental_units_router)
app.include_router(maintenance_requests_router)
app.include_router(uploads_router)
app.include_router(webhooks_router)


@app.get("/health")
async def health_check() -> dict:
    return {
        "status": "healthy",
        "version": "0.2.0",
        "environment": settings.environment,
    }


@app.get("/health/ready", response_model=None)
async def readiness_check() -> dict[str, str] | JSONResponse:
    try:
        supabase = get_service_client()
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
