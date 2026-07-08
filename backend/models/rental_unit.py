from datetime import datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


RentalUnitStatus = Literal["available", "occupied", "maintenance", "unlisted"]


class RentalUnit(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    property_id: UUID
    owner_id: UUID
    unit_number: str
    floor_level: str | None = None
    bedrooms: int
    bathrooms: int
    sitting_rooms: int = 0
    kitchens: int = 1
    rent_amount: Decimal
    rent_currency: str = "UGX"
    status: RentalUnitStatus = "available"
    description: str | None = None
    amenities: list[str] | None = None
    created_at: datetime
    updated_at: datetime


class RentalUnitCreate(BaseModel):
    property_id: UUID
    unit_number: str
    floor_level: str | None = None
    bedrooms: int = 1
    bathrooms: int = 1
    sitting_rooms: int = 0
    kitchens: int = 1
    rent_amount: Decimal
    rent_currency: str = "UGX"
    status: RentalUnitStatus = "available"
    description: str | None = None
    amenities: list[str] | None = None


class RentalUnitUpdate(BaseModel):
    unit_number: str | None = None
    floor_level: str | None = None
    bedrooms: int | None = None
    bathrooms: int | None = None
    sitting_rooms: int | None = None
    kitchens: int | None = None
    rent_amount: Decimal | None = None
    rent_currency: str | None = None
    status: RentalUnitStatus | None = None
    description: str | None = None
    amenities: list[str] | None = None


class RentalUnitResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    property_id: UUID
    owner_id: UUID
    unit_number: str
    floor_level: str | None = None
    bedrooms: int
    bathrooms: int
    sitting_rooms: int = 0
    kitchens: int = 1
    rent_amount: Decimal
    rent_currency: str
    status: RentalUnitStatus
    description: str | None = None
    amenities: list[str] | None = None
    created_at: datetime
    updated_at: datetime
