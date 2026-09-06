import hashlib
import hmac
import json
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from dependencies import get_current_user, get_service_client
from main import app


@pytest.fixture
def client(test_user, mock_supabase):
    from dependencies.database import _get_cached_client
    _get_cached_client.cache_clear()
    app.dependency_overrides[get_service_client] = lambda: mock_supabase
    # The Pesapal IPN is unauthenticated by design, but /sms/send and
    # /sms/send-reminder now require a manager or super_admin.
    app.dependency_overrides[get_current_user] = lambda: test_user
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def anonymous_client(mock_supabase):
    """Client with no authenticated user — the real guards run."""
    from dependencies.database import _get_cached_client
    _get_cached_client.cache_clear()
    app.dependency_overrides[get_service_client] = lambda: mock_supabase
    yield TestClient(app)
    app.dependency_overrides.clear()


@pytest.fixture
def pesapal_secret():
    from config import get_settings
    s = get_settings()
    old = s.pesapal_consumer_secret
    s.pesapal_consumer_secret = "test-secret-key"
    yield s.pesapal_consumer_secret
    s.pesapal_consumer_secret = old


class TestPesapalWebhook:
    def _sign(self, body: bytes, secret: str) -> str:
        return hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()

    def _ipn(self, tracking_id: str, ref: str) -> str:
        return json.dumps({
            "OrderTrackingId": tracking_id,
            "OrderMerchantReference": ref,
            "OrderNotificationType": "IPNCHANGE",
        })

    def test_completed_calls_get_transaction_status_and_activates(self, client, pesapal_secret):
        body = self._ipn("txn-001", "ref-001")
        sig = self._sign(body.encode(), pesapal_secret)

        boost_svc = MagicMock()
        boost_svc.activate_by_reference.return_value = {"id": "boost-1"}

        with patch("routers.webhooks.get_auth_token", return_value="tok"), patch(
            "routers.webhooks.get_transaction_status",
            return_value={"payment_status_description": "COMPLETED", "amount": 500},
        ) as gts, patch("routers.webhooks.get_boost_service", return_value=boost_svc):
            resp = client.post(
                "/payments/webhook/pesapal",
                content=body,
                headers={"X-Pesapal-Signature": sig, "Content-Type": "application/json"},
            )

        assert resp.status_code == 200
        assert resp.json()["payment_status"] == "completed"
        gts.assert_called_once_with("tok", "txn-001")
        boost_svc.activate_by_reference.assert_called_once_with("ref-001", "txn-001", 500)

    def test_subscription_path_handles_response_object(self, client, pesapal_secret):
        body = self._ipn("txn-sub", "ref-sub")
        sig = self._sign(body.encode(), pesapal_secret)

        boost_svc = MagicMock()
        boost_svc.activate_by_reference.return_value = None

        sub_svc = MagicMock()
        from models.subscription import ManagerSubscriptionResponse
        sub_svc.confirm_subscription.return_value = ManagerSubscriptionResponse(
            id="sub-123",
            manager_id="mgr-1",
            plan_id="plan-1",
            plan_name="1 Month",
            status="active",
            auto_renew=True,
            payment_reference="ref-sub",
            payment_status="completed",
        )

        with patch("routers.webhooks.get_auth_token", return_value="tok"), patch(
            "routers.webhooks.get_transaction_status",
            return_value={"payment_status_description": "COMPLETED", "amount": 10000},
        ) as gts, patch("routers.webhooks.get_boost_service", return_value=boost_svc), patch(
            "routers.webhooks.get_subscription_service", return_value=sub_svc
        ):
            resp = client.post(
                "/payments/webhook/pesapal",
                content=body,
                headers={"X-Pesapal-Signature": sig, "Content-Type": "application/json"},
            )

        assert resp.status_code == 200
        assert resp.json()["payment_status"] == "completed"
        sub_svc.confirm_subscription.assert_called_once_with("ref-sub", 10000)

    def test_pending_does_not_activate(self, client, pesapal_secret):
        body = self._ipn("txn-pending", "ref-pending")
        sig = self._sign(body.encode(), pesapal_secret)

        with patch("routers.webhooks.get_auth_token", return_value="tok"), patch(
            "routers.webhooks.get_transaction_status",
            return_value={"payment_status_description": "PENDING"},
        ) as gts, patch("routers.webhooks.get_boost_service") as gbs:
            resp = client.post(
                "/payments/webhook/pesapal",
                content=body,
                headers={"X-Pesapal-Signature": sig, "Content-Type": "application/json"},
            )

        assert resp.status_code == 200
        assert resp.json()["payment_status"] == "pending"
        gts.assert_called_once_with("tok", "txn-pending")
        gbs.assert_not_called()

    def test_returns_503_when_status_lookup_fails(self, client, pesapal_secret):
        body = self._ipn("txn-down", "ref-down")
        sig = self._sign(body.encode(), pesapal_secret)

        with patch("routers.webhooks.get_auth_token", return_value="tok"), patch(
            "routers.webhooks.get_transaction_status",
            side_effect=RuntimeError("upstream down"),
        ):
            resp = client.post(
                "/payments/webhook/pesapal",
                content=body,
                headers={"X-Pesapal-Signature": sig, "Content-Type": "application/json"},
            )

        assert resp.status_code == 503

    def test_accepts_missing_signature(self, client, pesapal_secret):
        body = self._ipn("txn-002", "ref-002")
        with patch("routers.webhooks.get_auth_token", return_value="tok"), patch(
            "routers.webhooks.get_transaction_status",
            return_value={"payment_status_description": "PENDING"},
        ):
            resp = client.post(
                "/payments/webhook/pesapal",
                content=body,
                headers={"Content-Type": "application/json"},
            )
        assert resp.status_code == 200

    def test_rejects_bad_signature(self, client, pesapal_secret):
        body = self._ipn("txn-003", "ref-003")
        resp = client.post(
            "/payments/webhook/pesapal",
            content=body,
            headers={
                "X-Pesapal-Signature": "bad-signature",
                "Content-Type": "application/json",
            },
        )
        assert resp.status_code == 401

    @pytest.mark.parametrize("desc,expected", [
        ("COMPLETED", "completed"),
        ("PENDING", "pending"),
        ("PROCESSING", "pending"),
        ("FAILED", "failed"),
        ("REVERSED", "failed"),
        ("UNKNOWN_STATUS", "pending"),
    ])
    def test_status_mapping(self, client, pesapal_secret, desc, expected):
        body = self._ipn(f"txn-status-{desc}", "ref-status")
        sig = self._sign(body.encode(), pesapal_secret)

        with patch("routers.webhooks.get_auth_token", return_value="tok"), patch(
            "routers.webhooks.get_transaction_status",
            return_value={"payment_status_description": desc},
        ):
            resp = client.post(
                "/payments/webhook/pesapal",
                content=body,
                headers={"X-Pesapal-Signature": sig, "Content-Type": "application/json"},
            )
        assert resp.status_code == 200
        assert resp.json()["payment_status"] == expected

    def test_skips_signature_verification_when_secret_not_set(self, client):
        from config import get_settings
        secret = get_settings().pesapal_consumer_secret
        get_settings().pesapal_consumer_secret = ""

        body = self._ipn("txn-no-secret", "ref-no-secret")
        with patch("routers.webhooks.get_auth_token", return_value="tok"), patch(
            "routers.webhooks.get_transaction_status",
            return_value={"payment_status_description": "PENDING"},
        ):
            resp = client.post(
                "/payments/webhook/pesapal",
                content=body,
                headers={"Content-Type": "application/json"},
            )
        assert resp.status_code == 200

        get_settings().pesapal_consumer_secret = secret

    def test_idempotency_returns_cached_response(self, client, pesapal_secret):
        body = self._ipn("txn-idempotent", "ref-idempotent")
        sig = self._sign(body.encode(), pesapal_secret)

        with patch("routers.webhooks.get_auth_token", return_value="tok"), patch(
            "routers.webhooks.get_transaction_status",
            return_value={"payment_status_description": "COMPLETED"},
        ) as gts:
            resp1 = client.post(
                "/payments/webhook/pesapal",
                content=body,
                headers={"X-Pesapal-Signature": sig, "Content-Type": "application/json"},
            )
            resp2 = client.post(
                "/payments/webhook/pesapal",
                content=body,
                headers={"X-Pesapal-Signature": sig, "Content-Type": "application/json"},
            )

        assert resp1.status_code == 200
        assert resp2.status_code == 200
        assert resp1.json() == resp2.json()
        assert gts.call_count == 1


class TestSmsWebhook:
    def test_sms_skipped_when_not_configured(self, client):
        from config import get_settings
        old_key = get_settings().sms_provider_api_key
        get_settings().sms_provider_api_key = ""

        resp = client.post(
            "/sms/send",
            json={"to": "+256700000000", "message": "Hello"},
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "skipped"

        get_settings().sms_provider_api_key = old_key

    def test_sms_idempotency_suppresses_duplicates(self, client):
        from config import get_settings
        old_key = get_settings().sms_provider_api_key
        get_settings().sms_provider_api_key = "some-key"

        with patch("httpx.AsyncClient.post") as mock_post:
            mock_post.return_value.status_code = 200
            mock_post.return_value.raise_for_status = lambda: None

            resp1 = client.post(
                "/sms/send",
                json={"to": "+256700000000", "message": "Hello"},
            )
            assert resp1.status_code == 200
            assert resp1.json()["status"] == "sent"

            resp2 = client.post(
                "/sms/send",
                json={"to": "+256700000000", "message": "Hello"},
            )
            assert resp2.status_code == 200
            assert resp2.json()["status"] == "sent"
            assert mock_post.call_count == 1

        get_settings().sms_provider_api_key = old_key


class TestSmsAuthorization:
    """These endpoints were reachable without any credentials at all."""

    def test_sms_send_requires_authentication(self, anonymous_client):
        resp = anonymous_client.post(
            "/sms/send",
            json={"to": "+256700000000", "message": "Hello"},
        )
        assert resp.status_code in (401, 403)

    def test_send_reminder_requires_authentication(self, anonymous_client):
        resp = anonymous_client.post(
            "/sms/send-reminder",
            json={"tenancy_id": "00000000-0000-0000-0000-000000000030", "message": "Rent due"},
        )
        assert resp.status_code in (401, 403)

    def test_admin_regions_requires_authentication(self, anonymous_client):
        """_require_admin was a no-op `pass`, and these routes use the
        service-role client, which bypasses RLS entirely."""
        assert anonymous_client.get("/admin/regions/pending").status_code in (401, 403)
        assert anonymous_client.post("/admin/regions/sync", json={}).status_code in (401, 403)
