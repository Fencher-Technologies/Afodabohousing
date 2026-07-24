import os
from functools import lru_cache

from pydantic_settings import BaseSettings


def _find_env_file() -> str:
    """Resolve .env path whether running from repo root or backend/ directory."""
    candidates = ["backend/.env", ".env"]
    for p in candidates:
        if os.path.exists(p):
            return p
    return ".env"


class Settings(BaseSettings):
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    database_url: str = ""
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:8080", "http://localhost:3000", "http://localhost:8081", "https://afodabohousing.vercel.app", "https://afodabohousing.onrender.com"]
    environment: str = "development"

    rate_limit_enabled: bool = True
    rate_limit_requests: int = 200
    rate_limit_window_seconds: int = 60
    auth_rate_limit_requests: int = 10
    auth_rate_limit_window_seconds: int = 60
    payment_rate_limit_requests: int = 30
    payment_rate_limit_window_seconds: int = 60

    retry_max_attempts: int = 3
    retry_base_delay: float = 0.5
    retry_max_delay: float = 10.0

    supabase_client_timeout: int = 30

    # Sentry
    sentry_dsn: str = ""
    sentry_endpoint: str = ""
    testing: bool = False

    # Pesapal
    pesapal_consumer_key: str = ""
    pesapal_consumer_secret: str = ""
    pesapal_environment: str = "sandbox"

    # NylonPay
    nylonpay_api_key: str = ""
    nylonpay_api_secret: str = ""
    nylonpay_webhook_secret: str = ""
    nylonpay_environment: str = "sandbox"
    nylonpay_sandbox_base_url: str = "https://sandbox-api.nylonpay.com"
    nylonpay_live_base_url: str = "https://api.nylonpay.com"

    # SMS
    sms_provider_api_key: str = ""
    sms_provider_url: str = "https://api.example.com/sms/send"

    # Notifications
    email_provider_api_key: str = ""
    email_provider_url: str = ""
    email_from_address: str = "no-reply@afodabohousing.com"
    push_provider_api_key: str = ""
    push_provider_url: str = ""

    # Webhooks
    webhook_secret: str = ""

    class Config:
        env_file = _find_env_file()
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()
