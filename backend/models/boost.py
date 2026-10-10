from datetime import datetime
from decimal import Decimal
from uuid import UUID
from typing import Literal

from pydantic import BaseModel, ConfigDict
from currency import DEFAULT_CURRENCY


class Boost(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    property_id: UUID
    manager_id: UUID
    amount_paid: Decimal
    duration_days: int
    started_at: datetime
    expires_at: datetime
    status: str
    transaction_id: str | None = None
    payment_method: str | None = None
    created_at: datetime
    updated_at: datetime


class BoostCreate(BaseModel):
    property_id: UUID
    duration_days: int = 7
    amount_paid: Decimal


class BoostResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    property_id: UUID
    property_title: str | None = None
    amount_paid: Decimal
    duration_days: int
    started_at: datetime
    expires_at: datetime
    status: str
    transaction_id: str | None = None
    payment_method: str | None = None
    created_at: datetime


class BoostStats(BaseModel):
    active_boosts: int = 0
    total_boosts: int = 0
    total_revenue: float = 0
    avg_boost_price: float = 0


class BoostPriceRequest(BaseModel):
    property_id: UUID
    duration_days: int = 7


class BoostPriceResponse(BaseModel):
    duration_days: int
    amount: float
    currency: str = DEFAULT_CURRENCY


class InitiateBoostRequest(BaseModel):
    property_id: UUID
    duration_days: int = 7
    phone_number: str | None = None
    callback_url: str | None = None
    # US$ is the platform's standard currency for boosts. UGX remains
    # available because Ugandan mobile money cannot settle in dollars.
    currency: Literal["USD", "UGX"] = "USD"


class InitiateBoostResponse(BaseModel):
    boost_id: UUID
    reference: str
    status: str
    message: str
    redirect_url: str | None = None


class BoostPackage(BaseModel):
    days: int
    #: Price in UGX, kept as the historical field name so existing clients
    #: keep working. New clients should read price_usd.
    price: int
    label: str
    #: Describes `price` above, which is the legacy shilling field. It is
    #: deliberately NOT the platform's standard currency: saying USD here
    #: would advertise a shilling figure as dollars. Read price_usd instead.
    currency: str = "UGX"
    price_usd: float | None = None
    price_ugx: int | None = None
