import logging
import random
from collections.abc import Callable
from functools import wraps
from typing import Any, ParamSpec, TypeVar, cast

from config import get_settings

logger = logging.getLogger(__name__)
P = ParamSpec("P")
R = TypeVar("R")


def with_retry(func: Callable[P, R]) -> Callable[P, R]:
    settings = get_settings()

    @wraps(func)
    def wrapper(*args: P.args, **kwargs: P.kwargs) -> R:
        last_exception: Exception | None = None
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
        if last_exception is not None:
            raise last_exception
        raise RuntimeError("with_retry exhausted without capturing an exception")

    return cast(Callable[P, R], wrapper)


class BaseService:
    def __init__(self, supabase: Any):
        self.supabase = supabase
        self._table = None

    @property
    def table(self) -> Any:
        if self._table is None:
            raise NotImplementedError("Subclasses must set _table name")
        return self.supabase.table(self._table)
