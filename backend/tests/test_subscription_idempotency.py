"""Python/RPC boundary tests; transaction behavior is tested in sql/subscription_activation.sql."""
from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from unittest.mock import MagicMock, patch
import pytest
from services.subscriptions import SubscriptionService, reset_plans_cache, derive_subscription

@pytest.fixture(autouse=True)
def reset_cache():
    reset_plans_cache()
    yield
    reset_plans_cache()

def row(**changes):
    return dict(id="sub-1", manager_id="manager-1", plan_id="3mo",
        status="active", payment_status="completed", payment_reference="ref",
        started_at=datetime.now(UTC).isoformat(),
        expires_at=(datetime.now(UTC)+timedelta(days=90)).isoformat(), **changes)

def service(payload):
    db = MagicMock()
    db.rpc.return_value.execute.return_value = SimpleNamespace(data=payload)
    db.table.return_value.select.return_value.execute.return_value = SimpleNamespace(
        data=[{"id":"3mo","name":"Essential","duration_days":90,"price_ugx":40000,"price_usd":10}])
    return SubscriptionService(db), db

def test_gateway_evidence_is_forwarded_to_transaction():
    svc, db = service({"subscription":row(), "activated":False})
    result = svc.confirm_subscription("ref", 41500, "UGX", "tracking")
    assert result.status == "active"
    db.rpc.assert_called_once_with("activate_verified_subscription", {
        "p_reference":"ref","p_tracking_id":"tracking","p_amount":41500,"p_currency":"UGX"})

def test_unknown_reference_is_not_confirmed():
    svc, db = service(None)
    assert svc.confirm_subscription("missing", 10, "USD", "tracking") is None

def test_database_rejection_propagates_for_retry():
    svc, db = service(None)
    db.rpc.return_value.execute.side_effect = RuntimeError("amount mismatch")
    with pytest.raises(RuntimeError, match="amount mismatch"):
        svc.confirm_subscription("ref", 1, "UGX", "tracking")

def test_success_notification_only_for_new_activation():
    svc, db = service({"subscription":row(), "activated":False})
    with patch("services.notifications.notify_admins") as notify:
        svc.confirm_subscription("ref",10,"USD","tracking")
    notify.assert_not_called()

def test_notification_failure_does_not_undo_success():
    svc, db = service({"subscription":row(), "activated":True})
    with patch("services.notifications.notify_admins",side_effect=RuntimeError("offline")):
        assert svc.confirm_subscription("ref",10,"USD","tracking").status=="active"

def test_expired_consumed_order_stays_expired():
    expired=row()
    expired.update(status="expired",expires_at=(datetime.now(UTC)-timedelta(days=1)).isoformat())
    svc, db = service({"subscription":expired,"activated":False})
    assert svc.confirm_subscription("ref",10,"USD","tracking").status=="expired"

def test_days_remaining_rounds_up():
    sub=row()
    sub["expires_at"]=(datetime.now(UTC)+timedelta(hours=4)).isoformat()
    assert derive_subscription(sub,"Essential")["days_remaining"]==1
