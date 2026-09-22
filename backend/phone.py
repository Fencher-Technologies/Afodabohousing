"""Phone numbers in international (E.164) form.

Numbers used to be forced to +256, so a tenant or manager with a Kenyan,
Tanzanian or any other number could not sign up at all. Any country code is
now accepted; a number typed without one is still treated as Ugandan, which
keeps every existing account and password working exactly as before.
"""

# Dial codes Axis serves, longest first so +255 is not read as +25.
KNOWN_DIAL_CODES = (
    "211", "212", "213", "216", "218", "220", "221", "222", "223", "224", "225",
    "226", "227", "228", "229", "230", "231", "232", "233", "234", "235", "236",
    "237", "238", "239", "240", "241", "242", "243", "244", "245", "248", "249",
    "250", "251", "252", "253", "254", "255", "256", "257", "258", "260", "261",
    "262", "263", "264", "265", "266", "267", "268", "269", "290", "291", "297",
    "298", "299", "350", "351", "352", "353", "354", "355", "356", "357", "358",
    "359", "370", "371", "372", "373", "374", "375", "376", "377", "378", "380",
    "381", "382", "383", "385", "386", "387", "389", "420", "421", "423", "500",
    "501", "502", "503", "504", "505", "506", "507", "508", "509", "590", "591",
    "592", "593", "594", "595", "596", "597", "598", "599", "670", "672", "673",
    "674", "675", "676", "677", "678", "679", "680", "681", "682", "683", "685",
    "686", "687", "688", "689", "690", "691", "692", "850", "852", "853", "855",
    "856", "870", "880", "886", "960", "961", "962", "963", "964", "965", "966",
    "967", "968", "970", "971", "972", "973", "974", "975", "976", "977", "992",
    "993", "994", "995", "996", "998",
    "20", "27", "30", "31", "32", "33", "34", "36", "39", "40", "41", "43", "44",
    "45", "46", "47", "48", "49", "51", "52", "53", "54", "55", "56", "57", "58",
    "60", "61", "62", "63", "64", "65", "66", "81", "82", "84", "86", "90", "91",
    "92", "93", "94", "95", "98",
    "1", "7",
)

DEFAULT_DIAL_CODE = "256"  # Uganda
DEFAULT_NATIONAL_LENGTH = 9


def split_dial_code(e164: str) -> tuple[str, str]:
    """('256', '752738927') from '+256752738927'. Unknown codes come back ('', digits)."""
    digits = e164.lstrip("+")
    for code in KNOWN_DIAL_CODES:
        if digits.startswith(code):
            return code, digits[len(code):]
    return "", digits


def normalize_phone(phone: str) -> str:
    """Return the number as +<country><national>, or raise ValueError.

    Accepts "+256752738927", "256752738927", "0752738927" and "752738927"
    for Uganda, and the international form for anywhere else.
    """
    if not phone:
        raise ValueError("Phone number is required")

    cleaned = "".join(c for c in phone if c.isdigit() or c == "+")
    has_plus = cleaned.startswith("+")
    digits = cleaned.lstrip("+")

    if not digits.isdigit():
        raise ValueError("Phone number must contain digits only")

    if has_plus:
        code, national = split_dial_code(digits)
        if not code or not national:
            raise ValueError(
                'Unknown country code. Use the international form, e.g. "+256752738927"'
            )
    elif digits.startswith(DEFAULT_DIAL_CODE) and len(digits) == len(DEFAULT_DIAL_CODE) + DEFAULT_NATIONAL_LENGTH:
        code, national = DEFAULT_DIAL_CODE, digits[len(DEFAULT_DIAL_CODE):]
    else:
        # A local number: Uganda, with or without the leading 0.
        code, national = DEFAULT_DIAL_CODE, digits.lstrip("0")

    national = national.lstrip("0") if code == DEFAULT_DIAL_CODE else national

    if code == DEFAULT_DIAL_CODE:
        if len(national) != DEFAULT_NATIONAL_LENGTH:
            raise ValueError(
                'Phone number must be 9 digits after the country code, e.g. "+256752738927"'
            )
    elif not 4 <= len(national) <= 14 or not 7 <= len(code + national) <= 15:
        raise ValueError('Phone number looks too short or too long, e.g. "+254712345678"')

    return "+" + code + national


def phone_to_email(phone: str) -> str:
    digits_only = "".join(c for c in phone if c.isdigit())
    return f"phone_{digits_only}@axis.app"


def is_synthetic_email(email: str | None) -> bool:
    return bool(email and email.startswith("phone_") and email.endswith("@axis.app"))


def validate_pin(pin: str) -> str | None:
    if not pin or not pin.isdigit():
        return "PIN must contain digits only"
    if len(pin) < 4:
        return "PIN must be at least 4 digits"
    if len(pin) > 6:
        return "PIN must be at most 6 digits"
    return None
