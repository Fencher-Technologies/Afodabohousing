import logging

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from main import RateLimitMiddleware


@pytest.fixture(scope="module", autouse=True)
def _force_rate_limits_enabled():
    from config import get_settings

    s = get_settings()
    previous = s.rate_limit_enabled
    s.rate_limit_enabled = True
    yield
    s.rate_limit_enabled = previous


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


# ── Client identification and memory bounds ─────────────────────────────────

@pytest.fixture
def proxy_hops():
    from config import get_settings

    s = get_settings()
    old = s.trusted_proxy_hops
    yield s
    s.trusted_proxy_hops = old


def _hit(client, xff=None):
    headers = {"X-Forwarded-For": xff} if xff else {}
    return client.get("/normal", headers=headers)


def test_spoofed_forwarded_for_does_not_earn_a_fresh_bucket(proxy_hops):
    """The caller controls the left of X-Forwarded-For; our proxy appends the real address."""
    proxy_hops.trusted_proxy_hops = 1
    client = build_rate_limited_client()  # limit: 3 per window

    # Same real address (the last entry), a different forged one every request.
    statuses = [_hit(client, f"10.0.0.{i}, 203.0.113.7").status_code for i in range(5)]
    assert statuses == [200, 200, 200, 429, 429]


def test_distinct_real_addresses_get_distinct_buckets(proxy_hops):
    proxy_hops.trusted_proxy_hops = 1
    client = build_rate_limited_client()
    for _ in range(3):
        assert _hit(client, "198.51.100.1").status_code == 200
    assert _hit(client, "198.51.100.1").status_code == 429
    assert _hit(client, "198.51.100.2").status_code == 200


def test_header_is_ignored_when_no_proxy_is_trusted(proxy_hops):
    proxy_hops.trusted_proxy_hops = 0
    client = build_rate_limited_client()
    statuses = [_hit(client, f"10.0.0.{i}").status_code for i in range(4)]
    assert statuses == [200, 200, 200, 429]


def test_short_header_falls_back_to_the_socket_address(proxy_hops):
    proxy_hops.trusted_proxy_hops = 2  # expects two proxies, header carries one
    client = build_rate_limited_client()
    statuses = [_hit(client, f"10.0.0.{i}").status_code for i in range(4)]
    assert statuses == [200, 200, 200, 429]


def test_idle_clients_are_swept_so_memory_stays_bounded():
    from main import RateLimitMiddleware

    mw = RateLimitMiddleware(app=None, requests=3, window_seconds=60, auth_window_seconds=60, payment_window_seconds=60)
    mw._clients = {f"ip-{i}": {"global": [1.0]} for i in range(1000)}
    mw._clients["active"] = {"global": [990.0]}
    mw._sweep(now=1000.0)
    assert list(mw._clients) == ["active"]


def test_flood_of_distinct_addresses_cannot_grow_the_table_without_bound(proxy_hops):
    proxy_hops.trusted_proxy_hops = 1
    old = proxy_hops.rate_limit_max_clients
    proxy_hops.rate_limit_max_clients = 5
    try:
        client = build_rate_limited_client()
        for i in range(50):
            _hit(client, f"198.51.100.{i}")
        mw = next(m for m in client.app.user_middleware).kwargs  # the middleware class is configured, not instantiated here
        assert mw["requests"] == 3
        # Walk the built stack to the live instance.
        layer = client.app.middleware_stack
        while layer is not None and not hasattr(layer, "_clients"):
            layer = getattr(layer, "app", None)
        assert layer is not None and len(layer._clients) <= 5 + 1  # tracked clients + the shared overflow bucket
    finally:
        proxy_hops.rate_limit_max_clients = old
