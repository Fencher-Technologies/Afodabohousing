from __future__ import annotations

from typing import Any

from config import get_settings

try:
    import sentry_sdk
except Exception:  # pragma: no cover - Sentry is optional in local/dev envs.
    sentry_sdk = None


def _get_sentry_endpoint() -> str:
    settings = get_settings()
    return settings.sentry_endpoint or settings.sentry_dsn


def is_sentry_enabled() -> bool:
    settings = get_settings()
    return bool(
        _get_sentry_endpoint()
        and not settings.testing
        and settings.environment.lower() != "test"
    )


def init_sentry() -> None:
    if sentry_sdk is None or not is_sentry_enabled():
        return

    settings = get_settings()

    try:
        sentry_sdk.init(
            dsn=_get_sentry_endpoint(),
            environment=settings.environment,
            send_default_pii=True,
            traces_sample_rate=0.25,
            profiles_sample_rate=0.1,
        )
    except Exception as exc:  # pragma: no cover - startup fallback only.
        import logging

        logging.getLogger(__name__).warning("Failed to initialize Sentry: %s", str(exc))


def set_sentry_request_context(request_id: str, method: str, path: str) -> None:
    if sentry_sdk is None or not is_sentry_enabled():
        return

    sentry_sdk.set_tag("request_id", request_id)
    sentry_sdk.set_context(
        "request",
        {
            "method": method,
            "path": path,
        },
    )
    sentry_sdk.set_user(None)


def set_sentry_user(user: dict[str, Any] | None) -> None:
    if sentry_sdk is None or not is_sentry_enabled():
        return

    sentry_sdk.set_user(user)


def capture_sentry_exception(exc: Exception) -> None:
    if sentry_sdk is None or not is_sentry_enabled():
        return

    sentry_sdk.capture_exception(exc)
