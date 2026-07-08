import logging
from typing import Any

from config import get_settings
from nylonpay import (
    Customer,
    VerifyWebhookInput,
    create_nylon_pay,
    verify_webhook_signature,
)

logger = logging.getLogger(__name__)


def _get_nylonpay_base_url() -> str:
    s = get_settings()
    if s.nylonpay_environment == "sandbox":
        return s.nylonpay_sandbox_base_url
    return s.nylonpay_live_base_url


def get_nylonpay_sdk():
    s = get_settings()
    return create_nylon_pay(
        api_key=s.nylonpay_api_key,
        api_secret=s.nylonpay_api_secret,
        base_url=_get_nylonpay_base_url(),
    )


def initiate_boost_payment(
    *,
    amount: int,
    customer_name: str,
    customer_phone: str,
    reference: str,
    description: str,
) -> Any:
    sdk = get_nylonpay_sdk()
    payment = sdk.collect_payment(
        amount=amount,
        currency="UGX",
        customer=Customer(
            name=customer_name,
            phone_number=customer_phone,
        ),
        description=description,
        reference=reference,
    )
    return payment


def initiate_payment(
    *,
    amount: int,
    customer_name: str,
    customer_phone: str,
    customer_email: str | None,
    reference: str,
    description: str,
    metadata: dict[str, str] | None = None,
) -> Any:
    sdk = get_nylonpay_sdk()
    payment = sdk.collect_payment(
        amount=amount,
        currency="UGX",
        customer=Customer(
            name=customer_name,
            phone_number=customer_phone,
            email=customer_email,
        ),
        description=description,
        reference=reference,
        metadata=metadata or {},
    )
    return payment


def verify_webhook(payload: bytes, signature: str) -> bool:
    s = get_settings()
    if not s.nylonpay_webhook_secret:
        logger.warning("NYLONPAY_WEBHOOK_SECRET not set — skipping signature verification")
        return True
    return verify_webhook_signature(VerifyWebhookInput(
        payload=payload,
        signature=signature,
        secret=s.nylonpay_webhook_secret,
    ))
