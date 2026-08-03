# mypy: ignore-errors
from datetime import date

import pytest

from dependencies import get_current_user
from main import app
from services.crud import LeaseService
from tests.conftest import MockSupabaseClient, MockTableBuilder

UID_OWNER = "00000000-0000-0000-0000-000000000001"
UID_TENANT_USER = "00000000-0000-0000-0000-000000000002"
PID_LEASE = "00000000-0000-0000-0000-000000000030"


@pytest.fixture
def owner_client(client):
    from dependencies import CurrentUser

    owner = CurrentUser(id=UID_OWNER, email="owner@test.com", role="house_manager", status="active")
    app.dependency_overrides[get_current_user] = lambda: owner
    return client


@pytest.fixture
def tenant_client(client):
    from dependencies import CurrentUser

    tenant = CurrentUser(
        id=UID_TENANT_USER,
        email="tenant@test.com",
        role="tenant",
        status="active",
    )
    app.dependency_overrides[get_current_user] = lambda: tenant
    return client


class TestRenewKeepsRentAccountingUntouched:
    def test_renew_updates_only_end_date_and_status(self, mock_supabase):
        history_builders = []
        orig_table = mock_supabase.table

        def table(name):
            builder = orig_table(name)
            if name == "renewal_history":
                history_builders.append(builder)
            return builder

        mock_supabase.table = table
        service = LeaseService(mock_supabase)

        result = service.renew(PID_LEASE, UID_OWNER, date(2027, 1, 31))

        assert result["id"] == PID_LEASE
        assert result["end_date"] == "2027-01-31"
        assert result["status"] == "active"
        assert result["start_date"] == "2026-01-01"
        assert float(result["monthly_rent"]) == 1500000.0

    def test_renew_records_audit_trail(self, mock_supabase):
        history_builders = []
        orig_table = mock_supabase.table

        def table(name):
            builder = orig_table(name)
            if name == "renewal_history":
                history_builders.append(builder)
            return builder

        mock_supabase.table = table
        service = LeaseService(mock_supabase)

        service.renew(PID_LEASE, UID_OWNER, date(2027, 1, 31))

        assert len(history_builders) == 1
        record = history_builders[0]._inserted
        assert record["lease_id"] == PID_LEASE
        assert record["previous_end_date"] == "2026-12-31"
        assert record["new_end_date"] == "2027-01-31"
        assert record["renewed_by"] == UID_OWNER
        assert float(record["monthly_rent"]) == 1500000.0

    def test_renew_rejects_past_or_equal_end_date(self, mock_supabase):
        service = LeaseService(mock_supabase)
        with pytest.raises(ValueError):
            service.renew(PID_LEASE, UID_OWNER, date(2026, 12, 31))


class TestRenewalHistoryListing:
    def _seeded_supabase(self):
        rows = [
            {
                "id": "91000000-0000-0000-0000-000000000001",
                "lease_id": PID_LEASE,
                "previous_end_date": "2026-12-31",
                "new_end_date": "2027-01-31",
                "monthly_rent": 1500000,
                "notes": "One-year extension",
                "renewed_by": UID_OWNER,
                "created_at": "2026-08-03T09:00:00Z",
            }
        ]

        class SeededSupabase(MockSupabaseClient):
            def table(self, name):
                if name == "renewal_history":
                    builder = MockTableBuilder(name)
                    builder._seed_data = lambda: rows
                    return builder
                return super().table(name)

        return SeededSupabase()

    def test_renewal_history_resolves_renewing_user_name(self, mock_supabase):
        service = LeaseService(self._seeded_supabase())

        items = service.renewal_history(PID_LEASE, UID_OWNER)

        assert len(items) == 1
        assert items[0]["previous_end_date"] == "2026-12-31"
        assert items[0]["new_end_date"] == "2027-01-31"
        assert items[0]["renewed_by_name"] == "Test User"
        assert items[0]["renewed_at"] == "2026-08-03T09:00:00Z"

    def test_renewal_history_denies_unauthorized_user(self, mock_supabase):
        service = LeaseService(self._seeded_supabase())
        with pytest.raises(PermissionError):
            service.renewal_history(PID_LEASE, UID_TENANT_USER)

    def test_renewal_history_endpoint_returns_empty_list(self, owner_client):
        response = owner_client.get(f"/leases/{PID_LEASE}/renewal-history")
        assert response.status_code == 200
        assert response.json() == []

    def test_renewal_history_endpoint_denies_foreign_tenant(self, tenant_client):
        response = tenant_client.get(f"/leases/{PID_LEASE}/renewal-history")
        assert response.status_code == 403
