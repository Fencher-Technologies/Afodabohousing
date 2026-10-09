"""Wording for every notification Axis sends.

All notification text lives here so the same event reads identically whether
it arrives as a push, an in-app alert or an email, and so the business can
have its phrasing changed in one file rather than hunting through routers and
schedulers.

House style, taken from the wording the business supplied:

  * Address people by first name: "Hello Eric, ...".
  * Name the tenant and the place: "your tenant Yonah of Kololo".
  * Say the amount with its currency: "UGX 500,000".
  * Keep each message to one short paragraph. These are read on a phone
    lock screen, so they must survive truncation and read like a message
    from X or Facebook rather than a letter.

Every function returns a ``(title, body)`` pair.
"""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)

from currency import DEFAULT_CURRENCY  # noqa: F401  (re-exported for callers)


# ─── Small helpers ───────────────────────────────────────────────────────


def _one(
    supabase: Any,
    table: str,
    column: str,
    value: Any,
    select: str = "*",
) -> dict[str, Any]:
    """One row, or an empty dict.

    Notification copy must never be the reason an action fails, so a lookup
    that errors degrades to "no extra detail" instead of raising.
    """
    if value in (None, ""):
        return {}
    try:
        res = (
            supabase.table(table)
            .select(select)
            .eq(column, str(value))
            .limit(1)
            .execute()
        )
        rows = getattr(res, "data", None) or []
        return rows[0] if rows else {}
    except Exception as e:  # noqa: BLE001 - copy is never worth an exception
        logger.debug("notification_copy lookup failed on %s.%s: %s", table, column, e)
        return {}


def first_name(full_name: Any, fallback: str = "there") -> str:
    """"Eric Mukasa" -> "Eric". Falls back when the name is missing."""
    if not full_name:
        return fallback
    parts = str(full_name).strip().split()
    return parts[0] if parts else fallback


def user_first_name(supabase: Any, user_id: Any, fallback: str = "your manager") -> str:
    """First name of a profile, by user id."""
    profile = _one(supabase, "profiles", "user_id", user_id, "full_name")
    return first_name(profile.get("full_name"), fallback)


def with_place(name: str, place: str | None) -> str:
    """"Yonah" + "Kololo" -> "Yonah of Kololo"."""
    if place:
        return f"{name} of {place}"
    return name


def money(amount: Any, currency: str | None = None) -> str:
    """"UGX 500,000".

    Rounded to whole currency units: a reminder read on a lock screen is
    clearer without trailing cents, and the exact figure is always available
    on the receipt and in the dashboard.
    """
    cur = (currency or DEFAULT_CURRENCY).strip() or DEFAULT_CURRENCY
    try:
        value = float(amount or 0)
    except (TypeError, ValueError):
        return f"{cur} {amount}"
    return f"{cur} {round(value):,}"


def lease_context(supabase: Any, lease: dict[str, Any] | None) -> dict[str, Any]:
    """Names and currency around a lease, for use in message text.

    Accepts a lease row or anything carrying ``lease_id``/``tenant_id``/
    ``owner_id`` (a payment or a verification submission, for instance), so
    callers can hand over whatever row they already have.

    Returns ``tenant``, ``manager``, ``place`` and ``currency``, each already
    defaulted to something safe to print.
    """
    lease = lease or {}

    # Callers may pass a payment-shaped row that only references the lease.
    if not lease.get("owner_id") and lease.get("lease_id"):
        lease = {**_one(supabase, "leases", "id", lease.get("lease_id")), **lease}

    tenant_name = lease.get("tenant_name")
    if not tenant_name and lease.get("tenant_id"):
        tenant = _one(
            supabase, "tenants", "id", lease.get("tenant_id"), "first_name,last_name"
        )
        tenant_name = " ".join(
            p for p in (tenant.get("first_name"), tenant.get("last_name")) if p
        )

    manager_name = lease.get("manager_name")
    if not manager_name and lease.get("owner_id"):
        manager_name = _one(
            supabase, "profiles", "user_id", lease.get("owner_id"), "full_name"
        ).get("full_name")

    place = lease.get("property_title")
    currency = lease.get("currency")
    if (not place or not currency) and lease.get("property_id"):
        prop = _one(
            supabase, "properties", "id", lease.get("property_id"), "title,currency"
        )
        place = place or prop.get("title")
        currency = currency or prop.get("currency")

    return {
        "tenant": first_name(tenant_name, "your tenant"),
        "manager": first_name(manager_name, "your manager"),
        "place": place or None,
        "currency": (currency or DEFAULT_CURRENCY),
    }


# ─── Rent reminders ──────────────────────────────────────────────────────


def rent_due_for_manager(
    manager_name: str,
    tenant_name: str,
    place: str | None,
    amount: Any,
    currency: str | None = None,
) -> tuple[str, str]:
    """Arrears alert to the house manager. Wording supplied by the business."""
    who = with_place(tenant_name, place)
    return (
        "Your tenant's rent is due",
        f"Hello {manager_name}, your tenant {who} is now due for rent payment of "
        f"{money(amount, currency)}. Please follow up to put money in your pocket. Thank you.",
    )


def rent_due_for_tenant(
    tenant_name: str,
    amount: Any,
    currency: str | None = None,
    in_arrears: bool = True,
    next_due_date: Any = None,
) -> tuple[str, str]:
    """Reminder to the tenant, either already overdue or falling due shortly."""
    if in_arrears:
        return (
            "Your rent is due",
            f"Hello {tenant_name}, your rent of {money(amount, currency)} is now due. "
            "Kindly make payment today. Thank you.",
        )
    when = f" on {str(next_due_date)[:10]}" if next_due_date else " soon"
    return (
        "Your rent is due soon",
        f"Hello {tenant_name}, your rent of {money(amount, currency)} falls due{when}. "
        "Kindly arrange payment in good time. Thank you.",
    )


# ─── Payments ────────────────────────────────────────────────────────────


def payment_submitted_for_manager(
    tenant_name: str,
    place: str | None,
    amount: Any,
    currency: str | None = None,
) -> tuple[str, str]:
    who = with_place(tenant_name, place)
    return (
        "Payment pending approval",
        f"{who} has submitted a rent payment of {money(amount, currency)} for your approval. "
        "Please review it in Axis to confirm or reject.",
    )


def payment_approved_for_tenant(
    approver_name: str,
    amount: Any,
    currency: str | None = None,
) -> tuple[str, str]:
    return (
        "Payment approved",
        f"{approver_name} has approved your payment of {money(amount, currency)}. "
        "Your receipt is ready to download in Axis.",
    )


def payment_rejected_for_tenant(
    rejecter_name: str,
    amount: Any,
    currency: str | None = None,
    reason: str | None = None,
) -> tuple[str, str]:
    tail = f" Reason: {reason.strip()}" if reason and reason.strip() else ""
    return (
        "Payment rejected",
        f"{rejecter_name} could not approve your payment of {money(amount, currency)}."
        f"{tail} Please get in touch with your house manager.",
    )


# ─── Tenancy agreements ──────────────────────────────────────────────────


def agreement_drafted_for_tenant(actor_label: str) -> tuple[str, str]:
    return (
        "Tenancy agreement ready",
        f"{actor_label} has drafted your tenancy agreement. "
        "Please open Axis to read it and either approve it or request changes.",
    )


def agreement_approved(actor_label: str) -> tuple[str, str]:
    return (
        "Agreement approved",
        f"{actor_label} has approved the tenancy agreement. "
        "A signed copy is available in Axis.",
    )


def agreement_rejected(actor_label: str, reason: str | None = None) -> tuple[str, str]:
    tail = f" Comments: {reason.strip()}" if reason and reason.strip() else ""
    return (
        "Changes requested",
        f"{actor_label} has requested changes to the tenancy agreement.{tail} "
        "Please review the comments in Axis and send an updated version.",
    )


def agreement_cancelled_for_tenant(actor_label: str) -> tuple[str, str]:
    return (
        "Agreement cancelled",
        f"{actor_label} has cancelled the tenancy agreement. "
        "Please contact your house manager if you were expecting it.",
    )


# ─── Rent revision ───────────────────────────────────────────────────────


def rent_revision_for_manager(
    manager_name: str,
    tenant_name: str,
    place: str | None,
    revision_date: Any,
    amount: Any = None,
    currency: str | None = None,
) -> tuple[str, str]:
    who = with_place(tenant_name, place)
    current = f" The current rent is {money(amount, currency)}." if amount else ""
    return (
        "Rent revision due",
        f"Hello {manager_name}, the rent for your tenant {who} is due for revision on "
        f"{str(revision_date)[:10]}.{current} Please agree the new rent with your tenant "
        "and update it in Axis.",
    )


def rent_revision_for_tenant(
    tenant_name: str,
    place: str | None,
    revision_date: Any,
    amount: Any = None,
    currency: str | None = None,
) -> tuple[str, str]:
    where = f" for {place}" if place else ""
    current = f" The current rent is {money(amount, currency)}." if amount else ""
    return (
        "Rent revision due",
        f"Hello {tenant_name}, your rent{where} is due for revision on "
        f"{str(revision_date)[:10]}.{current} Your house manager will be in touch to "
        "agree the new rent.",
    )
