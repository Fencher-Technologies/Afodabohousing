import asyncio
import logging
import random
import time
from collections.abc import Callable
from functools import wraps
from typing import Any, ParamSpec, TypeVar, cast

import httpx

from config import get_settings

logger = logging.getLogger(__name__)
P = ParamSpec("P")
R = TypeVar("R")


def _is_transient_error(exc: Exception) -> bool:
    """True for errors worth retrying: network blips, timeouts, 5xx.

    4xx client errors are *not* retried — retrying a bad request never fixes it
    and only wastes time and holds the event loop / thread longer.
    """
    if isinstance(exc, (httpx.TransportError, httpx.TimeoutException)):
        return True
    status = getattr(exc, "status_code", None) or getattr(exc, "code", None)
    if status is not None:
        try:
            return 500 <= int(status) < 600
        except (TypeError, ValueError):
            pass
    message = str(exc).lower()
    return any(
        token in message
        for token in (
            "getaddrinfo failed",
            "forcibly closed by the remote host",
            "temporary failure in name resolution",
            "connection reset",
            "502",
            "503",
            "504",
        )
    )


def with_retry(func: Callable[P, R]) -> Callable[P, R]:
    """Retry a synchronous callable only on transient errors.

    Uses ``time.sleep`` between attempts (blocking). Intended for sync Supabase
    calls. Prefer :func:`with_retry_async` from async code so the event loop is
    not blocked while waiting.
    """
    settings = get_settings()

    @wraps(func)
    def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
        last_exception: Exception | None = None
        for attempt in range(settings.retry_max_attempts):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                last_exception = e
                if (
                    attempt < settings.retry_max_attempts - 1
                    and _is_transient_error(e)
                ):
                    delay = min(
                        settings.retry_base_delay * (2 ** attempt)
                        + random.uniform(0, 0.5),
                        settings.retry_max_delay,
                    )
                    logger.warning(
                        "Retry attempt %d/%d for %s after transient error: %s. Waiting %.2fs",
                        attempt + 1,
                        settings.retry_max_attempts,
                        func.__qualname__,
                        str(e),
                        delay,
                    )
                    time.sleep(delay)
                else:
                    # Non-transient or final attempt: don't retry.
                    raise
        if last_exception is not None:
            raise last_exception
        raise RuntimeError("with_retry exhausted without capturing an exception")

    return cast(Callable[P, R], wrapper)


async def with_retry_async(
    func: Callable[P, R], *args: P.args, **kwargs: P.kwargs
) -> R:
    """Retry an async callable only on transient errors, with non-blocking sleep."""
    settings = get_settings()
    last_exception: Exception | None = None
    for attempt in range(settings.retry_max_attempts):
        try:
            return await func(*args, **kwargs)
        except Exception as e:
            last_exception = e
            if (
                attempt < settings.retry_max_attempts - 1
                and _is_transient_error(e)
            ):
                delay = min(
                    settings.retry_base_delay * (2 ** attempt)
                    + random.uniform(0, 0.5),
                    settings.retry_max_delay,
                )
                logger.warning(
                    "Retry attempt %d/%d for %s after transient error: %s. Waiting %.2fs",
                    attempt + 1,
                    settings.retry_max_attempts,
                    getattr(func, "__qualname__", func),
                    str(e),
                    delay,
                )
                await asyncio.sleep(delay)
            else:
                raise
    if last_exception is not None:
        raise last_exception
    raise RuntimeError("with_retry_async exhausted without capturing an exception")


class BaseService:
    def __init__(self, supabase: Any):
        self.supabase = supabase
        self._table = None

    @property
    def table(self) -> Any:
        if self._table is None:
            raise NotImplementedError("Subclasses must set _table name")
        return self.supabase.table(self._table)
