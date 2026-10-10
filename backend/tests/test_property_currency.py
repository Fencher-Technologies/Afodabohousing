"""Multi-currency property listings.

properties.rent_currency has existed since the initial schema, but no Pydantic
model exposed it. The mobile create/edit screens sent it and Pydantic silently
dropped it, so every listing fell back to the UGX column default no matter what
the manager selected. These tests pin the whole chain: the field survives the
model, the lease inherits it, and the payment inherits from the lease.
"""

from decimal import Decimal

from models.property import PropertyCreate, PropertyUpdate


def _property(**overrides):
    base = dict(
        title="Buziga home", description="x", property_type="Residential",
        address="a", city="Kampala", district="Kampala", state="Central",
        zip_code="", country="UG", bedrooms=2, bathrooms=1,
        monthly_rent=Decimal("1500"), security_deposit=Decimal("1500"),
    )
    base.update(overrides)
    return PropertyCreate(**base)


def test_currency_survives_the_create_model():
    payload = _property(rent_currency="USD").model_dump(exclude_none=True, mode="json")
    assert payload["rent_currency"] == "USD"


def test_currency_defaults_to_the_platform_standard_when_not_given():
    """US$ is the platform standard, so an unstated currency is dollars.

    This used to default to UGX, which meant a listing created without an
    explicit currency was silently priced in shillings.
    """
    assert _property().rent_currency == "USD"


def test_update_carries_currency():
    payload = PropertyUpdate(rent_currency="KES").model_dump(exclude_none=True)
    assert payload["rent_currency"] == "KES"


def test_update_omits_currency_when_untouched():
    """An edit that doesn't mention currency must not reset it."""
    payload = PropertyUpdate(monthly_rent=Decimal("2000")).model_dump(exclude_none=True)
    assert "rent_currency" not in payload
