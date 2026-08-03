# mypy: ignore-errors
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from dependencies import require_super_admin
from main import app
from services.pesapal import get_ipn_id, register_ipn_for_url

IPN_URL = "https://abc123.ngrok-free.app/payments/webhook/pesapal"


def fake_supabase():
    return MagicMock()


# ── services.pesapal unit tests ──


def test_get_ipn_id_raises_when_not_registered():
    with patch("services.pesapal._get_stored_ipn", return_value=None):
        with pytest.raises(RuntimeError, match="register"):
            get_ipn_id(fake_supabase())


def test_get_ipn_id_returns_stored():
    with patch(
        "services.pesapal._get_stored_ipn",
        return_value={"environment": "sandbox", "ipn_url": IPN_URL, "ipn_id": "ipn-1"},
    ):
        assert get_ipn_id(fake_supabase()) == "ipn-1"


@pytest.mark.asyncio
async def test_register_reuses_existing_ipn():
    with patch("services.pesapal.get_auth_token", return_value="tok"), patch(
        "services.pesapal.get_ipn_list", return_value=[{"ipn_id": "ipn-1", "url": IPN_URL}]
    ), patch("services.pesapal.register_ipn") as reg, patch(
        "services.pesapal._store_ipn"
    ) as store:
        result = await register_ipn_for_url(fake_supabase(), IPN_URL)

    reg.assert_not_called()
    store.assert_called_once()
    assert result == {"ipn_id": "ipn-1", "ipn_url": IPN_URL, "status": "reused"}


@pytest.mark.asyncio
async def test_register_registers_new_ipn():
    with patch("services.pesapal.get_auth_token", return_value="tok"), patch(
        "services.pesapal.get_ipn_list", return_value=[]
    ), patch("services.pesapal.register_ipn", return_value="ipn-new") as reg, patch(
        "services.pesapal._store_ipn"
    ) as store:
        result = await register_ipn_for_url(fake_supabase(), IPN_URL)

    reg.assert_called_once_with("tok", IPN_URL)
    store.assert_called_once()
    assert result == {"ipn_id": "ipn-new", "ipn_url": IPN_URL, "status": "registered"}


@pytest.mark.asyncio
async def test_register_propagates_failure_and_stores_nothing():
    with patch("services.pesapal.get_auth_token", return_value="tok"), patch(
        "services.pesapal.get_ipn_list", return_value=[]
    ), patch(
        "services.pesapal.register_ipn", side_effect=RuntimeError("bad credentials")
    ) as reg, patch("services.pesapal._store_ipn") as store:
        with pytest.raises(RuntimeError, match="bad credentials"):
            await register_ipn_for_url(fake_supabase(), IPN_URL)

    reg.assert_called_once()
    store.assert_not_called()


# ── admin endpoint tests ──


def test_register_ipn_endpoint_requires_super_admin(client: TestClient):
    resp = client.post("/admin/pesapal/register-ipn", json={"ipn_url": IPN_URL})
    assert resp.status_code == 403


def test_register_ipn_endpoint_reuses(client: TestClient):
    app.dependency_overrides[require_super_admin] = lambda: MagicMock(role="super_admin")
    try:
        with patch(
            "routers.admin.register_ipn_for_url",
            new=AsyncMock(
                return_value={"ipn_id": "ipn-1", "ipn_url": IPN_URL, "status": "reused"}
            ),
        ):
            resp = client.post("/admin/pesapal/register-ipn", json={"ipn_url": IPN_URL})
        assert resp.status_code == 200
        body = resp.json()
        assert body["ipn_id"] == "ipn-1"
        assert body["status"] == "reused"
    finally:
        app.dependency_overrides.pop(require_super_admin, None)


def test_register_ipn_endpoint_surfaces_error(client: TestClient):
    app.dependency_overrides[require_super_admin] = lambda: MagicMock(role="super_admin")
    try:
        with patch(
            "routers.admin.register_ipn_for_url",
            new=AsyncMock(side_effect=RuntimeError("Pesapal auth failed")),
        ):
            resp = client.post("/admin/pesapal/register-ipn", json={"ipn_url": IPN_URL})
        assert resp.status_code == 502
        assert "Pesapal auth failed" in resp.json()["detail"]
    finally:
        app.dependency_overrides.pop(require_super_admin, None)
