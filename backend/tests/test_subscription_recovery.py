from datetime import UTC, datetime, timedelta
from unittest.mock import AsyncMock, MagicMock, patch
import pytest
from tests.conftest import UID_OWNER
from tests.test_subscription_guard import MANAGER

def payment(status="pending", **changes):
    row={"id":"pending-sub","manager_id":UID_OWNER,"plan_id":"12mo",
         "status":status,"payment_status":status,"payment_reference":"ref-recovery",
         "pesapal_tracking_id":"track-recovery","created_at":datetime.now(UTC).isoformat()}
    row.update(changes)
    return row

@pytest.mark.parametrize("state",["pending","failed"])
def test_current_recovers_unsettled_payments_even_without_active_row(seeded_client,state):
    row=payment(state)
    client=seeded_client(user=MANAGER,seeds={"manager_subscriptions":[row]})
    with patch("routers.payments._reconcile_pesapal_order",new_callable=AsyncMock) as reconcile:
        resp=client.get("/subscriptions/current")
    assert resp.status_code==200
    reconcile.assert_awaited_once()
    assert reconcile.call_args.args[1]["id"]==row["id"]

def test_failed_recovery_preserves_active_access(seeded_client):
    active=payment("active",id="active",payment_status="completed",
                   expires_at=(datetime.now(UTC)+timedelta(days=60)).isoformat())
    client=seeded_client(user=MANAGER,seeds={"manager_subscriptions":[active,payment()]})
    with patch("routers.payments._reconcile_pesapal_order",side_effect=RuntimeError("gateway offline")):
        resp=client.get("/subscriptions/current")
    assert resp.status_code==200
    assert resp.json()["id"]=="active"

def test_other_manager_cannot_poll_or_reconcile_order(seeded_client):
    client=seeded_client(user=MANAGER,seeds={"manager_subscriptions":[payment(manager_id="other")]})
    with patch("routers.payments._reconcile_pesapal_order",new_callable=AsyncMock) as reconcile:
        resp=client.get("/payments/pesapal/status?reference=ref-recovery")
    assert resp.status_code==403
    reconcile.assert_not_called()

@pytest.mark.asyncio
async def test_gateway_reference_mismatch_never_confirms():
    from routers.payments import _reconcile_pesapal_order,_reset_reconcile_cooldowns
    _reset_reconcile_cooldowns()
    db=MagicMock()
    with patch("services.pesapal.get_auth_token",return_value="token"), patch(
        "services.pesapal.get_transaction_status",
        return_value={"merchant_reference":"other","payment_status_description":"COMPLETED","amount":10,"currency":"USD"}
    ), patch("services.subscriptions.get_subscription_service") as svc:
        with pytest.raises(ValueError,match="merchant reference"):
            await _reconcile_pesapal_order(db,payment(),"subscription")
    svc.assert_not_called()

@pytest.mark.asyncio
async def test_failed_order_success_passes_currency_and_tracking_to_confirmation():
    from routers.payments import _reconcile_pesapal_order,_reset_reconcile_cooldowns
    _reset_reconcile_cooldowns()
    db=MagicMock()
    with patch("services.pesapal.get_auth_token",return_value="token"), patch(
        "services.pesapal.get_transaction_status",
        return_value={"merchant_reference":"ref-recovery","payment_status_description":"COMPLETED","amount":41500,"currency":"UGX"}
    ), patch("services.subscriptions.get_subscription_service") as svc:
        assert await _reconcile_pesapal_order(db,payment("failed"),"subscription")
    svc.return_value.confirm_subscription.assert_called_once_with("ref-recovery",41500,"UGX","track-recovery")

@pytest.mark.asyncio
async def test_checkout_stores_exact_converted_quote():
    from models.subscription import SubscriptionCreateRequest
    from routers.subscriptions import create_subscription
    from tests.conftest import MockSupabaseClient, MockTableBuilder
    db=MockSupabaseClient(seeds={"manager_subscriptions":[],
        "profiles":[{"user_id":UID_OWNER,"role":"house_manager","full_name":"Test Manager","email":"test@example.com"}]})
    svc=MagicMock()
    svc.get_plan.return_value={"id":"3mo","name":"Essential","duration_days":90,"price_usd":10,"price_ugx":40000}
    captured=[]
    original=MockTableBuilder.insert
    def capture(self,payload):
        if self._name=="manager_subscriptions":
            captured.append(dict(payload))
        return original(self,payload)
    with patch.object(MockTableBuilder,"insert",capture), patch(
        "routers.subscriptions.charge_amount",return_value=41500
    ), patch("routers.subscriptions.get_auth_token",return_value="token"), patch(
        "routers.subscriptions.get_ipn_id",return_value="ipn"
    ), patch("routers.subscriptions.submit_order",
        return_value={"redirect_url":"https://pay.example.com","order_tracking_id":"track"}) as submit:
        result=await create_subscription(SubscriptionCreateRequest(
            plan_id="3mo",currency="UGX",callback_url="https://example.com"),MANAGER,svc,db)
    assert captured[0]["checkout_amount"]==41500
    assert captured[0]["checkout_currency"]=="UGX"
    assert captured[0]["checkout_duration_days"]==90
    assert submit.call_args.kwargs["amount"]==result.amount==41500
