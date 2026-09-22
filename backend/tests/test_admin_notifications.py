# mypy: ignore-errors
from types import SimpleNamespace

import services.notifications as n


class Q:
    def __init__(self, rows): self.rows = rows
    def select(self, *_a, **_k): return self
    def eq(self, col, val):
        self.rows = [r for r in self.rows if str(r.get(col)) == str(val)]; return self
    def limit(self, _): return self
    def execute(self): return SimpleNamespace(data=self.rows)


class SB:
    def __init__(self, profiles): self.profiles = profiles
    def table(self, _name): return Q(list(self.profiles))


def test_notify_admins_reaches_every_super_admin(monkeypatch):
    sent = []
    monkeypatch.setattr(n, "notify", lambda _sb, **kw: sent.append(kw["recipient_id"]))
    sb = SB([
        {"user_id": "a1", "role": "super_admin"},
        {"user_id": "a2", "role": "super_admin"},
        {"user_id": "m1", "role": "house_manager"},
    ])
    assert n.notify_admins(sb, type="admin_new_property", title="t", body="b") == 2
    assert sorted(sent) == ["a1", "a2"]


def test_one_failing_admin_does_not_stop_the_rest(monkeypatch):
    sent = []
    def fake(_sb, **kw):
        if kw["recipient_id"] == "a1":
            raise RuntimeError("boom")
        sent.append(kw["recipient_id"])
    monkeypatch.setattr(n, "notify", fake)
    sb = SB([{"user_id": "a1", "role": "super_admin"}, {"user_id": "a2", "role": "super_admin"}])
    assert n.notify_admins(sb, type="x", title="t", body="b") == 1
    assert sent == ["a2"]


def test_pdf_download_is_not_emailed(monkeypatch):
    emailed = []
    monkeypatch.setattr(n, "create_notification", lambda *a, **k: None)
    monkeypatch.setattr(n, "send_push_notification", lambda *a, **k: None)
    monkeypatch.setattr(n, "send_notification_email", lambda *a, **k: emailed.append(k["title"]))
    n.notify(None, recipient_id="u", type="pdf_downloaded", title="PDF", body="b")
    n.notify(None, recipient_id="u", type="payment_verified", title="Paid", body="b")
    assert emailed == ["Paid"]
