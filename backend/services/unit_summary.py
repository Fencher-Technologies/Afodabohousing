"""Attaching rental-unit price summaries to property rows.

A property can hold several units at different rents. Listing cards need to
show that range ("UGX 300,000 – 800,000") without fetching units per property,
which would be one request per card. This does a single batched lookup for a
page of properties and folds the result into each row.
"""

from __future__ import annotations

import logging
from decimal import Decimal, InvalidOperation
from typing import Any

from supabase import Client

logger = logging.getLogger(__name__)

# Units that are gone shouldn't influence the advertised range.
_EXCLUDED_STATUSES = {"archived", "deleted"}


def _to_decimal(value: Any) -> Decimal | None:
    if value is None:
        return None
    try:
        return Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError):
        return None


def attach_unit_summaries(supabase: Client, properties: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """Add unit_count / unit_rent_min / unit_rent_max to each property row.

    Best-effort: if the lookup fails the rows are returned unchanged with zero
    counts, so a listing page never breaks because of a summary.
    """
    if not properties:
        return properties

    for row in properties:
        row.setdefault("unit_count", 0)
        row.setdefault("unit_rent_min", None)
        row.setdefault("unit_rent_max", None)

    ids = [str(p["id"]) for p in properties if p.get("id")]
    if not ids:
        return properties

    try:
        result = (
            supabase.table("rental_units")
            .select("property_id, rent_amount, status")
            .in_("property_id", ids)
            .execute()
        )
    except Exception:
        logger.warning("Could not load rental unit summaries", exc_info=True)
        return properties

    buckets: dict[str, list[Decimal]] = {}
    for unit in result.data or []:
        if (unit.get("status") or "").lower() in _EXCLUDED_STATUSES:
            continue
        amount = _to_decimal(unit.get("rent_amount"))
        if amount is None:
            continue
        buckets.setdefault(str(unit.get("property_id")), []).append(amount)

    for row in properties:
        rents = buckets.get(str(row.get("id")))
        if not rents:
            continue
        row["unit_count"] = len(rents)
        row["unit_rent_min"] = min(rents)
        row["unit_rent_max"] = max(rents)

    return properties
