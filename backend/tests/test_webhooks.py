import hashlib
import hmac
import json
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from dependencies import get_current_user, get_service_client
from main import app

UID_ADMIN = "00000000-0000-0000-0000-000000000003"
PID_BOOST = "00000000-0000-0000-0000-000000000070"


@pytest.fixture
def client(test_user, mock_supabase):
    from dependencies.database import _get_cached_client
    _get_cached_client.cache_clear()
    app.dependency_overrides[get_service_client] = lambda: mock_supabase
    app.dependency_overrides[get_current_user] = lambda: None
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

    def test_valid_webhook_updates_payment(self, client, pesapal_secret):
        body = json.dumps({
            "pesapal_transaction_tracking_id": "txn-001",
            "payment_status_description": "COMPLETED",
            "merchant_reference": "ref-001",
        })
        sig = self._sign(body.encode(), pesapal_secret)

        resp = client.post(
            "/payments/webhook/pesapal",
            content=body,
            headers={
                "X-Pesapal-Signature": sig,
                "Content-Type": "application/json",
            },
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == "received"
        assert resp.json()["payment_status"] == "completed"

    def test_rejects_missing_signature(self, client, pesapal_secret):
        body = json.dumps({"pesapal_transaction_tracking_id": "txn-002"})
        resp = client.post(
            "/payments/webhook/pesapal",
            content=body,
            headers={"Content-Type": "application/json"},
        )
        assert resp.status_code == 401

    def test_rejects_bad_signature(self, client, pesapal_secret):
        body = json.dumps({"pesapal_transaction_tracking_id": "txn-003"})
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
        ("FAILED", "failed"),
        ("REFUNDED", "refunded"),
        ("UNKNOWN_STATUS", "pending"),
    ])
    def test_status_mapping(self, client, pesapal_secret, desc, expected):
        body = json.dumps({
            "pesapal_transaction_tracking_id": "txn-status",
            "payment_status_description": desc,
            "merchant_reference": "ref-status",
        })
        sig = self._sign(body.encode(), pesapal_secret)
        resp = client.post(
            "/payments/webhook/pesapal",
            content=body,
            headers={
                "X-Pesapal-Signature": sig,
                "Content-Type": "application/json",
            },
        )
        assert resp.status_code == 200
        assert resp.json()["payment_status"] == expected

    def test_skips_signature_verification_when_secret_not_set(self, client):
        from config import get_settings
        secret = get_settings().pesapal_consumer_secret
        get_settings().pesapal_consumer_secret = ""

        body = json.dumps({
            "pesapal_transaction_tracking_id": "txn-no-secret",
            "payment_status_description": "COMPLETED",
        })
        resp = client.post(
            "/payments/webhook/pesapal",
            content=body,
            headers={"Content-Type": "application/json"},
        )
        assert resp.status_code == 200

        get_settings().pesapal_consumer_secret = secret

    def test_idempotency_returns_cached_response(self, client, pesapal_secret):
        body = json.dumps({
            "pesapal_transaction_tracking_id": "txn-idempotent",
            "payment_status_description": "COMPLETED",
            "merchant_reference": "ref-idempotent",
        })
        sig = self._sign(body.encode(), pesapal_secret)

        resp1 = client.post(
            "/payments/webhook/pesapal",
            content=body,
            headers={
                "X-Pesapal-Signature": sig,
                "Content-Type": "application/json",
                "Idempotency-Key": "key-123",
            },
        )
        assert resp1.status_code == 200

        resp2 = client.post(
            "/payments/webhook/pesapal",
            content=body,
            headers={
                "X-Pesapal-Signature": sig,
                "Content-Type": "application/json",
                "Idempotency-Key": "key-123",
            },
        )
        assert resp2.status_code == 200
        assert resp1.json() == resp2.json()


class TestNylonPayWebhook:
    def test_successful_payment_activates_boost(self, client, mock_supabase):
        mock_supabase.table("property_boosts").insert({
            "property_id": PID_BOOST,
            "manager_id": UID_ADMIN,
            "amount_paid": "70000",
            "duration_days": 7,
            "status": "pending",
            "transaction_id": "ref-nylon-test",
            "payment_method": "nylonpay",
        }).execute()

        with patch("services.nylonpay.verify_webhook_signature", return_value=True):
            resp = client.post(
                "/webhooks/nylonpay",
                json={
                    "event": "transaction.successful",
                    "data": {
                        "reference": "ref-nylon-test",
                        "id": "nylon-txn-001",
                        "status": "completed",
                    },
                },
                headers={
                    "x-nylon-signature": "valid-sig",
                    "Content-Type": "application/json",
                },
            )
        assert resp.status_code == 200
        assert resp.json()["status"] == "received"

    def test_failed_payment(self, client):
        with patch("services.nylonpay.verify_webhook_signature", return_value=True):
            resp = client.post(
                "/webhooks/nylonpay",
                json={
                    "event": "transaction.failed",
                    "data": {
                        "reference": "ref-fail",
                        "id": "nylon-txn-fail",
                        "status": "failed",
                    },
                },
                headers={
                    "x-nylon-signature": "valid-sig",
                    "Content-Type": "application/json",
                },
            )
        assert resp.status_code == 200

    def test_rejects_invalid_signature(self, client):
        with patch("services.nylonpay.verify_webhook", return_value=False):
            resp = client.post(
                "/webhooks/nylonpay",
                json={"event": "transaction.successful", "data": {}},
                headers={
                    "x-nylon-signature": "bad-sig",
                    "Content-Type": "application/json",
                },
            )
        assert resp.status_code == 401


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
