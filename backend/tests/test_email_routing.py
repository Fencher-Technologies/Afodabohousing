"""Where transactional email gets sent.

Email defaulted to EMAIL_PROVIDER_URL / EMAIL_PROVIDER_API_KEY, both empty, so
every notification recorded a "skipped" delivery. It now falls back to the
Supabase send-email edge function using credentials the backend already has.
"""

from config import Settings
from services.email import email_endpoint


def _settings(**overrides) -> Settings:
    base = {
        "supabase_url": "https://proj.supabase.co",
        "supabase_service_role_key": "service-role-key",
        "email_provider_url": "",
        "email_provider_api_key": "",
    }
    base.update(overrides)
    return Settings(**base)


def test_falls_back_to_supabase_edge_function():
    url, token = email_endpoint(_settings())
    assert url == "https://proj.supabase.co/functions/v1/send-email"
    assert token == "service-role-key"


def test_trailing_slash_on_supabase_url_does_not_double():
    url, _ = email_endpoint(_settings(supabase_url="https://proj.supabase.co/"))
    assert url == "https://proj.supabase.co/functions/v1/send-email"


def test_explicit_provider_wins():
    url, token = email_endpoint(
        _settings(
            email_provider_url="https://api.resend.com/emails",
            email_provider_api_key="re_direct",
        )
    )
    assert url == "https://api.resend.com/emails"
    assert token == "re_direct"


def test_unconfigured_returns_nothing():
    url, token = email_endpoint(
        _settings(supabase_url="", supabase_service_role_key="")
    )
    assert url is None and token is None
