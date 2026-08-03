import hashlib
import hmac
import logging
import time
from typing import Any

import httpx

from config import get_settings

logger = logging.getLogger(__name__)


def _get_base_url() -> str:
    s = get_settings()
    if s.pesapal_environment == "live":
        return "https://pay.pesapal.com/v3/api"
    return "https://cybqa.pesapal.com/pesapalv3/api"


def _check_credentials():
    s = get_settings()
    if not s.pesapal_consumer_key or not s.pesapal_consumer_secret:
        raise RuntimeError(
            "Pesapal credentials not configured. "
            "Set PESAPAL_CONSUMER_KEY and PESAPAL_CONSUMER_SECRET in environment."
        )


async def get_auth_token() -> str:
    s = get_settings()
    _check_credentials()
    base = _get_base_url()
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.post(
            f"{base}/Auth/RequestToken",
            headers={"Accept": "application/json", "Content-Type": "application/json"},
            json={
                "consumer_key": s.pesapal_consumer_key,
                "consumer_secret": s.pesapal_consumer_secret,
            },
        )
        resp.raise_for_status()
        payload = resp.json()
    token = payload.get("token")
    if not token:
        api_error = (payload.get("error") or {}).get("message") or (payload.get("error") or {}).get("code") or "unknown"
        raise RuntimeError(f"Pesapal authentication failed: {api_error}")
    return token


async def register_ipn(token: str, ipn_url: str) -> str:
    _check_credentials()
    base = _get_base_url()
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.post(
            f"{base}/URLSetup/RegisterIPN",
            headers={
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": f"Bearer {token}",
            },
            json={"url": ipn_url, "ipn_notification_type": "POST"},
        )
        resp.raise_for_status()
        payload = resp.json()
    ipn_id = payload.get("ipn_id")
    if not ipn_id:
        raise RuntimeError("Pesapal IPN registration failed")
    return ipn_id


async def get_ipn_list(token: str) -> list[dict[str, Any]]:
    """Fetch already-registered IPN URLs. Each entry: {"ipn_id", "url", ...}."""
    base = _get_base_url()
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.get(
            f"{base}/URLSetup/GetIpnList",
            headers={"Accept": "application/json", "Authorization": f"Bearer {token}"},
        )
        resp.raise_for_status()
        return resp.json() or []


PESAPAL_CONFIG_TABLE = "pesapal_config"


def _get_stored_ipn(supabase) -> dict[str, Any] | None:
    s = get_settings()
    result = (
        supabase.table(PESAPAL_CONFIG_TABLE)
        .select("*")
        .eq("environment", s.pesapal_environment)
        .limit(1)
        .execute()
    )
    return result.data[0] if result.data else None


def _store_ipn(supabase, ipn_url: str, ipn_id: str) -> None:
    s = get_settings()
    supabase.table(PESAPAL_CONFIG_TABLE).upsert(
        {
            "environment": s.pesapal_environment,
            "ipn_url": ipn_url,
            "ipn_id": ipn_id,
        },
        on_conflict="environment",
    ).execute()


async def register_ipn_for_url(supabase, ipn_url: str) -> dict[str, str]:
    """Register ipn_url if not already registered; persist ipn_id to pesapal_config.

    Returns {"ipn_id", "ipn_url", "status"} where status is "reused" or "registered".
    """
    token = await get_auth_token()
    for entry in await get_ipn_list(token):
        if entry.get("url") == ipn_url and entry.get("ipn_id"):
            ipn_id = entry["ipn_id"]
            _store_ipn(supabase, ipn_url, ipn_id)
            logger.info("Pesapal IPN already registered, reusing: url=%s ipn_id=%s", ipn_url, ipn_id)
            return {"ipn_id": ipn_id, "ipn_url": ipn_url, "status": "reused"}
    ipn_id = await register_ipn(token, ipn_url)
    _store_ipn(supabase, ipn_url, ipn_id)
    logger.info("Pesapal IPN registered: url=%s ipn_id=%s", ipn_url, ipn_id)
    return {"ipn_id": ipn_id, "ipn_url": ipn_url, "status": "registered"}


def get_ipn_id(supabase) -> str:
    """Return the stored IPN id for submit_order. Raises if not registered yet."""
    stored = _get_stored_ipn(supabase)
    if not stored or not stored.get("ipn_id"):
        raise RuntimeError(
            "Pesapal IPN not registered. Register it first via "
            "POST /admin/pesapal/register-ipn or "
            "`python backend/scripts/register_ipn.py <IPN_URL>`."
        )
    return stored["ipn_id"]


async def submit_order(
    *,
    token: str,
    order_id: str,
    amount: float,
    currency: str,
    description: str,
    callback_url: str,
    ipn_id: str,
    first_name: str,
    last_name: str,
    email: str = "",
    phone: str = "",
) -> dict[str, Any]:
    _check_credentials()
    base = _get_base_url()
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.post(
            f"{base}/Transactions/SubmitOrderRequest",
            headers={
                "Accept": "application/json",
                "Content-Type": "application/json",
                "Authorization": f"Bearer {token}",
            },
            json={
                "id": order_id,
                "currency": currency,
                "amount": amount,
                "description": description,
                "callback_url": callback_url,
                "notification_id": ipn_id,
                "billing_address": {
                    "email_address": email,
                    "phone_number": phone,
                    "first_name": first_name,
                    "last_name": last_name,
                },
            },
        )
        resp.raise_for_status()
        return resp.json()


def verify_webhook(payload: bytes, signature: str | None) -> bool:
    s = get_settings()
    if not s.pesapal_consumer_secret:
        logger.warning("PESAPAL_CONSUMER_SECRET not set — skipping signature verification")
        return True
    if not signature:
        return False
    expected = hmac.new(
        s.pesapal_consumer_secret.encode(),
        payload,
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, signature)


async def get_transaction_status(token: str, order_tracking_id: str) -> dict[str, Any]:
    """Query Pesapal for the authoritative payment status of an order.

    The IPN webhook payload carries no status — this is the source of truth.
    Returns the payload with keys like payment_status_description, amount,
    currency, merchant_reference, confirmation_code, etc.
    """
    base = _get_base_url()
    async with httpx.AsyncClient(timeout=20) as client:
        resp = await client.get(
            f"{base}/Transactions/GetTransactionStatus",
            params={"orderTrackingId": order_tracking_id},
            headers={"Accept": "application/json", "Authorization": f"Bearer {token}"},
        )
        resp.raise_for_status()
        return resp.json()


def make_order_id(prefix: str, unique_id: str) -> str:
    return f"AFODABO-{prefix}-{unique_id}-{int(time.time() * 1000)}"
