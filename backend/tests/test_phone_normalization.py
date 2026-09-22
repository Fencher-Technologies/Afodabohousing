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


def test_other_countries_are_accepted():
    """Managers and tenants outside Uganda could not sign up at all before."""
    assert normalize_phone("+254712345678") == "+254712345678"   # Kenya
    assert normalize_phone("+255 754 123 456") == "+255754123456"  # Tanzania
    assert normalize_phone("+1 415 555 0123") == "+14155550123"   # US
    assert normalize_phone("+44 7700 900123") == "+447700900123"  # UK


def test_local_numbers_still_default_to_uganda():
    assert normalize_phone("752738927") == "+256752738927"
    assert normalize_phone("0752738927") == "+256752738927"


def test_unusable_numbers_are_rejected():
    with pytest.raises(ValueError):
        normalize_phone("+999123")       # no such country code
    with pytest.raises(ValueError):
        normalize_phone("+254")          # country code only
    with pytest.raises(ValueError):
        normalize_phone("")


def test_split_dial_code_reads_the_longest_code_first():
    from phone import split_dial_code

    assert split_dial_code("+255754123456") == ("255", "754123456")
    assert split_dial_code("+256752738927") == ("256", "752738927")
    assert split_dial_code("+14155550123") == ("1", "4155550123")
