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
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:8080", "http://localhost:3000", "http://localhost:8081", "https://axishousings.com", "https://www.axishousings.com", "https://afodabohousing.vercel.app"]
    # Optional regex for extra origins such as Vercel preview deployments. Empty
    # (the default) allows only cors_origins. Never use a bare *.vercel.app
    # pattern: that admits every project on Vercel, not just this one. Pin it to
    # this project, e.g. ^https://afodabohousing-[a-z0-9-]+-<team>\.vercel\.app$
    cors_origin_regex: str = ""
    environment: str = "development"

    rate_limit_enabled: bool = True
    # How many reverse proxies sit in front of the API and append to
    # X-Forwarded-For. The client address is read that many entries from the
    # RIGHT, where the proxy we trust wrote it; anything further left was
    # supplied by the caller and is ignored. 0 ignores the header entirely.
    trusted_proxy_hops: int = 1
    # Upper bound on distinct clients the in-memory limiter tracks.
    rate_limit_max_clients: int = 20000
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
    pesapal_ipn_url: str = ""
    # Currency a checkout uses when the caller does not name one. Axis prices
    # in US$, but a Pesapal merchant account only settles the currencies it has
    # been enabled for. If card payments in USD are rejected, set
    # DEFAULT_PAYMENT_CURRENCY=UGX to fall back without a code change.
    default_payment_currency: str = "USD"

    # SMS
    sms_provider_api_key: str = ""
    sms_provider_url: str = "https://api.example.com/sms/send"

    # EgoSMS (Comms API v1 JSON — for OTP delivery)
    egosms_username: str = ""
    egosms_password: str = ""
    egosms_sender_id: str = "Axis"
    egosms_url: str = "https://comms.egosms.co/api/v1/json/"

    # OTP
    otp_length: int = 6
    otp_expiry_seconds: int = 300  # 5 minutes
    otp_max_attempts: int = 3
    otp_rate_limit_seconds: int = 60  # 1 OTP per 60s per phone

    # Notifications
    email_provider_api_key: str = ""
    email_provider_url: str = ""
    email_from_address: str = "info@axishousings.com"
    push_provider_api_key: str = ""
    push_provider_url: str = ""

    # How often (days) tenants in arrears and their managers are reminded.
    # 7 = weekly (current setting for testing). Set RENT_REMINDER_INTERVAL_DAYS to change.
    rent_reminder_interval_days: int = 7

    # Shared secret for the Supabase cron call to /internal/jobs/run (checked
    # against the value stored in the Supabase vault, so no Render env var).

    # Password reset
    # Supabase mails the recovery link to this URL. Without it the link falls
    # back to the project's Site URL, which had no handler in either client —
    # the mail arrived and the link went nowhere.
    password_reset_redirect_url: str = "https://www.axishousings.com/reset-password"

    # Webhooks
    webhook_secret: str = ""

    class Config:
        env_file = _find_env_file()
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()
