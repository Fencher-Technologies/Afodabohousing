# mypy: ignore-errors
"""Rent revision scheduling.

The business asked that agreeing "we revise rent every 2 years" makes the
system compute that date and remind both parties when it arrives.
"""

from datetime import date

import pytest

from services.rent_revision import (
    add_months,
    clause_placeholders,
    compute_next_revision_date,
    is_due,
    normalize_interval,
    render_clause,
)


class TestAddMonths:
    def test_simple_advance(self):
        assert add_months(date(2026, 1, 15), 24) == date(2028, 1, 15)

    def test_wraps_the_year(self):
        assert add_months(date(2026, 11, 10), 3) == date(2027, 2, 10)

    def test_month_end_is_clamped_to_a_real_day(self):
        """31 January plus one month is the end of February, not an error."""
        assert add_months(date(2026, 1, 31), 1) == date(2026, 2, 28)

    def test_leap_year_month_end(self):
        assert add_months(date(2028, 1, 31), 1) == date(2028, 2, 29)

    def test_month_end_across_a_30_day_month(self):
        assert add_months(date(2026, 3, 31), 1) == date(2026, 4, 30)


class TestNormalizeInterval:
    @pytest.mark.parametrize("value", [None, "", 0, "abc", -6, 121])
    def test_nonsense_means_no_schedule(self, value):
        assert normalize_interval(value) is None

    @pytest.mark.parametrize("value,expected", [(1, 1), (24, 24), ("12", 12), (120, 120)])
    def test_sane_intervals_are_kept(self, value, expected):
        assert normalize_interval(value) == expected


class TestComputeNextRevisionDate:
    def test_no_interval_means_no_date(self):
        lease = {"rent_effective_date": "2026-01-01"}
        assert compute_next_revision_date(lease, today=date(2026, 6, 1)) is None

    def test_counts_from_the_rent_anchor(self):
        """The two-year example the business gave."""
        lease = {"rent_revision_months": 24, "rent_effective_date": "2026-01-01"}
        assert compute_next_revision_date(lease, today=date(2026, 6, 1)) == date(2028, 1, 1)

    def test_falls_back_to_the_tenancy_start(self):
        lease = {"rent_revision_months": 12, "start_date": "2026-03-10"}
        assert compute_next_revision_date(lease, today=date(2026, 6, 1)) == date(2027, 3, 10)

    def test_counts_from_the_last_revision_once_there_is_one(self):
        lease = {
            "rent_revision_months": 12,
            "rent_effective_date": "2020-01-01",
            "last_rent_revision_date": "2026-05-01",
        }
        assert compute_next_revision_date(lease, today=date(2026, 6, 1)) == date(2027, 5, 1)

    def test_rolls_past_intervals_nobody_acted_on(self):
        """An old tenancy must not report a review that was due years ago."""
        lease = {"rent_revision_months": 12, "rent_effective_date": "2020-01-01"}
        assert compute_next_revision_date(lease, today=date(2026, 6, 1)) == date(2027, 1, 1)

    def test_a_date_due_today_is_returned_so_the_reminder_fires(self):
        lease = {"rent_revision_months": 12, "rent_effective_date": "2026-01-01"}
        assert compute_next_revision_date(lease, today=date(2027, 1, 1)) == date(2027, 1, 1)

    def test_without_any_anchor_there_is_no_date(self):
        assert compute_next_revision_date({"rent_revision_months": 24}) is None


class TestIsDue:
    def test_due_on_the_day(self):
        assert is_due({"next_rent_revision_date": "2026-06-01"}, today=date(2026, 6, 1))

    def test_overdue_still_counts(self):
        assert is_due({"next_rent_revision_date": "2026-05-01"}, today=date(2026, 6, 1))

    def test_not_yet(self):
        assert not is_due({"next_rent_revision_date": "2026-07-01"}, today=date(2026, 6, 1))

    def test_no_schedule_is_never_due(self):
        assert not is_due({}, today=date(2026, 6, 1))


class TestClauseRendering:
    CLAUSE = (
        "The rent payable under this agreement shall be reviewed every "
        "{{rent_revision_months}} months, with the next review falling due on "
        "{{next_rent_revision_date}}."
    )

    def test_the_clause_states_the_agreed_terms(self):
        lease = {"rent_revision_months": 24, "rent_effective_date": "2026-01-01"}
        out = render_clause(self.CLAUSE, lease, today=date(2026, 6, 1))
        assert "every 24 months" in out
        assert "01 January 2028" in out
        assert "{{" not in out, "a placeholder was left in the agreement text"

    def test_placeholders_are_emptied_rather_than_left_showing(self):
        out = render_clause(self.CLAUSE, {}, today=date(2026, 6, 1))
        assert "{{" not in out

    def test_placeholders_prefer_the_stored_date(self):
        lease = {
            "rent_revision_months": 12,
            "rent_effective_date": "2026-01-01",
            "next_rent_revision_date": "2026-09-30",
        }
        assert clause_placeholders(lease)["next_rent_revision_date"] == "30 September 2026"
