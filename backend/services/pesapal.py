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
        raise RuntimeError("Pesapal authentication failed: no token in response")
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


def make_order_id(prefix: str, unique_id: str) -> str:
    return f"AFODABO-{prefix}-{unique_id}-{int(time.time() * 1000)}"
