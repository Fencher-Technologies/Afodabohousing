import logging
from datetime import datetime, timedelta
from functools import lru_cache

import httpx

logger = logging.getLogger(__name__)

EXCHANGE_RATES: dict[str, dict[str, float]] = {}
LAST_FETCH: datetime | None = None
CACHE_TTL = timedelta(hours=6)
BASE_CURRENCY = "UGX"

FALLBACK_RATES: dict[str, float] = {
    "USD": 0.00027,
    "EUR": 0.00025,
    "GBP": 0.00021,
    "KES": 0.034,
    "TZS": 0.65,
    "RWF": 0.34,
}


def _fetch_rates() -> dict[str, float]:
    global EXCHANGE_RATES, LAST_FETCH
    now = datetime.utcnow()
    if LAST_FETCH and EXCHANGE_RATES and (now - LAST_FETCH) < CACHE_TTL:
        return EXCHANGE_RATES.get(BASE_CURRENCY, FALLBACK_RATES)
    try:
        resp = httpx.get(f"https://open.er-api.com/v6/latest/{BASE_CURRENCY}", timeout=10)
        if resp.status_code == 200:
            data = resp.json()
            EXCHANGE_RATES[BASE_CURRENCY] = data.get("rates", {})
            LAST_FETCH = now
            return EXCHANGE_RATES[BASE_CURRENCY]
    except Exception as e:
        logger.warning("Forex fetch failed: %s", e)
    if BASE_CURRENCY in EXCHANGE_RATES:
        return EXCHANGE_RATES[BASE_CURRENCY]
    return FALLBACK_RATES


def convert(amount: float, from_currency: str = "UGX", to_currency: str = "USD") -> float:
    if from_currency == to_currency:
        return amount
    rates = _fetch_rates()
    if from_currency != BASE_CURRENCY:
        base_in_target = rates.get(to_currency, 1)
        source_in_base = 1.0 / rates.get(from_currency, 1)
        return round(amount * source_in_base * base_in_target, 2)
    rate = rates.get(to_currency, 1)
    return round(amount * rate, 2)


def get_all_rates() -> dict[str, float]:
    return _fetch_rates()
