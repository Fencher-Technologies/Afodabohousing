def normalize_phone(phone: str) -> str:
    cleaned = "".join(c for c in phone if c.isdigit() or c == "+")
    if cleaned.startswith("+256"):
        national = cleaned[4:]
    elif cleaned.startswith("256"):
        national = cleaned[3:]
    elif cleaned.startswith("+"):
        national = cleaned[1:]
    else:
        national = cleaned.lstrip("0")
    if len(national) != 9 or not national.isdigit():
        raise ValueError('Phone number must be 9 digits after the country code, e.g. "+256752738927"')
    return "+256" + national


def phone_to_email(phone: str) -> str:
    digits_only = "".join(c for c in phone if c.isdigit())
    return f"phone_{digits_only}@afodabo.app"


def is_synthetic_email(email: str | None) -> bool:
    return bool(email and email.startswith("phone_") and email.endswith("@afodabo.app"))


def validate_pin(pin: str) -> str | None:
    if not pin or not pin.isdigit():
        return "PIN must contain digits only"
    if len(pin) < 4:
        return "PIN must be at least 4 digits"
    if len(pin) > 6:
        return "PIN must be at most 6 digits"
    return None
