from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


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
    currency: str = "UGX"
