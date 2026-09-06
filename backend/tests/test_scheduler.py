from datetime import date, timedelta

import pytest

from services.scheduler import process_tenancy_expiry_reminders


class MockResponse:
    def __init__(self, data=None):
        self.data = data or []


class MockQuery:
    def __init__(self, supabase, table_name):
        self.supabase = supabase
        self.table_name = table_name
        self.filters = []
        self.inserted = None

    def select(self, *_args, **_kwargs):
        return self

    def eq(self, column, value):
        self.filters.append(("eq", column, value))
        return self

    def gte(self, column, value):
        self.filters.append(("gte", column, value))
        return self

    def lte(self, column, value):
        self.filters.append(("lte", column, value))
        return self

    def in_(self, column, values):
        self.filters.append(("in", column, list(values)))
        return self

    def insert(self, payload):
        self.inserted = payload
        return self

    def execute(self):
        if self.inserted is not None:
            record = {"id": f"{self.table_name}-{len(self.supabase.tables[self.table_name]) + 1}", **self.inserted}
            self.supabase.tables[self.table_name].append(record)
            return MockResponse([record])

        data = list(self.supabase.tables.get(self.table_name, []))
        for op, column, value in self.filters:
            if op == "eq":
                data = [item for item in data if item.get(column) == value]
            elif op == "in":
                data = [item for item in data if item.get(column) in value]
            elif op == "gte":
                data = [item for item in data if item.get(column) >= value]
            elif op == "lte":
                data = [item for item in data if item.get(column) <= value]
        return MockResponse(data)


class MockSupabase:
    def __init__(self, tables):
        self.tables = tables

    def table(self, table_name):
        return MockQuery(self, table_name)


class FakeDispatcher:
    def __init__(self, existing=None):
        self.existing = set(existing or [])
        self.in_app = []
        self.emails = []
        self.pushes = []
        self.deliveries = []

    async def has_delivery(self, event_key, channel):
        return (event_key, channel) in self.existing

    async def record_delivery(self, *, event_key, channel, recipient_id, status, error=None):
        self.existing.add((event_key, channel))
        self.deliveries.append({
            "event_key": event_key,
            "channel": channel,
            "recipient_id": recipient_id,
            "status": status,
            "error": error,
        })

    async def send_in_app(self, *, recipient_id, title, body, metadata, type=None):
        self.in_app.append({
            "recipient_id": recipient_id,
            "title": title,
            "body": body,
            "metadata": metadata,
            "type": type,
        })

    async def send_email(self, *, to_email, subject, body):
        self.emails.append({"to_email": to_email, "subject": subject, "body": body})
        return True

    async def send_push(self, *, recipient_id, title, body):
        self.pushes.append({"recipient_id": recipient_id, "title": title, "body": body})
        return True


def build_supabase(today):
    milestone_days = [30, 14, 7, 1, 0]
    leases = [
        {
            "id": f"lease-{days_left}",
            "owner_id": "owner-1",
            "property_id": "property-1",
            "tenant_id": "tenant-1",
            "end_date": (today + timedelta(days=days_left)).isoformat(),
            "status": "active",
        }
        for days_left in milestone_days
    ]
    leases.extend([
        {
            "id": "lease-2",
            "owner_id": "owner-1",
            "property_id": "property-1",
            "tenant_id": "tenant-1",
            "end_date": (today + timedelta(days=2)).isoformat(),
            "status": "active",
        },
        {
            "id": "lease-31",
            "owner_id": "owner-1",
            "property_id": "property-1",
            "tenant_id": "tenant-1",
            "end_date": (today + timedelta(days=31)).isoformat(),
            "status": "active",
        },
    ])
    return MockSupabase({
        "leases": leases,
        "tenants": [
            {
                "id": "tenant-1",
                "user_id": "user-tenant-1",
                "email": "tenant@example.com",
                "first_name": "Test",
                "last_name": "Tenant",
            }
        ],
        "properties": [{"id": "property-1", "title": "Ntinda Apartment"}],
        "notifications": [],
        "notification_deliveries": [],
    })


@pytest.mark.asyncio
async def test_tenancy_expiry_reminders_fire_for_required_milestones():
    today = date(2026, 7, 7)
    supabase = build_supabase(today)
    dispatcher = FakeDispatcher()

    attempted = await process_tenancy_expiry_reminders(
        supabase,
        today=today,
        dispatcher=dispatcher,
    )

    assert attempted == 15
    assert len(dispatcher.in_app) == 5
    assert len(dispatcher.emails) == 5
    assert len(dispatcher.pushes) == 5
    assert {delivery["status"] for delivery in dispatcher.deliveries} == {"sent"}
    assert {item["metadata"]["days_left"] for item in dispatcher.in_app} == {30, 14, 7, 1, 0}
    assert dispatcher.emails[0]["to_email"] == "tenant@example.com"
    assert any(message["title"] == "Your tenancy expires today" for message in dispatcher.in_app)


@pytest.mark.asyncio
async def test_tenancy_expiry_reminders_are_idempotent_per_channel():
    today = date(2026, 7, 7)
    supabase = MockSupabase({
        "leases": [
            {
                "id": "lease-7",
                "owner_id": "owner-1",
                "property_id": "property-1",
                "tenant_id": "tenant-1",
                "end_date": (today + timedelta(days=7)).isoformat(),
                "status": "active",
            }
        ],
        "tenants": [{"id": "tenant-1", "user_id": "user-tenant-1", "email": "tenant@example.com"}],
        "properties": [{"id": "property-1", "title": "Ntinda Apartment"}],
        "notifications": [],
        "notification_deliveries": [],
    })
    dispatcher = FakeDispatcher({
        ("lease_expiry:lease-7:7", "in_app"),
        ("lease_expiry:lease-7:7", "email"),
        ("lease_expiry:lease-7:7", "push"),
    })

    attempted = await process_tenancy_expiry_reminders(
        supabase,
        today=today,
        dispatcher=dispatcher,
    )

    assert attempted == 0
    assert dispatcher.in_app == []
    assert dispatcher.emails == []
    assert dispatcher.pushes == []


@pytest.mark.asyncio
async def test_rent_reminders_fire_on_money_ledger_due_dates():
    from services.scheduler import check_rent_reminders

    today = date(2026, 7, 29)
    # next_payment_due_date now tracks rent coverage rather than a fixed
    # 30-day grid, so both anchored leases with arrears read as overdue.
    anchor = "2026-07-01"  # 28 days elapsed, 100k paid -> cover ran out, overdue
    far_anchor = "2026-07-03"  # 26 days elapsed, nothing paid -> overdue

    supabase = MockSupabase({
        "leases": [
            {
                "id": "lease-arrears",
                "owner_id": "owner-1",
                "property_id": "property-1",
                "tenant_id": "tenant-1",
                "monthly_rent": 500000,
                "status": "active",
                "start_date": (today - timedelta(days=100)).isoformat(),
                "end_date": (today + timedelta(days=200)).isoformat(),
                "rent_effective_date": anchor,
            },
            {
                "id": "lease-paid-up",
                "owner_id": "owner-1",
                "property_id": "property-1",
                "tenant_id": "tenant-1",
                "monthly_rent": 500000,
                "status": "active",
                "start_date": (today - timedelta(days=100)).isoformat(),
                "end_date": (today + timedelta(days=200)).isoformat(),
                "rent_effective_date": anchor,
            },
            {
                "id": "lease-no-anchor",
                "owner_id": "owner-1",
                "property_id": "property-1",
                "tenant_id": "tenant-1",
                "monthly_rent": 500000,
                "status": "active",
                "start_date": (today - timedelta(days=100)).isoformat(),
                "end_date": (today + timedelta(days=200)).isoformat(),
                "rent_effective_date": None,
            },
            {
                "id": "lease-far",
                "owner_id": "owner-1",
                "property_id": "property-1",
                "tenant_id": "tenant-1",
                "monthly_rent": 500000,
                "status": "active",
                "start_date": (today - timedelta(days=100)).isoformat(),
                "end_date": (today + timedelta(days=200)).isoformat(),
                "rent_effective_date": far_anchor,
            },
        ],
        "payments": [
            {"lease_id": "lease-arrears", "payment_type": "rent", "status": "confirmed", "amount": 100000},
            {"lease_id": "lease-paid-up", "payment_type": "rent", "status": "confirmed", "amount": 1000000},
            {"lease_id": "lease-paid-up", "payment_type": "rent", "status": "pending", "amount": 9999999},
        ],
        "tenants": [
            {"id": "tenant-1", "user_id": "user-tenant-1", "email": "tenant@example.com"}
        ],
        "properties": [{"id": "property-1", "title": "Ntinda Apartment"}],
        "notifications": [],
        "notification_deliveries": [],
    })
    dispatcher = FakeDispatcher()

    await check_rent_reminders(supabase, today=today, dispatcher=dispatcher)

    # Only the arrears lease within the 1-3 day window is reminded.
    # Both anchored leases carry arrears, so both are reminded. The
    # unanchored lease and the paid-up lease are still skipped.
    assert len(dispatcher.in_app) == 2
    assert len(dispatcher.emails) == 2
    assert len(dispatcher.pushes) == 2
    assert {m["metadata"]["lease_id"] for m in dispatcher.in_app} == {"lease-arrears", "lease-far"}

    message = next(m for m in dispatcher.in_app if m["metadata"]["lease_id"] == "lease-arrears")
    assert message["title"] == "Rent overdue"
    assert message["metadata"]["next_payment_due_date"] == "2026-07-29"
    assert message["metadata"]["days_until_due"] == 0
    # Money owed = accrued (466,666.67) minus 100,000 confirmed.
    assert round(message["metadata"]["amount"], 2) == round(366666.67, 2)
    assert "UGX 366,667" in message["body"]
    assert {d["event_key"] for d in dispatcher.deliveries} == {
        "rent_reminder:lease-arrears:0",
        "rent_reminder:lease-far:0",
    }
    assert {d["channel"] for d in dispatcher.deliveries} == {"in_app", "email", "push"}


# ── Subscription expiry sweep ───────────────────────────────────────────────

class MockSweepQuery:
    def __init__(self, tables, table_name):
        self.tables = tables
        self.table_name = table_name
        self._filters = {}
        self._update = None

    def select(self, *_args, **_kwargs):
        return self

    def update(self, payload):
        self._update = payload
        return self

    def eq(self, column, value):
        self._filters[column] = ("eq", value)
        return self

    def lt(self, column, value):
        self._filters[column] = ("lt", value)
        return self

    def execute(self):
        rows = self.tables[self.table_name]
        matched = [
            r for r in rows
            if all(_match_sweep(r, column, op, value) for column, (op, value) in self._filters.items())
        ]
        if self._update is not None:
            updated = []
            for r in matched:
                idx = rows.index(r)
                new_row = {**r, **self._update}
                rows[idx] = new_row
                updated.append(new_row)
            return MockResponse(updated)
        return MockResponse(matched)


class MockSweepSupabase:
    def __init__(self, tables):
        self.tables = tables

    def table(self, table_name):
        return MockSweepQuery(self.tables, table_name)


def _match_sweep(row, column, op, value):
    if op == "eq":
        return row.get(column) == value
    if op == "lt":
        return row.get(column, "") < value
    return True


def _build_subscription_rows():
    return [
        {
            "id": "sub-past",
            "manager_id": "manager-1",
            "status": "active",
            "expires_at": "2020-01-01T00:00:00Z",
        },
        {
            "id": "sub-future",
            "manager_id": "manager-2",
            "status": "active",
            "expires_at": "2126-07-08T00:00:00Z",
        },
        {
            "id": "sub-already-expired",
            "manager_id": "manager-3",
            "status": "expired",
            "expires_at": "2020-01-01T00:00:00Z",
        },
    ]


def test_expire_subscriptions_sweep_flips_only_past_active_rows():
    from services.subscriptions import SubscriptionService

    supabase = MockSweepSupabase({
        "manager_subscriptions": _build_subscription_rows(),
    })
    svc = SubscriptionService(supabase)
    count = svc.expire_subscriptions()

    assert count == 1
    statuses = {r["id"]: r["status"] for r in supabase.tables["manager_subscriptions"]}
    assert statuses["sub-past"] == "expired"
    assert statuses["sub-future"] == "active"
    assert statuses["sub-already-expired"] == "expired"


@pytest.mark.parametrize("environment", ["production", "development"])
def test_start_scheduler_registers_subscription_sweep(monkeypatch, environment):
    from types import SimpleNamespace

    from services.scheduler import (
        scheduler,
        start_scheduler,
        expire_subscriptions,
    )

    registered = []
    monkeypatch.setattr(scheduler, "add_job", lambda func, trigger, **kwargs: registered.append(func))
    monkeypatch.setattr(scheduler, "start", lambda: None)
    monkeypatch.setattr(
        "services.scheduler.get_settings",
        lambda: SimpleNamespace(environment=environment),
    )

    start_scheduler()

    assert expire_subscriptions in registered
