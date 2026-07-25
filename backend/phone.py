def normalize_phone(phone: str) -> str:
    cleaned = "".join(c for c in phone if c.isdigit() or c == "+")
    if cleaned.startswith("+"):
        return cleaned
    if cleaned.startswith("256"):
        return "+" + cleaned
    return "+256" + cleaned.lstrip("0")


def phone_to_email(phone: str) -> str:
    normalized = normalize_phone(phone)
    digits_only = normalized.lstrip("+")
    return f"phone_{digits_only}@afodabo.app"


def validate_pin(pin: str) -> str | None:
    if not pin or not pin.isdigit():
        return "PIN must contain digits only"
    if len(pin) < 4:
        return "PIN must be at least 4 digits"
    if len(pin) > 6:
        return "PIN must be at most 6 digits"
    return None
