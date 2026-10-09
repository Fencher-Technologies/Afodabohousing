"""Working out when the rent next falls due for revision.

The business asked for a rent revision clause whose date the system computes
and reminds both parties about: "if I agree with my tenant that we shall
increase rent every 2 years, the system should compute that date and notify
both the tenant and landlord when the time comes."

A revision schedule is two fields on the lease:

  * ``rent_revision_months``    the agreed interval, e.g. 24 for every two
                               years. Null means the rent is not on a
                               schedule, which is the default.
  * ``next_rent_revision_date`` the computed date, advanced each time a
                               revision is recorded.

The date is counted from the last revision if there has been one, otherwise
from the rent anchor (``rent_effective_date``), falling back to the tenancy
start. Counting from the anchor matters: it is the same date the rent ledger
bills from, so a review lands on a rent boundary rather than drifting.
"""

from __future__ import annotations

from datetime import date
from typing import Any

# A sanity bound. Monthly review is the shortest anyone plausibly agrees, and
# a decade is well past the longest; anything outside is a data-entry slip.
MIN_REVISION_MONTHS = 1
MAX_REVISION_MONTHS = 120


def _as_date(value: Any) -> date | None:
    if not value:
        return None
    if isinstance(value, date):
        return value
    try:
        return date.fromisoformat(str(value)[:10])
    except (TypeError, ValueError):
        return None


def add_months(start: date, months: int) -> date:
    """``start`` plus ``months`` calendar months, clamped to a real day.

    31 January plus one month is 28 (or 29) February, not an invalid date.
    """
    total = start.month - 1 + months
    year = start.year + total // 12
    month = total % 12 + 1

    # Step back from the day until the date exists in that month.
    day = start.day
    while day > 1:
        try:
            return date(year, month, day)
        except ValueError:
            day -= 1
    return date(year, month, 1)


def normalize_interval(months: Any) -> int | None:
    """The agreed interval as a sane integer, or None for "no schedule"."""
    if months in (None, "", 0):
        return None
    try:
        value = int(months)
    except (TypeError, ValueError):
        return None
    if value < MIN_REVISION_MONTHS or value > MAX_REVISION_MONTHS:
        return None
    return value


def compute_next_revision_date(
    lease: dict[str, Any],
    today: date | None = None,
) -> date | None:
    """When the rent next falls due for revision, or None if not scheduled.

    If several intervals have already elapsed (an old tenancy, or one nobody
    acted on), the date rolls forward to the next one still ahead rather than
    reporting a review that was due years ago. A date that is due today is
    returned as today, so the reminder fires.
    """
    months = normalize_interval(lease.get("rent_revision_months"))
    if months is None:
        return None

    anchor = (
        _as_date(lease.get("last_rent_revision_date"))
        or _as_date(lease.get("rent_effective_date"))
        or _as_date(lease.get("start_date"))
    )
    if anchor is None:
        return None

    today = today or date.today()
    nxt = add_months(anchor, months)

    # Roll forward over intervals that have already passed.
    guard = 0
    while nxt < today and guard < MAX_REVISION_MONTHS:
        nxt = add_months(nxt, months)
        guard += 1
    return nxt


def is_due(lease: dict[str, Any], today: date | None = None) -> bool:
    """True when the lease's recorded revision date has arrived."""
    today = today or date.today()
    due = _as_date(lease.get("next_rent_revision_date"))
    return due is not None and due <= today


def clause_placeholders(lease: dict[str, Any], today: date | None = None) -> dict[str, str]:
    """Values for the Rent Revision clause's ``{{...}}`` placeholders.

    Rendered into the agreement text so the clause states the actual interval
    and date the parties agreed, rather than generic wording.
    """
    months = normalize_interval(lease.get("rent_revision_months"))
    nxt = _as_date(lease.get("next_rent_revision_date")) or compute_next_revision_date(
        lease, today=today
    )
    return {
        "rent_revision_months": str(months) if months else "",
        "next_rent_revision_date": nxt.strftime("%d %B %Y") if nxt else "",
    }


def render_clause(content: str, lease: dict[str, Any], today: date | None = None) -> str:
    """Substitute the revision placeholders into a clause's text."""
    rendered = content
    for key, value in clause_placeholders(lease, today=today).items():
        rendered = rendered.replace("{{%s}}" % key, value)
    return rendered
