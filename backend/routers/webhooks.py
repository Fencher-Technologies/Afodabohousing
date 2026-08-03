import hashlib
import json
import logging
import time
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, Field
from supabase import Client

from config import get_settings
from dependencies import get_service_client
from services.boost import get_boost_service
from services.notifications import notify
from services.pesapal import (
    get_auth_token,
    get_transaction_status,
)
from services.pesapal import (
    verify_webhook as verify_pesapal,
)
from services.subscriptions import get_subscription_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="", tags=["webhooks"])

settings = get_settings()

_idempotent_keys: dict[str, dict[str, Any]] = {}
IDEMPOTENCY_TTL = 86400


def _check_idempotency(key: str) -> dict[str, Any] | None:
    record = _idempotent_keys.get(key)
    if record and (time.time() - record["timestamp"]) < IDEMPOTENCY_TTL:
        return record["response"]
    return None


def _set_idempotency(key: str, response: dict[str, Any]) -> None:
    _idempotent_keys[key] = {"timestamp": time.time(), "response": response}
    cutoff = time.time() - IDEMPOTENCY_TTL
    for k in list(_idempotent_keys.keys()):
        if _idempotent_keys[k]["timestamp"] < cutoff:
            del _idempotent_keys[k]


class PesapalWebhookPayload(BaseModel):
    """Pesapal IPN payload — carries order ids only, NO payment status.

    The real status is fetched via GetTransactionStatus using order_tracking_id.
    """

    order_tracking_id: str = Field(validation_alias="OrderTrackingId")
    order_merchant_reference: str = Field(validation_alias="OrderMerchantReference")
    order_notification_type: str | None = Field(default=None, validation_alias="OrderNotificationType")


PESAPAL_STATUS_MAP = {
    "COMPLETED": "completed",
    "PENDING": "pending",
    "PROCESSING": "pending",
    "FAILED": "failed",
    "REVERSED": "failed",
    "EXPIRED": "failed",
    "INVALID": "failed",
}


class SmsSendRequest(BaseModel):
    to: str
    message: str


class SmsSendResponse(BaseModel):
    status: str
    message: str


@router.post("/payments/webhook/pesapal", status_code=status.HTTP_200_OK)
async def pesapal_webhook(
    request: Request,
    supabase: Client = Depends(get_service_client),
):
    body = await request.body()
    signature = request.headers.get("X-Pesapal-Signature")

    if not verify_pesapal(body, signature):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid signature",
        )

    payload = PesapalWebhookPayload.model_validate(json.loads(body))
    tracking_id = payload.order_tracking_id
    merchant_ref = payload.order_merchant_reference

    # Idempotency: Pesapal may retry; only process each tracking id once.
    idempotency_key = f"pesapal:{tracking_id}"
    cached = _check_idempotency(idempotency_key)
    if cached:
        logger.info("Duplicate Pesapal IPN suppressed for txn=%s", tracking_id)
        return cached

    logger.info(
        "Pesapal IPN received: txn=%s ref=%s type=%s",
        tracking_id, merchant_ref, payload.order_notification_type,
    )

    # The IPN payload has no payment status — GetTransactionStatus is the
    # source of truth. If it fails, return 200 anyway; Pesapal retries.
    payment_status = "pending"
    try:
        token = await get_auth_token()
        status_data = await get_transaction_status(token, tracking_id)
        payment_status = PESAPAL_STATUS_MAP.get(
            (status_data.get("payment_status_description") or "").upper(),
            "pending",
        )
        logger.info(
            "Pesapal txn=%s status_description=%s -> %s",
            tracking_id, status_data.get("payment_status_description"), payment_status,
        )
    except Exception as e:
        logger.error("GetTransactionStatus failed for txn=%s: %s", tracking_id, str(e))

    if payment_status == "completed":
        boost_svc = get_boost_service(supabase)
        activated = boost_svc.activate_by_reference(merchant_ref, tracking_id)
        if activated:
            logger.info("Boost %s activated via Pesapal webhook", activated["id"])
        else:
            sub_svc = get_subscription_service(supabase)
            sub_activated = sub_svc.confirm_subscription(merchant_ref)
            if sub_activated:
                logger.info("Subscription %s activated via Pesapal webhook", sub_activated["id"])
            else:
                result = (
                    supabase.table("payments")
                    .update({"status": "completed", "transaction_id": tracking_id})
                    .eq("transaction_id", merchant_ref)
                    .execute()
                )
                if not result.data:
                    logger.warning("No payment, boost, or subscription found for merchant_reference %s", merchant_ref)
    elif payment_status == "failed":
        boost_svc = get_boost_service(supabase)
        boost_service_table = boost_svc.table if hasattr(boost_svc, 'table') else supabase.table("property_boosts")
        boost_service_table.update({"status": "failed"}).eq("transaction_id", merchant_ref).eq("status", "pending").execute()
        sub_svc = get_subscription_service(supabase)
        sub_svc.supabase.table("manager_subscriptions").update(
            {"status": "failed", "payment_status": "failed"}
        ).eq("payment_reference", merchant_ref).eq("status", "pending").execute()
        supabase.table("payments").update({"status": "failed"}).eq("transaction_id", merchant_ref).execute()

    response = {"status": "received", "payment_status": payment_status}
    _set_idempotency(idempotency_key, response)
    return response


@router.post("/sms/send", response_model=SmsSendResponse)
async def send_sms(
    data: SmsSendRequest,
    supabase: Client = Depends(get_service_client),
):
    if not settings.sms_provider_api_key:
        logger.warning("SMS_PROVIDER_API_KEY not set — SMS dispatch disabled")
        return SmsSendResponse(status="skipped", message="SMS provider not configured")

    idempotency_key = f"sms:{hashlib.sha256(f'{data.to}:{data.message}'.encode()).hexdigest()}"
    cached = _check_idempotency(idempotency_key)
    if cached:
        logger.info("Duplicate SMS request suppressed for %s", data.to)
        return SmsSendResponse(**cached)

    logger.info("Sending SMS to %s: %.80s", data.to, data.message)

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                settings.sms_provider_url,
                json={
                    "to": data.to,
                    "message": data.message,
                    "api_key": settings.sms_provider_api_key,
                },
            )
            resp.raise_for_status()
    except Exception as e:
        logger.error("Failed to send SMS to %s: %s", data.to, str(e), exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"SMS delivery failed: {str(e)}",
        )

    response = SmsSendResponse(status="sent", message="SMS queued for delivery")
    _set_idempotency(idempotency_key, response.model_dump())
    return response


class SendReminderRequest(BaseModel):
    tenancy_id: str
    message: str


class SendReminderResponse(BaseModel):
    sms_status: str
    notification: bool


@router.post("/sms/send-reminder", response_model=SendReminderResponse)
def send_rent_reminder(
    data: SendReminderRequest,
    supabase: Client = Depends(get_service_client),
) -> SendReminderResponse:
    lease = supabase.table("leases").select("*, tenants!inner(user_id, phone)").eq("id", data.tenancy_id).execute()
    if not lease.data:
        raise HTTPException(status_code=404, detail="Tenancy not found")

    lease_data = lease.data[0]
    tenant_user_id = lease_data.get("tenants", {}).get("user_id")
    tenant_phone = lease_data.get("tenants", {}).get("phone")

    sms_sent = False
    if tenant_phone and settings.sms_provider_api_key:
        try:
            idempotency_key = f"sms:{hashlib.sha256(f'{tenant_phone}:{data.message}'.encode()).hexdigest()}"
            cached = _check_idempotency(idempotency_key)
            if not cached:
                with httpx.Client(timeout=15) as client:
                    resp = client.post(
                        settings.sms_provider_url,
                        json={
                            "to": tenant_phone,
                            "message": data.message,
                            "api_key": settings.sms_provider_api_key,
                        },
                    )
                    resp.raise_for_status()
                _set_idempotency(idempotency_key, {"status": "sent", "message": "SMS queued for delivery"})
            sms_sent = True
        except Exception as e:
            logger.warning("Failed to send reminder SMS: %s", str(e))

    notification_created = False
    if tenant_user_id:
        notify(
            supabase,
            recipient_id=tenant_user_id,
            type="rent_reminder",
            title="Rent Reminder",
            body=data.message,
            metadata={"tenancy_id": data.tenancy_id},
        )
        notification_created = True

    return SendReminderResponse(
        sms_status="sent" if sms_sent else "skipped",
        notification=notification_created,
    )
