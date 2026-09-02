from datetime import UTC, datetime, timedelta
from services.subscriptions import SubscriptionService

class FakeTable:
    def __init__(self, rows):
        self.rows = rows
        self.filters = []
    def select(self, *a, **kw): return self
    def eq(self, k, v):
        self.filters.append(('eq', k, v)); return self
    def gt(self, k, v):
        self.filters.append(('gt', k, v)); return self
    def order(self, col, desc=False):
        self._order = (col, desc); return self
    def limit(self, n):
        self._limit = n; return self
    def execute(self):
        from types import SimpleNamespace
        data = list(self.rows)
        for op, k, v in self.filters:
            if op == 'eq': data = [r for r in data if str(r.get(k)) == str(v)]
            elif op == 'gt': data = [r for r in data if str(r.get(k, '')) > str(v)]
        if hasattr(self, '_order'):
            col, desc = self._order
            data = sorted(data, key=lambda x: str(x.get(col, '')), reverse=desc)
        if hasattr(self, '_limit'): data = data[:self._limit]
        self.filters = []
        return SimpleNamespace(data=data)

class FakeSupabase:
    def __init__(self, rows): self.rows = rows
    def table(self, name):
        if name == "manager_subscriptions": return FakeTable(self.rows)
        if name == "subscription_plans":
            return FakeTable([{"id":"plan1","name":"Test","duration_days":30,"price_ugx":500,"price_usd":0.14,"is_active":True,"sort_order":1}])
        return FakeTable([])

def test_active_prioritized_over_newer_pending():
    now = datetime.now(UTC)
    active = {"id":"active-1","manager_id":"m1","plan_id":"plan1","status":"active","payment_status":"completed","payment_reference":"ref-active","started_at":now.isoformat(),"expires_at":(now+timedelta(days=30)).isoformat(),"created_at":(now-timedelta(hours=1)).isoformat()}
    pending = {"id":"pending-2","manager_id":"m1","plan_id":"plan1","status":"pending","payment_status":"pending","payment_reference":"ref-pending","started_at":None,"expires_at":None,"created_at":now.isoformat()}
    svc = SubscriptionService(FakeSupabase([active, pending]))
    raw = svc.get_current_subscription_raw("m1")
    assert raw["id"] == "active-1", "active must be returned even though pending is newer"
    assert svc.get_current_subscription("m1").status == "active"

def test_expired_active_not_prioritized():
    now = datetime.now(UTC)
    expired = {"id":"expired-1","manager_id":"m1","plan_id":"plan1","status":"active","payment_status":"completed","payment_reference":"ref-exp","started_at":(now-timedelta(days=40)).isoformat(),"expires_at":(now-timedelta(days=1)).isoformat(),"created_at":(now-timedelta(days=40)).isoformat()}
    pending = {"id":"pending-2","manager_id":"m1","plan_id":"plan1","status":"pending","payment_status":"pending","payment_reference":"ref-pending","started_at":None,"expires_at":None,"created_at":now.isoformat()}
    svc = SubscriptionService(FakeSupabase([expired, pending]))
    raw = svc.get_current_subscription_raw("m1")
    assert raw["id"] == "pending-2"
