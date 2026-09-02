from datetime import datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict


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
    region_id: UUID | None = None  # FK to regions table (GeoNames-sourced)
    property_type: str
    property_type_slug: str | None = None
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
    latitude: float | None = None
    longitude: float | None = None
    is_active: bool = True
    created_at: datetime
    updated_at: datetime


class PropertyCreate(BaseModel):
    title: str | None = None
    address: str
    city: str
    state: str
    zip_code: str | None = None
    country: str | None = None
    property_type: str
    property_type_slug: str | None = None
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
    latitude: float | None = None
    longitude: float | None = None
    is_active: bool = True
    region_id: UUID | None = None


class PropertyUpdate(BaseModel):
    title: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    zip_code: str | None = None
    country: str | None = None
    region_id: UUID | None = None
    property_type: str | None = None
    property_type_slug: str | None = None
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
    latitude: float | None = None
    longitude: float | None = None
    is_active: bool | None = None


class PropertyResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: UUID
    owner_id: UUID
    title: str
    address: str | None = None
    city: str | None = None
    state: str | None = None
    zip_code: str = ''
    country: str | None = None
    region_id: UUID | None = None
    property_type: str
    property_type_slug: str | None = None
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
    latitude: float | None = None
    longitude: float | None = None
    is_active: bool
    created_at: datetime
    updated_at: datetime
    is_boosted: bool = False
    boosted_until: str | None = None
    boost_days_remaining: int = 0
    boost_package_label: str | None = None
    area: int | None = None
    rent_amount: Decimal | None = None
    rent_period: str = "monthly"
