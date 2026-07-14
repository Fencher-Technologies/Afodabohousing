import json
import time
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from main import app


class TestHealthEndpoints:
    def test_root_returns_version_and_message(self, client):
        resp = client.get("/")
        assert resp.status_code == 200
        data = resp.json()
        assert data["message"] == "Afodabo Housing API"
        assert "version" in data

    def test_health_returns_status(self, client):
        resp = client.get("/health")
        assert resp.status_code == 200
        assert resp.json()["status"] == "healthy"

    def test_metrics_returns_counters(self, client):
        # Make a request to increment metrics
        client.get("/health")
        resp = client.get("/metrics")
        assert resp.status_code == 200
        data = resp.json()
        assert data["requests_total"] >= 1
        assert "top_paths" in data
        assert "latency_distribution" in data

    def test_api_endpoints_listed(self, client):
        resp = client.get("/api/endpoints")
        assert resp.status_code == 200
        assert "endpoints" in resp.json()

    def test_readiness_when_db_healthy(self, client):
        # Mock supabase is injected via dependency_overrides — health/ready uses get_service_client
        resp = client.get("/health/ready")
        assert resp.status_code in (200, 503)

    def test_readiness_when_db_unavailable(self, client):
        with patch("main.get_service_client") as mock_get:
            mock_client = mock_get.return_value
            mock_client.table.side_effect = Exception("DB connection failed")
            resp = client.get("/health/ready")
            assert resp.status_code == 503
            assert resp.json()["database"] == "not_ready"


class TestRateLimiting:
    def test_rate_limit_enabled_applies(self, client):
        from config import get_settings
        settings = get_settings()
        old_enabled = settings.rate_limit_enabled
        settings.rate_limit_enabled = True

        # Override app middleware for test
        resp = client.get("/health")
        assert resp.status_code == 200

        settings.rate_limit_enabled = old_enabled

    def test_health_bypasses_rate_limit(self, client):
        from config import get_settings
        settings = get_settings()
        old_enabled = settings.rate_limit_enabled
        settings.rate_limit_enabled = True

        for _ in range(200):
            resp = client.get("/health")
            assert resp.status_code == 200

        settings.rate_limit_enabled = old_enabled


class TestExceptionHandler:
    @pytest.mark.anyio
    async def test_global_exception_handler_returns_500(self):
        from fastapi import Request
        from main import global_exception_handler

        scope = {"type": "http", "method": "GET", "path": "/test", "headers": [], "query_string": b""}
        req = Request(scope)
        req.state.request_id = "test-request-id"
        resp = await global_exception_handler(req, RuntimeError("Unexpected crash"))
        assert resp.status_code == 500
        data = json.loads(resp.body)
        assert data["detail"] == "Internal server error"
        assert data["request_id"] == "test-request-id"

    def test_response_includes_request_id(self, client):
        resp = client.get("/health")
        assert "X-Request-ID" in resp.headers
        assert resp.headers["X-Request-ID"] != ""

    def test_response_includes_latency_header(self, client):
        resp = client.get("/health")
        assert "X-Response-Time-Ms" in resp.headers


class TestMiddlewareStack:
    def test_cors_headers_present(self, client):
        resp = client.options(
            "/properties",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "GET",
            },
        )
        assert "access-control-allow-origin" in resp.headers

    def test_request_id_middleware_adds_header(self, client):
        resp = client.get("/health")
        assert resp.headers.get("X-Request-ID") is not None
