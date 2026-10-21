"""Webhook idempotency lives in the database, not in process memory."""

import hashlib
import hmac
import json
from datetime import UTC, datetime, timedelta
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient

from dependencies import get_current_user, get_service_client
from main import app
from services.idempotency import WebhookEvents
from tests.conftest import MockSupabaseClient

KEY = "txn-1"


def _old(seconds: int) -> str:
    return (datetime.now(UTC) - timedelta(seconds=seconds)).isoformat()


class TestClaimLifecycle:
    def test_first_claim_wins_and_a_concurrent_one_is_told_to_wait(self):
        db = MockSupabaseClient()
        first = WebhookEvents(db, "pesapal").claim(KEY)
        second = WebhookEvents(db, "pesapal").claim(KEY)  # a different worker, same database
        assert first.state == "acquired" and first.token
        assert second.state == "busy"

    def test_completed_events_replay_the_stored_response(self):
        db = MockSupabaseClient()
        events = WebhookEvents(db, "pesapal")
        claim = events.claim(KEY)
        events.complete(claim, KEY, {"status": "received", "payment_status": "completed"})

        again = WebhookEvents(db, "pesapal").claim(KEY)
        assert again.state == "done"
        assert again.response == {"status": "received", "payment_status": "completed"}

    def test_release_lets_a_retry_run(self):
        db = MockSupabaseClient()
        events = WebhookEvents(db, "pesapal")
        events.release(events.claim(KEY), KEY)
        assert events.claim(KEY).state == "acquired"

    def test_providers_do_not_collide(self):
        db = MockSupabaseClient()
        assert WebhookEvents(db, "pesapal").claim(KEY).state == "acquired"
        assert WebhookEvents(db, "other").claim(KEY).state == "acquired"

    def test_stale_claim_from_a_dead_worker_is_taken_over_exactly_once(self):
        db = MockSupabaseClient()
        dead = WebhookEvents(db, "pesapal").claim(KEY)
        db.webhook_events[("pesapal", KEY)]["updated_at"] = _old(3600)

        takeover = WebhookEvents(db, "pesapal").claim(KEY)
        assert takeover.state == "acquired" and takeover.token != dead.token
        # The takeover refreshed the claim, so a further retry must wait.
        assert WebhookEvents(db, "pesapal").claim(KEY).state == "busy"

    def test_a_slow_worker_cannot_overwrite_the_worker_that_took_over(self):
        db = MockSupabaseClient()
        slow = WebhookEvents(db, "pesapal")
        old_claim = slow.claim(KEY)
        db.webhook_events[("pesapal", KEY)]["updated_at"] = _old(3600)
        new_claim = WebhookEvents(db, "pesapal").claim(KEY)

        slow.complete(old_claim, KEY, {"stale": True})  # token no longer matches: ignored
        slow.release(old_claim, KEY)                    # ditto: must not delete the new claim
        row = db.webhook_events[("pesapal", KEY)]
        assert row["status"] == "processing" and row["claim_token"] == new_claim.token

    def test_unavailable_store_processes_unguarded_rather_than_dropping_the_payment(self):
        class Broken:
            def table(self, _name):
                raise RuntimeError("connection refused")

        events = WebhookEvents(Broken(), "pesapal")
        claim = events.claim(KEY)
        assert claim.state == "acquired" and claim.token is None
        events.complete(claim, KEY, {})  # no-ops, must not raise
        events.release(claim, KEY)


# ── Through the real endpoint ───────────────────────────────────────────────

@pytest.fixture
def pesapal_secret():
    from config import get_settings

    s = get_settings()
    old = s.pesapal_consumer_secret
    s.pesapal_consumer_secret = "test-secret-key"
    yield s.pesapal_consumer_secret
    s.pesapal_consumer_secret = old


@pytest.fixture
def db(test_user):
    from dependencies.database import _get_cached_client

    _get_cached_client.cache_clear()
    mock = MockSupabaseClient()
    app.dependency_overrides[get_service_client] = lambda: mock
    app.dependency_overrides[get_current_user] = lambda: test_user
    yield mock
    app.dependency_overrides.clear()


def _post_ipn(secret, tracking="txn-9", ref="ref-9"):
    body = json.dumps({"OrderTrackingId": tracking, "OrderMerchantReference": ref, "OrderNotificationType": "IPNCHANGE"})
    sig = hmac.new(secret.encode(), body.encode(), hashlib.sha256).hexdigest()
    return TestClient(app, raise_server_exceptions=False).post(
        "/payments/webhook/pesapal",
        content=body,
        headers={"X-Pesapal-Signature": sig, "Content-Type": "application/json"},
    )


def _gateway(description, amount=500):
    return patch(
        "routers.webhooks.get_transaction_status",
        return_value={"payment_status_description": description, "amount": amount},
    )


class TestPesapalEndpoint:
    def test_a_replay_is_suppressed_even_if_this_process_has_forgotten_everything(self, db, pesapal_secret):
        boost = MagicMock()
        boost.activate_by_reference.return_value = {"id": "boost-1"}
        with patch("routers.webhooks.get_auth_token", return_value="t"), _gateway("COMPLETED") as gts, patch(
            "routers.webhooks.get_boost_service", return_value=boost
        ):
            first = _post_ipn(pesapal_secret)
            # Simulate a restart / another worker: nothing in-process survives.
            import routers.webhooks as wh

            wh._idempotent_keys.clear()
            second = _post_ipn(pesapal_secret)

        assert first.status_code == second.status_code == 200
        assert first.json() == second.json() == {"status": "received", "payment_status": "completed"}
        assert gts.call_count == 1
        boost.activate_by_reference.assert_called_once()

    def test_a_pending_status_is_not_remembered_so_the_final_one_still_lands(self, db, pesapal_secret):
        boost = MagicMock()
        boost.activate_by_reference.return_value = {"id": "boost-1"}
        with patch("routers.webhooks.get_auth_token", return_value="t"), patch(
            "routers.webhooks.get_boost_service", return_value=boost
        ):
            with _gateway("PENDING"):
                assert _post_ipn(pesapal_secret).json()["payment_status"] == "pending"
            boost.activate_by_reference.assert_not_called()

            with _gateway("COMPLETED"):
                assert _post_ipn(pesapal_secret).json()["payment_status"] == "completed"
        boost.activate_by_reference.assert_called_once()

    def test_gateway_failure_returns_503_and_the_retry_is_processed(self, db, pesapal_secret):
        boost = MagicMock()
        boost.activate_by_reference.return_value = {"id": "boost-1"}
        with patch("routers.webhooks.get_auth_token", return_value="t"), patch(
            "routers.webhooks.get_boost_service", return_value=boost
        ):
            with patch("routers.webhooks.get_transaction_status", side_effect=RuntimeError("timeout")):
                assert _post_ipn(pesapal_secret).status_code == 503
            assert not db.webhook_events  # claim released, nothing recorded as done

            with _gateway("COMPLETED"):
                assert _post_ipn(pesapal_secret).status_code == 200
        boost.activate_by_reference.assert_called_once()

    def test_a_crash_while_applying_the_payment_does_not_poison_the_retry(self, db, pesapal_secret):
        boost = MagicMock()
        boost.activate_by_reference.side_effect = [RuntimeError("db hiccup"), {"id": "boost-1"}]
        with patch("routers.webhooks.get_auth_token", return_value="t"), _gateway("COMPLETED"), patch(
            "routers.webhooks.get_boost_service", return_value=boost
        ):
            assert _post_ipn(pesapal_secret).status_code == 500
            assert _post_ipn(pesapal_secret).status_code == 200
        assert boost.activate_by_reference.call_count == 2

    def test_a_delivery_already_in_flight_is_acknowledged_without_a_second_gateway_call(self, db, pesapal_secret):
        WebhookEvents(db, "pesapal").claim("txn-9")  # another worker is mid-way
        with patch("routers.webhooks.get_auth_token", return_value="t"), _gateway("COMPLETED") as gts:
            resp = _post_ipn(pesapal_secret)
        assert resp.status_code == 200
        assert resp.json()["payment_status"] == "processing"
        gts.assert_not_called()

    def test_failed_payments_are_recorded_as_final(self, db, pesapal_secret):
        with patch("routers.webhooks.get_auth_token", return_value="t"), _gateway("FAILED") as gts:
            assert _post_ipn(pesapal_secret).json()["payment_status"] == "failed"
            assert _post_ipn(pesapal_secret).json()["payment_status"] == "failed"
        assert gts.call_count == 1
