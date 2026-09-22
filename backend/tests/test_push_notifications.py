# mypy: ignore-errors
from types import SimpleNamespace

import services.notifications as n


class Q:
    def __init__(self, sb): self.sb, self.op, self.filters = sb, "select", {}
    def select(self, *_a, **_k): return self
    def eq(self, col, val): self.filters[col] = val; return self
    def delete(self): self.op = "delete"; return self
    def in_(self, col, vals): self.filters[col] = list(vals); return self
    def execute(self):
        if self.op == "delete":
            self.sb.deleted.extend(self.filters["token"])
            return SimpleNamespace(data=[])
        return SimpleNamespace(data=[{"token": t} for t in self.sb.tokens])


class SB:
    def __init__(self, tokens): self.tokens, self.deleted = tokens, []
    def table(self, _): return Q(self)


def test_push_counts_delivered_and_removes_uninstalled_devices(monkeypatch):
    sent = {}
    def fake_post(url, json, headers, timeout):
        sent["messages"] = json
        return SimpleNamespace(
            raise_for_status=lambda: None,
            json=lambda: {"data": [
                {"status": "ok"},
                {"status": "error", "details": {"error": "DeviceNotRegistered"}},
            ]},
        )
    monkeypatch.setattr(n.httpx, "post", fake_post)
    sb = SB(["ExponentPushToken[a]", "ExponentPushToken[b]"])

    assert n.send_push_notification(sb, recipient_id="u1", title="T", body="B") == 1
    assert sb.deleted == ["ExponentPushToken[b]"]
    assert all(m["channelId"] == "default" for m in sent["messages"])


def test_no_devices_means_no_request(monkeypatch):
    monkeypatch.setattr(n.httpx, "post", lambda *a, **k: (_ for _ in ()).throw(AssertionError("called")))
    assert n.send_push_notification(SB([]), recipient_id="u1", title="T", body="B") == 0
