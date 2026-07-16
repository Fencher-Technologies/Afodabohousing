from datetime import datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict

PropertyType = Literal["Residential", "Office Space"]


class Property(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    owner_id: UUID
    title: str
    address: str
    city: str
    state: str
    zip_code: str = ''
    country: str | None = None
    property_type: PropertyType
    bedrooms: int
    bathrooms: float
    square_feet: int | None = None
    monthly_rent: Decimal
    security_deposit: Decimal
    status: str
    description: str | None = None
    amenities: list[str] | None = None
    images: list[str] | None = None
    manager_email: str | None = None
    manager_phone: str | None = None
    is_active: bool = True
    created_at: datetime
    updated_at: datetime


class PropertyCreate(BaseModel):
    title: str | None = None
    address: str
    city: str
    state: str
    zip_code: str = ''
    country: str | None = None
    property_type: PropertyType
    bedrooms: int = 1
    bathrooms: float = 1.0
    square_feet: int | None = None
    monthly_rent: Decimal
    security_deposit: Decimal
    status: str = "available"
    description: str | None = None
    amenities: list[str] | None = None
    images: list[str] | None = None
    manager_email: str | None = None
    manager_phone: str | None = None
    is_active: bool = True


class PropertyUpdate(BaseModel):
    title: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    zip_code: str | None = None
    country: str | None = None
    property_type: PropertyType | None = None
    bedrooms: int | None = None
    bathrooms: float | None = None
    square_feet: int | None = None
    monthly_rent: Decimal | None = None
    security_deposit: Decimal | None = None
    status: str | None = None
    description: str | None = None
    amenities: list[str] | None = None
    images: list[str] | None = None
    manager_email: str | None = None
    manager_phone: str | None = None
    is_active: bool | None = None


class PropertyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    owner_id: UUID
    title: str
    address: str
    city: str
    state: str
    zip_code: str = ''
    country: str | None = None
    property_type: PropertyType
    bedrooms: int
    bathrooms: float
    square_feet: int | None = None
    monthly_rent: Decimal
    security_deposit: Decimal
    status: str
    description: str | None = None
    amenities: list[str] | None = None
    images: list[str] | None = None
    manager_email: str | None = None
    manager_phone: str | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
