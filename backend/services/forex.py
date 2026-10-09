import logging
from datetime import datetime, timedelta

import httpx

logger = logging.getLogger(__name__)

EXCHANGE_RATES: dict[str, dict[str, float]] = {}
LAST_FETCH: datetime | None = None
CACHE_TTL = timedelta(hours=6)
BASE_CURRENCY = "USD"

# Units of each currency per 1 USD, used when the live rate service cannot be
# reached. The old table was inverted (it listed UGX-per-unit figures under a
# USD base) and had no UGX entry at all, so conversions produced nonsense.
# UGX falls back to the rate Axis quotes (1 USD = 4,000 UGX) only when the
# live service is unreachable.
FALLBACK_RATES: dict[str, float] = {
    "USD": 1.0,
    "UGX": 4000.0,
    "KES": 129.0,
    "TZS": 2600.0,
    "RWF": 1350.0,
    "BIF": 2900.0,
    "SSP": 4500.0,
    "ETB": 125.0,
    "NGN": 1550.0,
    "ZAR": 18.0,
    "GHS": 15.0,
    "EUR": 0.92,
    "GBP": 0.79,
    "AED": 3.67,
    "CAD": 1.36,
    "AUD": 1.52,
    "INR": 84.0,
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
            rates = {**FALLBACK_RATES, **(data.get("rates") or {})}
            EXCHANGE_RATES[BASE_CURRENCY] = rates
            LAST_FETCH = now
            return rates
    except Exception as e:
        logger.warning("Forex fetch failed: %s", e)
    if BASE_CURRENCY in EXCHANGE_RATES:
        return EXCHANGE_RATES[BASE_CURRENCY]
    return FALLBACK_RATES


def convert(amount: float, from_currency: str = "USD", to_currency: str = "USD") -> float:
    """Convert between any two currencies we hold a USD rate for.

    Unknown codes are returned unchanged rather than silently multiplied by 1,
    which used to turn 300,000 UGX into 300,000 USD on a mixed portfolio.
    """
    from_currency = (from_currency or "USD").upper()
    to_currency = (to_currency or "USD").upper()
    if from_currency == to_currency or not amount:
        return amount
    rates = _fetch_rates()
    if from_currency not in rates or to_currency not in rates:
        logger.warning("No exchange rate for %s->%s; leaving amount as is", from_currency, to_currency)
        return amount
    if from_currency != BASE_CURRENCY:
        base_in_target = rates.get(to_currency, 1)
        source_in_base = 1.0 / rates.get(from_currency, 1)
        return round(amount * source_in_base * base_in_target, 2)
    rate = rates.get(to_currency, 1)
    return round(amount * rate, 2)


def get_all_rates() -> dict[str, float]:
    return _fetch_rates()


# Smallest unit people actually transact in, per currency. Mobile money and
# card checkouts are rounded up to this so a converted price never arrives as
# an unpayable figure like UGX 36,847.23.
CHARGE_ROUNDING: dict[str, int] = {
    "UGX": 100,
    "TZS": 100,
    "RWF": 100,
    "BIF": 100,
    "SSP": 100,
    "NGN": 10,
    "KES": 1,
    "ETB": 1,
    "INR": 1,
}


def charge_amount(price_usd: float, currency: str) -> float:
    """What to actually bill for a US$ price in the currency being paid in.

    Axis prices subscriptions and property boosts in US$, but Ugandan mobile
    money cannot settle dollars, so a shilling payer is charged the converted
    equivalent at the current rate rather than a figure fixed years ago. The
    result is rounded UP to the currency's usual transacting unit, so Axis is
    never left short by the rounding.

    If the live rate service is unreachable, convert() falls back to the rate
    Axis quotes (1 USD = 4,000 UGX), so a checkout still works.
    """
    currency = (currency or BASE_CURRENCY).upper()
    if currency == BASE_CURRENCY:
        return round(float(price_usd), 2)

    converted = convert(float(price_usd), BASE_CURRENCY, currency)

    step = CHARGE_ROUNDING.get(currency)
    if step:
        import math

        return float(math.ceil(converted / step) * step)
    return round(converted, 2)
