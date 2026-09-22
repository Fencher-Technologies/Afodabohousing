import logging
from datetime import UTC, date, datetime, timedelta
from decimal import Decimal
from typing import Any
from uuid import UUID

from supabase import Client


def _as_date(value: Any) -> date | None:
    if isinstance(value, date):
        return value
    if isinstance(value, str) and value:
        try:
            return date.fromisoformat(value[:10])
        except ValueError:
            return None
    return None


def _iso(value: date | None) -> str | None:
    return value.isoformat() if isinstance(value, date) else None

logger = logging.getLogger(__name__)


def _now_iso() -> str:
    return datetime.now(UTC).isoformat()


class ReceiptService:
    """Generates and serves payment receipts.

    A receipt is an immutable snapshot of a confirmed payment, created
    automatically when a payment is confirmed (verification approval or a
    manager-recorded payment). Receipts are numbered per calendar year:
    RCP-2026-0001, RCP-2026-0002, ...
    """

    def __init__(self, supabase: Client):
        self.supabase = supabase
        self._table = "receipts"

    # ─── Numbering ──────────────────────────────────────────────────────

    def _next_receipt_number(self) -> str:
        year = datetime.now(UTC).year
        try:
            seq = self.supabase.rpc("get_next_receipt_number").execute()
            seq_val = seq.data if hasattr(seq, "data") else None
            if isinstance(seq_val, int) and seq_val > 0:
                return f"RCP-{year}-{str(seq_val).zfill(6)}"
        except Exception as e:
            logger.warning("get_next_receipt_number RPC failed, falling back: %s", e)
        # Fallback: derive from the highest existing number this year.
        # Numbers are parsed numerically (not string-sorted, which breaks
        # past 9,999) and padded to 6 digits so string sorting keeps working
        # up to RCP-YYYY-999999.
        result = (
            self.supabase.table(self._table)
            .select("receipt_number")
            .like("receipt_number", f"RCP-{year}-%")
            .execute()
        )
        highest = 0
        for row in result.data or []:
            try:
                highest = max(highest, int(str(row["receipt_number"]).rsplit("-", 1)[-1]))
            except (ValueError, IndexError, KeyError):
                continue
        return f"RCP-{year}-{str(highest + 1).zfill(6)}"

    # ─── Snapshot helpers ───────────────────────────────────────────────

    def _snapshot_context(self, payment: dict[str, Any]) -> dict[str, Any]:
        lease_id = payment.get("lease_id")
        tenant_id = payment.get("tenant_id")
        ctx: dict[str, Any] = {
            "tenant_name": None,
            "property_title": None,
            "property_address": None,
            "manager_name": None,
            "unit_label": None,
        }
        lease = None
        if lease_id:
            lr = (
                self.supabase.table("leases")
                .select("id, property_id, owner_id, tenant_id, unit_label")
                .eq("id", str(lease_id))
                .execute()
            )
            lease = lr.data[0] if lr.data else None
        if not tenant_id and lease:
            tenant_id = lease.get("tenant_id")
        if tenant_id:
            tr = (
                self.supabase.table("tenants")
                .select("first_name, last_name")
                .eq("id", str(tenant_id))
                .execute()
            )
            if tr.data:
                t = tr.data[0]
                ctx["tenant_name"] = (
                    f"{t.get('first_name') or ''} {t.get('last_name') or ''}".strip() or None
                )
        if lease:
            ctx["unit_label"] = lease.get("unit_label")
            if lease.get("property_id"):
                pr = (
                    self.supabase.table("properties")
                    .select("title, address, city")
                    .eq("id", str(lease["property_id"]))
                    .execute()
                )
                if pr.data:
                    p = pr.data[0]
                    ctx["property_title"] = p.get("title")
                    address_parts = [p.get("address"), p.get("city")]
                    ctx["property_address"] = ", ".join(x for x in address_parts if x) or None
            if lease.get("owner_id"):
                mr = (
                    self.supabase.table("profiles")
                    .select("full_name")
                    .eq("user_id", str(lease["owner_id"]))
                    .execute()
                )
                if mr.data:
                    ctx["manager_name"] = mr.data[0].get("full_name")
        return ctx

    # ─── Creation ───────────────────────────────────────────────────────

    def _coverage_period(
        self, payment: dict[str, Any], coverage_days: Any, payment_date: Any
    ) -> tuple[str | None, str | None]:
        """Dates this payment covers, continuing the tenancy's rent ledger.

        Rent runs from the tenancy's effective date, not from the day money
        changed hands: a tenant whose rent started on 1 Sep and who paid three
        months on 10 Sep is covered 1 Sep - 30 Nov, not 10 Sep - 9 Dec. So the
        period starts where earlier payments stopped covering (effective date
        + days already paid for), which is the same rule the rent ledger and
        the arrears figures use.
        """
        start = self._paid_until(payment) or _as_date(payment_date)
        if start is None or not coverage_days:
            return (_iso(start) or payment_date, None)
        try:
            end = start + timedelta(days=int(coverage_days))
        except (ValueError, TypeError):
            return (_iso(start), None)
        return (_iso(start), end.isoformat())

    def _paid_until(self, payment: dict[str, Any]) -> date | None:
        """Effective date + coverage already bought by this tenancy's earlier payments."""
        lease_id = payment.get("lease_id")
        if not lease_id:
            return None
        try:
            lr = (
                self.supabase.table("leases")
                .select("rent_effective_date, start_date")
                .eq("id", str(lease_id))
                .limit(1)
                .execute()
            )
            lease = (lr.data or [{}])[0] or {}
            anchor = _as_date(lease.get("rent_effective_date") or lease.get("start_date"))
            if anchor is None:
                return None

            prior = (
                self.supabase.table("payments")
                .select("id, status, payment_type, coverage_days, paid_date, created_at")
                .eq("lease_id", str(lease_id))
                .execute()
            )
            covered = 0
            for row in prior.data or []:
                if str(row.get("id")) == str(payment.get("id")):
                    continue
                if row.get("status") not in ("confirmed", "completed"):
                    continue
                if (row.get("payment_type") or "rent") != "rent":
                    continue
                # Only payments made before this one shift the start date.
                if _as_date(row.get("paid_date")) and _as_date(payment.get("paid_date")) and (
                    _as_date(row.get("paid_date")) > _as_date(payment.get("paid_date"))
                ):
                    continue
                covered += int(row.get("coverage_days") or 0)
            return anchor + timedelta(days=covered)
        except Exception as e:
            logger.warning("Could not work out rent coverage for payment %s: %s", payment.get("id"), e)
            return None

    def create_for_payment(self, payment: dict[str, Any]) -> dict[str, Any] | None:
        """Create a receipt for a confirmed payment. Idempotent: returns the
        existing receipt when one already exists for the payment.
        """
        payment_id = payment.get("id")
        if not payment_id:
            return None
        if payment.get("status") not in ("confirmed", "completed"):
            return None

        existing = (
            self.supabase.table(self._table)
            .select("*")
            .eq("payment_id", str(payment_id))
            .limit(1)
            .execute()
        )
        if existing.data:
            return existing.data[0]

        ctx = self._snapshot_context(payment)
        amount = payment.get("amount")
        try:
            amount_value = float(Decimal(str(amount)))
        except Exception:
            amount_value = 0.0

        payment_date = payment.get("paid_date") or payment.get("due_date")
        coverage_days = payment.get("coverage_days")
        coverage_start, coverage_end = self._coverage_period(payment, coverage_days, payment_date)

        payload = {
            "receipt_number": self._next_receipt_number(),
            "payment_id": str(payment_id),
            "lease_id": str(payment.get("lease_id")) if payment.get("lease_id") else None,
            "tenant_id": str(payment.get("tenant_id")) if payment.get("tenant_id") else None,
            "tenant_name": ctx["tenant_name"],
            "property_title": ctx["property_title"],
            "property_address": ctx["property_address"],
            "unit_label": ctx["unit_label"],
            "manager_name": ctx["manager_name"],
            "amount": amount_value,
            "currency": payment.get("currency") or "UGX",
            "payment_method": payment.get("payment_method") or payment.get("method"),
            "payment_type": payment.get("payment_type") or "rent",
            "payment_date": payment_date,
            "transaction_reference": payment.get("transaction_id"),
            "coverage_days": payment.get("coverage_days"),
            "coverage_start_date": coverage_start,
            "coverage_end_date": coverage_end,
            "status": "active",
        }
        last_error: Exception | None = None
        for attempt in range(3):
            try:
                result = self.supabase.table(self._table).insert(payload).execute()
                return result.data[0] if result.data else None
            except Exception as e:
                last_error = e
                # Either a concurrent insert on the same payment won the
                # unique race (return the winner), or two writers computed
                # the same fallback number (recompute and retry).
                existing = (
                    self.supabase.table(self._table)
                    .select("*")
                    .eq("payment_id", str(payment_id))
                    .limit(1)
                    .execute()
                )
                if existing.data:
                    return existing.data[0]
                if attempt < 2:
                    payload["receipt_number"] = self._next_receipt_number()
        logger.error(
            "Receipt insert failed after 3 attempts for payment %s: %s",
            payment_id, last_error,
        )
        return None

    # ─── Reads ───────────────────────────────────────────────

    def get_by_id(self, receipt_id: UUID) -> dict[str, Any] | None:
        result = (
            self.supabase.table(self._table)
            .select("*")
            .eq("id", str(receipt_id))
            .execute()
        )
        return result.data[0] if result.data else None

    def list_for_tenant(self, tenant_id: str, status_filter: str | None = None) -> list[dict[str, Any]]:
        query = (
            self.supabase.table(self._table)
            .select("*")
            .eq("tenant_id", tenant_id)
            .order("created_at", desc=True)
        )
        if status_filter:
            query = query.eq("status", status_filter)
        result = query.execute()
        return result.data or []

    def list_for_owner(self, owner_id: str, status_filter: str | None = None) -> list[dict[str, Any]]:
        leases = (
            self.supabase.table("leases")
            .select("id")
            .eq("owner_id", owner_id)
            .execute()
        )
        lease_ids = [l["id"] for l in (leases.data or [])]
        if not lease_ids:
            return []
        query = (
            self.supabase.table(self._table)
            .select("*")
            .in_("lease_id", lease_ids)
            .order("created_at", desc=True)
        )
        if status_filter:
            query = query.eq("status", status_filter)
        result = query.execute()
        return result.data or []

    # ─── Void ─────────────────────────────────────────────────

    def void(self, receipt_id: UUID, actor_user_id: str) -> dict[str, Any]:
        now = _now_iso()
        result = (
            self.supabase.table(self._table)
            .update({"status": "voided", "voided_at": now, "voided_by": str(actor_user_id)})
            .eq("id", str(receipt_id))
            .eq("status", "active")
            .execute()
        )
        return result.data[0] if result.data else {}


def get_receipt_service(supabase: Client) -> ReceiptService:
    return ReceiptService(supabase)
