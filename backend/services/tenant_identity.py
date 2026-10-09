"""Resolving the tenant records that belong to one signed-in user.

A person is represented by one row in ``tenants`` PER HOUSE MANAGER: the table
is unique on ``(user_id, owner_id)``. So a tenant who rents from two managers,
or who moved from one manager to another and was re-added by the new one, has
several ``tenants`` rows sharing a single ``user_id``.

The code originally assumed exactly one row and read it with ``maybe_single()``
or ``data[0]``:

  * ``maybe_single()`` raises once a second row exists, so the tenant's own
    dashboard started returning "not found" the moment a second manager added
    them. That is the bug reported for a tenant who moved: the new manager saw
    the tenancy, the tenant did not.
  * ``data[0]`` silently picks an arbitrary row, so ownership checks compared
    the payment or lease against the wrong tenant record and refused access.

These helpers return every tenant id for the user and check membership of that
set, which supports both moving between managers and renting more than one
property at the same time.
"""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


def tenant_ids_for_user(supabase: Any, user_id: Any) -> list[str]:
    """Every ``tenants.id`` linked to this auth user, newest first.

    Returns an empty list when the user is not a tenant anywhere, or when the
    lookup fails: callers treat that as "no tenant access", which is the safe
    outcome.
    """
    if not user_id:
        return []
    try:
        result = (
            supabase.table("tenants")
            .select("id, created_at")
            .eq("user_id", str(user_id))
            .execute()
        )
    except Exception as e:  # noqa: BLE001 - never 500 on an identity lookup
        logger.warning("Failed to resolve tenant ids for user %s: %s", user_id, e)
        return []

    rows = getattr(result, "data", None) or []
    rows.sort(key=lambda r: str(r.get("created_at") or ""), reverse=True)
    return [str(r["id"]) for r in rows if r.get("id")]


def primary_tenant_id_for_user(supabase: Any, user_id: Any) -> str | None:
    """The most recently created tenant record, or None.

    Only for places that genuinely need a single id, such as creating a new
    row on the tenant's behalf. Anything that checks ownership should use
    ``owns_tenant_record`` instead, so a tenant with several records is not
    locked out of all but one of them.
    """
    ids = tenant_ids_for_user(supabase, user_id)
    return ids[0] if ids else None


def owns_tenant_record(supabase: Any, user_id: Any, tenant_id: Any) -> bool:
    """True when ``tenant_id`` is one of this user's tenant records."""
    if not tenant_id:
        return False
    return str(tenant_id) in set(tenant_ids_for_user(supabase, user_id))
