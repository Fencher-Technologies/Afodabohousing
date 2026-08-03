import pytest

from phone import normalize_phone


def test_normalize_phone_standardizes_to_country_code():
    assert normalize_phone("0752738927") == "+256752738927"
    assert normalize_phone("256752738927") == "+256752738927"
    assert normalize_phone("+256752738927") == "+256752738927"
    assert normalize_phone("256774440966") == "+256774440966"
    assert normalize_phone("+256758355646") == "+256758355646"


def test_normalize_phone_rejects_wrong_subscriber_digits():
    with pytest.raises(ValueError):
        normalize_phone("075273892")  # 8 digits after 0
    with pytest.raises(ValueError):
        normalize_phone("+25675273892")  # 8 digits after country code
    with pytest.raises(ValueError):
        normalize_phone("075273892712")  # 11 digits after 0
    with pytest.raises(ValueError):
        normalize_phone("+256")  # no subscriber digits