# mypy: ignore-errors
from dependencies import CurrentUser
from tests.conftest import UID_OWNER

MANAGER = CurrentUser(id=UID_OWNER, email="test@test.com", role="authenticated")


def test_report_pdf_returns_pdf(seeded_client):
    client = seeded_client(user=MANAGER, seeds=None)
    resp = client.get("/exports/report-pdf")
    assert resp.status_code == 200, resp.text[:300]
    assert resp.headers["content-type"] == "application/pdf"
    assert resp.content[:5] == b"%PDF-"
    assert len(resp.content) > 5000


def test_report_pdf_accepts_period_filter(seeded_client):
    client = seeded_client(user=MANAGER, seeds=None)
    resp = client.get("/exports/report-pdf?start_date=2026-01-01&end_date=2026-12-31")
    assert resp.status_code == 200, resp.text[:300]
    assert resp.headers["content-type"] == "application/pdf"
    assert resp.content[:5] == b"%PDF-"
