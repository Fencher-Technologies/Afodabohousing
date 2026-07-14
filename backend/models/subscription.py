from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


SUBSCRIPTION_PRICES = {
    "3mo": Decimal("37000"),
    "6mo": Decimal("66600"),
    "12mo": Decimal("111000"),
}


def calculate_subscription_price(plan_type: str) -> Decimal:
    return SUBSCRIPTION_PRICES.get(plan_type, Decimal("0"))


class Subscription(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    manager_id: UUID
    plan_type: str
    status: str
    start_date: datetime
    expiry_date: datetime
    amount_paid: Decimal
    payment_method: str | None = None
    transaction_id: str | None = None
    auto_renew: bool = False
    created_at: datetime
    updated_at: datetime


class SubscriptionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    manager_id: UUID
    plan_type: str
    status: str
    start_date: datetime
    expiry_date: datetime
    amount_paid: Decimal
    payment_method: str | None = None
    transaction_id: str | None = None
    auto_renew: bool = False
    created_at: datetime


class SubscriptionStats(BaseModel):
    active_subscriptions: int = 0
    total_subscriptions: int = 0
    total_revenue: float = 0
    plan_breakdown: dict[str, int] = {}


class InitiateSubscriptionRequest(BaseModel):
    plan_type: str = "3mo"
    phone_number: str


class InitiateSubscriptionResponse(BaseModel):
    subscription_id: UUID
    reference: str
    status: str
    message: str
