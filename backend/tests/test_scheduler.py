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

    async def send_in_app(self, *, recipient_id, title, body, metadata):
        self.in_app.append({
            "recipient_id": recipient_id,
            "title": title,
            "body": body,
            "metadata": metadata,
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
