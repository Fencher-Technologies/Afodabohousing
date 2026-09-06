"""Resolving where transactional email is sent.

Email used to require EMAIL_PROVIDER_URL and EMAIL_PROVIDER_API_KEY as backend
environment variables. Both defaulted to empty, so every notification recorded
a "skipped" delivery and no mail was ever sent.

The default is now the Supabase `send-email` edge function, which keeps the
provider API key as a Supabase secret. The backend authenticates with the
service role key it already has, so no new backend environment variables are
needed. An explicit EMAIL_PROVIDER_URL still wins if you'd rather post to a
provider directly.
"""

from __future__ import annotations

from config import Settings


def email_endpoint(settings: Settings) -> tuple[str | None, str | None]:
    """Return (url, bearer_token) for sending mail, or (None, None) if unset."""
    # An explicitly configured provider takes precedence.
    if settings.email_provider_url and settings.email_provider_api_key:
        return settings.email_provider_url, settings.email_provider_api_key

    # Otherwise fall back to the Supabase edge function.
    base = (settings.supabase_url or "").rstrip("/")
    key = settings.supabase_service_role_key
    if base and key:
        return f"{base}/functions/v1/send-email", key

    return None, None
