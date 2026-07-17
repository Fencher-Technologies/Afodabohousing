from datetime import datetime
from uuid import UUID

from pydantic import BaseModel


class SubscriptionPlan(BaseModel):
    id: str
    name: str
    duration_days: int
    price_usd: float
    price_ugx: float
    benefits: list[str] = []
    is_active: bool = True
    sort_order: int = 0
    popular: bool = False
    created_at: datetime | None = None


class SubscriptionPlanResponse(BaseModel):
    id: str
    name: str
    duration_days: int
    price_usd: float
    price_ugx: float
    benefits: list[str]
    is_active: bool
    sort_order: int
    popular: bool


class ManagerSubscription(BaseModel):
    id: UUID
    manager_id: UUID
    plan_id: str
    status: str = "pending"
    started_at: datetime | None = None
    expires_at: datetime | None = None
    auto_renew: bool = True
    payment_reference: str | None = None
    payment_status: str = "pending"
    created_at: datetime | None = None
    updated_at: datetime | None = None


class ManagerSubscriptionResponse(BaseModel):
    id: str
    manager_id: str
    plan_id: str
    plan_name: str
    status: str
    started_at: str | None = None
    expires_at: str | None = None
    auto_renew: bool
    payment_reference: str | None = None
    payment_status: str
    days_remaining: int = 0


class SubscriptionCreateRequest(BaseModel):
    plan_id: str
    phone_number: str | None = None


class PaymentMethodInfo(BaseModel):
    id: str
    name: str
    description: str
    icon: str = "phone"
    recommended: bool = False


class SubscriptionCreateResponse(BaseModel):
    subscription_id: str
    plan_id: str
    amount: float
    currency: str = "UGX"
    payment_reference: str
    message: str
    payment_methods: list[PaymentMethodInfo] = [
        PaymentMethodInfo(
            id="mobile_money",
            name="Mobile Money (Recommended)",
            description="MTN or Airtel — instant payment",
            icon="phone",
            recommended=True,
        )
    ]
