import hashlib
import logging
import random
import secrets
import time
from base64 import urlsafe_b64encode
from datetime import UTC, datetime, timedelta
from typing import Any

import httpx
from cryptography.fernet import Fernet
from fastapi import Depends
from supabase import Client

from config import get_settings
from dependencies.database import get_service_client
from phone import normalize_phone

logger = logging.getLogger(__name__)
settings = get_settings()


def _server_pepper() -> bytes:
    pepper = getattr(settings, "secret_key", None)
    if not pepper:
        return b"afodabo-pin-pepper"
    return pepper.encode()[:32].ljust(32, b"\0")


def hash_pin(pin: str) -> str:
    salt = secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac("sha256", pin.encode(), salt.encode(), 100_000, dklen=32)
    return f"$pbkdf2${salt}${dk.hex()}"


def verify_pin(pin: str, stored: str) -> bool:
    try:
        parts = stored.split("$")
        if len(parts) != 4 or parts[1] != "pbkdf2":
            return False
        salt = parts[2]
        expected = parts[3]
        dk = hashlib.pbkdf2_hmac("sha256", pin.encode(), salt.encode(), 100_000, dklen=32)
        return dk.hex() == expected
    except Exception:
        return False


def _derive_key(pin: str) -> bytes:
    pepper = _server_pepper()
    raw = hashlib.pbkdf2_hmac("sha256", pin.encode(), pepper, 600_000, dklen=32)
    return urlsafe_b64encode(raw)


def encrypt_password(password: str, pin: str) -> str:
    key = _derive_key(pin)
    cipher = Fernet(key)
    return cipher.encrypt(password.encode()).decode()


def decrypt_password(encrypted: str, pin: str) -> str:
    key = _derive_key(pin)
    cipher = Fernet(key)
    try:
        return cipher.decrypt(encrypted.encode()).decode()
    except Exception:
        # Legacy fallback: some accounts were encrypted with SHA256-based key
        legacy_key = urlsafe_b64encode(hashlib.sha256(pin.encode()).digest())
        legacy_cipher = Fernet(legacy_key)
        return legacy_cipher.decrypt(encrypted.encode()).decode()


def generate_otp() -> str:
    return str(random.randint(10 ** (settings.otp_length - 1), 10**settings.otp_length - 1))


def _rate_limit_key(phone: str) -> str:
    return f"otp_rate:{phone}"


_RATE_LIMIT_CACHE: dict[str, float] = {}


def _check_rate_limit(phone: str) -> bool:
    key = _rate_limit_key(phone)
    now = time.time()
    last = _RATE_LIMIT_CACHE.get(key)
    if last and (now - last) < settings.otp_rate_limit_seconds:
        return False
    _RATE_LIMIT_CACHE[key] = now
    return True


async def send_sms_esms(phone: str, message: str) -> bool:
    if not settings.egosms_username or not settings.egosms_password:
        logger.warning("EgoSMS credentials not configured — SMS not sent to %s", phone)
        return False

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                settings.egosms_url,
                json={
                    "method": "SendSms",
                    "userdata": {
                        "username": settings.egosms_username,
                        "password": settings.egosms_password,
                    },
                    "msgdata": [
                        {
                            "number": phone.lstrip("+"),
                            "message": message,
                            "senderid": settings.egosms_sender_id,
                        }
                    ],
                },
                headers={"Content-Type": "application/json"},
            )
            resp.raise_for_status()
            data = resp.json()
            if data.get("Status") == "OK":
                logger.info("EgoSMS sent to %s: cost=%s ref=%s", phone, data.get("Cost"), data.get("MsgFollowUpUniqueCode"))
                return True
            logger.error("EgoSMS API error for %s: %s", phone, data.get("Message", str(data)))
            return False
    except httpx.HTTPStatusError as e:
        logger.error("EgoSMS HTTP error for %s: %d %s", phone, e.response.status_code, e.response.text[:200])
        return False
    except Exception as e:
        logger.error("Failed to send EgoSMS to %s: %s", phone, str(e), exc_info=True)
        return False


class PhoneAuthService:
    def __init__(self, supabase: Client):
        self.supabase = supabase

    async def send_otp(self, phone: str) -> dict[str, Any]:
        phone = normalize_phone(phone)
        if not _check_rate_limit(phone):
            remaining = int(settings.otp_rate_limit_seconds - (time.time() - _RATE_LIMIT_CACHE.get(_rate_limit_key(phone), 0)))
            return {"status": "rate_limited", "message": f"Try again in {remaining} seconds"}

        otp = generate_otp()
        expires_at = datetime.now(UTC) + timedelta(seconds=settings.otp_expiry_seconds)

        self.supabase.table("phone_otps").insert({
            "phone": phone,
            "otp_code": otp,
            "expires_at": expires_at.isoformat(),
        }).execute()

        sent = await send_sms_esms(phone, f"Your Afodabo verification code is: {otp}. It expires in 5 minutes.")

        return {
            "status": "sent" if sent else "simulated",
            "message": "Verification code sent" if sent else "OTP generated (SMS disabled in dev)",
            "expires_in": settings.otp_expiry_seconds,
        }

    async def verify_otp(self, phone: str, otp: str) -> dict[str, Any]:
        phone = normalize_phone(phone)
        now = datetime.now(UTC)

        result = (
            self.supabase.table("phone_otps")
            .select("*")
            .eq("phone", phone)
            .is_("verified_at", "null")
            .gte("expires_at", now.isoformat())
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )

        if not result.data:
            return {"valid": False, "message": "No valid OTP found. Request a new code."}

        record = result.data[0]

        if record["attempts"] >= settings.otp_max_attempts:
            return {"valid": False, "message": "Too many attempts. Request a new code."}

        if record["otp_code"] != otp:
            self.supabase.table("phone_otps").update({"attempts": record["attempts"] + 1}).eq("id", record["id"]).execute()
            remaining = settings.otp_max_attempts - record["attempts"] - 1
            return {"valid": False, "message": f"Incorrect code. {remaining} attempt(s) remaining."}

        self.supabase.table("phone_otps").update({
            "verified_at": now.isoformat(),
        }).eq("id", record["id"]).execute()

        return {"valid": True, "message": "Phone verified"}

    async def verify_otp_for_token(self, phone: str, otp: str) -> str | None:
        result = await self.verify_otp(phone, otp)
        if not result["valid"]:
            return None

        token = secrets.token_urlsafe(32)
        expiry = datetime.now(UTC) + timedelta(minutes=15)
        self.supabase.table("phone_otps").insert({
            "phone": phone,
            "otp_code": f"verify_token:{token}",
            "expires_at": expiry.isoformat(),
        }).execute()

        return token

    def get_profile_by_phone(self, phone: str) -> dict | None:
        phone = normalize_phone(phone)
        result = self.supabase.table("profiles").select("*").eq("phone", phone).execute()
        return result.data[0] if result.data else None

    def is_internal_email(self, email: str | None) -> bool:
        if not email:
            return True
        return email.endswith("@afodabo.app")

    def display_contact(self, profile: dict) -> str:
        email = profile.get("email")
        phone = profile.get("phone")
        if email and not self.is_internal_email(email):
            return email
        if phone:
            return phone
        return "No contact"


def get_phone_auth_service(supabase: Client = Depends(get_service_client)) -> PhoneAuthService:
    return PhoneAuthService(supabase)
