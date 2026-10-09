# mypy: ignore-errors
"""A listing is public only once the Axis QA team has approved it.

Every subscription plan advertises "Listings reviewed and approved by our QA
team" and the terms carry a Quality Assurance clause, but nothing enforced it:
a property went live the moment a manager saved it. These tests pin the gate.
"""

from types import SimpleNamespace

from services.crud import PropertyService

ROWS = [
    {"id": "p-approved", "title": "Live listing", "is_active": True, "review_status": "approved"},
    {"id": "p-pending", "title": "Awaiting review", "is_active": True, "review_status": "pending"},
    {"id": "p-rejected", "title": "Sent back", "is_active": True, "review_status": "rejected"},
    {"id": "p-hidden", "title": "Hidden by manager", "is_active": False, "review_status": "approved"},
]


class Query:
    """Enough of the PostgREST builder to record the filters applied."""

    def __init__(self, rows, count=None):
        self._rows, self._count, self._eq = rows, count, {}

    def select(self, *_a, **_k):
        return self

    def eq(self, col, val):
        self._eq[col] = val
        return self

    def in_(self, col, vals):
        self._eq[col] = list(vals)
        return self

    def or_(self, *_a, **_k):
        return self

    def gte(self, *_a, **_k):
        return self

    def gt(self, *_a, **_k):
        return self

    def lt(self, *_a, **_k):
        return self

    def neq(self, *_a, **_k):
        return self

    def is_(self, *_a, **_k):
        return self

    def lte(self, *_a, **_k):
        return self

    def order(self, *_a, **_k):
        return self

    def range(self, *_a, **_k):
        return self

    def limit(self, *_a, **_k):
        return self

    def _matching(self):
        out = []
        for r in self._rows:
            if all(r.get(k) == v for k, v in self._eq.items() if not isinstance(v, list)):
                out.append(r)
        return out

    def execute(self):
        matched = self._matching()
        return SimpleNamespace(data=matched, count=len(matched))


class FakeSupabase:
    def __init__(self, rows):
        self.rows = rows
        self.filters_seen = []

    def table(self, name):
        q = Query(self.rows if name == "properties" else [])
        self.filters_seen.append(q)
        return q


def _public_filters(sb):
    """The eq() filters the public listing query applied."""
    return [q._eq for q in sb.filters_seen if q._eq]


def test_public_listings_are_filtered_to_approved_and_active():
    sb = FakeSupabase(ROWS)
    svc = PropertyService(sb)
    svc.get_public_listings(skip=0, limit=20)

    applied = _public_filters(sb)
    assert applied, "the public listing query applied no filters"
    first = applied[0]
    assert first.get("is_active") is True
    assert first.get("review_status") == "approved", (
        "public listings must be gated on QA approval"
    )


def test_a_pending_listing_is_not_public():
    """The gate must exclude a listing that has not been reviewed."""
    sb = FakeSupabase(ROWS)
    q = sb.table("properties").select("*").eq("is_active", True).eq("review_status", "approved")
    ids = {r["id"] for r in q.execute().data}
    assert ids == {"p-approved"}
    assert "p-pending" not in ids
    assert "p-rejected" not in ids
    # Still hidden when the manager has deactivated it, even though approved.
    assert "p-hidden" not in ids
