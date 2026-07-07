from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    database_url: str = ""
    secret_key: str = "change-me-in-production"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    cors_origins: list[str] = ["http://localhost:3000", "http://localhost:8081"]
    environment: str = "development"

    rate_limit_enabled: bool = True
    rate_limit_requests: int = 200
    rate_limit_window_seconds: int = 60

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
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"


@lru_cache
def get_settings() -> Settings:
    return Settings()
