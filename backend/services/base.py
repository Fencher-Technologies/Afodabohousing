import logging
import random
from collections.abc import Callable
from functools import wraps
from typing import Any, TypeVar

from config import get_settings

logger = logging.getLogger(__name__)
F = TypeVar("F", bound=Callable[..., Any])


def with_retry(func: F) -> F:
    settings = get_settings()

    @wraps(func)
    def wrapper(*args, **kwargs):
        last_exception = None
        for attempt in range(settings.retry_max_attempts):
            try:
                return func(*args, **kwargs)
            except Exception as e:
                last_exception = e
                if attempt < settings.retry_max_attempts - 1:
                    delay = min(
                        settings.retry_base_delay * (2 ** attempt) + random.uniform(0, 0.5),
                        settings.retry_max_delay,
                    )
                    logger.warning(
                        "Retry attempt %d/%d for %s after error: %s. Waiting %.2fs",
                        attempt + 1,
                        settings.retry_max_attempts,
                        func.__qualname__,
                        str(e),
                        delay,
                    )
                    time = __import__("time")
                    time.sleep(delay)
        raise last_exception

    return wrapper


class BaseService:
    def __init__(self, supabase):
        self.supabase = supabase
        self._table = None

    @property
    def table(self):
        if self._table is None:
            raise NotImplementedError("Subclasses must set _table name")
        return self.supabase.table(self._table)
