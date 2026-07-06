import hashlib
import hmac
import json
import logging
import time
from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from supabase import Client

from config import get_settings
from dependencies import get_service_client
from services.boost import get_boost_service
from services.nylonpay import verify_webhook as verify_nylonpay_webhook

logger = logging.getLogger(__name__)

router = APIRouter(prefix="", tags=["webhooks"])

settings = get_settings()

# In-memory idempotency store (use Redis in production)
_idempotent_keys: dict[str, dict[str, Any]] = {}
IDEMPOTENCY_TTL = 86400


def _check_idempotency(key: str) -> dict[str, Any] | None:
    record = _idempotent_keys.get(key)
    if record and (time.time() - record["timestamp"]) < IDEMPOTENCY_TTL:
        return record["response"]
    return None


def _set_idempotency(key: str, response: dict[str, Any]) -> None:
    _idempotent_keys[key] = {"timestamp": time.time(), "response": response}
    # Clean expired entries
    cutoff = time.time() - IDEMPOTENCY_TTL
    for k in list(_idempotent_keys.keys()):
        if _idempotent_keys[k]["timestamp"] < cutoff:
            del _idempotent_keys[k]


def _verify_pesapal_signature(payload: bytes, signature: str | None) -> bool:
    if not settings.pesapal_consumer_secret:
        logger.warning("PESAPAL_CONSUMER_SECRET not set — skipping signature verification")
        return True
    if not signature:
        return False
    expected = hmac.new(
        settings.pesapal_consumer_secret.encode(),
        payload,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


class PesapalWebhookPayload(BaseModel):
    pesapal_transaction_tracking_id: str
    payment_method: str | None = None
    payment_status_description: str | None = None
    currency: str | None = "UGX"
    amount: float | None = None
    description: str | None = None
    merchant_reference: str | None = None


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

    if not _verify_pesapal_signature(body, signature):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid signature",
        )

    idempotency_key = request.headers.get("Idempotency-Key") or request.headers.get("X-Idempotency-Key")
    if idempotency_key:
        cached = _check_idempotency(idempotency_key)
        if cached:
            logger.info("Returning cached response for idempotency key %s", idempotency_key)
            return cached

    payload = PesapalWebhookPayload(**json.loads(body))

    logger.info(
        "Pesapal webhook received: txn=%s status=%s ref=%s",
        payload.pesapal_transaction_tracking_id,
        payload.payment_status_description,
        payload.merchant_reference,
    )

    status_map = {
        "COMPLETED": "completed",
        "PENDING": "pending",
        "FAILED": "failed",
        "REFUNDED": "refunded",
    }
    payment_status = status_map.get(
        (payload.payment_status_description or "").upper(),
        "pending",
    )

    try:
        result = (
            supabase.table("payments")
            .update({"status": payment_status, "transaction_id": payload.pesapal_transaction_tracking_id})
            .eq("transaction_id", payload.merchant_reference)
            .execute()
        )
        if not result.data:
            logger.warning("No payment found for merchant_reference %s", payload.merchant_reference)
    except Exception as e:
        logger.error("Failed to update payment from webhook: %s", str(e), exc_info=True)

    response = {"status": "received", "payment_status": payment_status}

    if idempotency_key:
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


@router.post("/webhooks/nylonpay", status_code=status.HTTP_200_OK)
async def nylonpay_webhook(
    request: Request,
    supabase: Client = Depends(get_service_client),
):
    body = await request.body()
    signature = request.headers.get("x-nylon-signature", "")

    if not verify_nylonpay_webhook(body, signature):
        logger.warning("NylonPay webhook signature verification failed")
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid signature")

    payload = json.loads(body)
    event = payload.get("event", "")
    txn = payload.get("data", {})
    reference = txn.get("reference", "")
    txn_id = txn.get("id", "")
    status_str = txn.get("status", "")

    logger.info("NylonPay webhook: event=%s reference=%s status=%s", event, reference, status_str)

    if event == "transaction.successful":
        svc = get_boost_service(supabase)
        activated = svc.activate_by_reference(reference, txn_id)
        if activated:
            logger.info("Boost %s activated via NylonPay webhook", activated["id"])
        else:
            supabase.table("payments").update({"status": "completed", "transaction_id": txn_id}).eq("transaction_id", reference).execute()

    elif event in ("transaction.failed", "transaction.cancelled"):
        svc = get_boost_service(supabase)
        svc.table.update({"status": "failed"}).eq("transaction_id", reference).eq("status", "pending").execute()
        supabase.table("payments").update({"status": "failed"}).eq("transaction_id", reference).execute()

    return {"status": "received"}
