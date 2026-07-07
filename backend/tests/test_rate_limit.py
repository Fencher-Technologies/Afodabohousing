import logging

from fastapi import FastAPI
from fastapi.testclient import TestClient

from main import RateLimitMiddleware


def build_rate_limited_client() -> TestClient:
    app = FastAPI()
    app.add_middleware(
        RateLimitMiddleware,
        requests=3,
        window_seconds=60,
        auth_requests=2,
        auth_window_seconds=60,
        payment_requests=2,
        payment_window_seconds=60,
    )

    @app.get("/normal")
    def normal():
        return {"ok": True}

    @app.post("/auth/signin")
    def signin():
        return {"ok": True}

    @app.post("/payments")
    def payments():
        return {"ok": True}

    @app.get("/health")
    def health():
        return {"ok": True}

    return TestClient(app)


def assert_rate_limit_headers(response, *, limit: str, policy: str) -> None:
    assert response.headers["retry-after"].isdigit()
    assert response.headers["x-ratelimit-limit"] == limit
    assert response.headers["x-ratelimit-remaining"] == "0"
    assert response.headers["x-ratelimit-reset"].isdigit()
    assert response.headers["x-ratelimit-policy"] == policy


def test_global_rate_limit_returns_429_with_headers(caplog):
    client = build_rate_limited_client()

    assert client.get("/normal").status_code == 200
    assert client.get("/normal").status_code == 200
    assert client.get("/normal").status_code == 200

    with caplog.at_level(logging.WARNING):
        response = client.get("/normal")

    assert response.status_code == 429
    assert response.json()["error"] == "rate_limit_exceeded"
    assert response.json()["policy"] == "global"
    assert_rate_limit_headers(response, limit="3", policy="global")
    assert "Rate limit exceeded" in caplog.text
    assert "policy=global" in caplog.text


def test_auth_paths_use_stricter_rate_limit():
    client = build_rate_limited_client()

    assert client.post("/auth/signin").status_code == 200
    assert client.post("/auth/signin").status_code == 200
    response = client.post("/auth/signin")

    assert response.status_code == 429
    assert response.json()["policy"] == "auth"
    assert_rate_limit_headers(response, limit="2", policy="auth")


def test_payment_paths_use_stricter_rate_limit():
    client = build_rate_limited_client()

    assert client.post("/payments").status_code == 200
    assert client.post("/payments").status_code == 200
    response = client.post("/payments")

    assert response.status_code == 429
    assert response.json()["policy"] == "payments"
    assert_rate_limit_headers(response, limit="2", policy="payments")


def test_health_is_exempt_from_rate_limit():
    client = build_rate_limited_client()

    for _ in range(8):
        response = client.get("/health")
        assert response.status_code == 200
        assert "x-ratelimit-limit" not in response.headers
