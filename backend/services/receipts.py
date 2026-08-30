import logging
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any
from uuid import UUID

from supabase import Client

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
                return f"RCP-{year}-{str(seq_val).zfill(4)}"
        except Exception as e:
            logger.warning("get_next_receipt_number RPC failed, falling back: %s", e)
        # Fallback: derive from the highest existing number this year.
        result = (
            self.supabase.table(self._table)
            .select("receipt_number")
            .like("receipt_number", f"RCP-{year}-%")
            .order("receipt_number", desc=True)
            .limit(1)
            .execute()
        )
        next_val = 1
        if result.data:
            try:
                next_val = int(str(result.data[0]["receipt_number"]).rsplit("-", 1)[-1]) + 1
            except (ValueError, IndexError):
                next_val = len(result.data) + 1
        return f"RCP-{year}-{str(next_val).zfill(4)}"

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
            "payment_date": payment.get("paid_date") or payment.get("due_date"),
            "transaction_reference": payment.get("transaction_id"),
            "coverage_days": payment.get("coverage_days"),
            "status": "active",
        }
        try:
            result = self.supabase.table(self._table).insert(payload).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            # A concurrent insert on the same payment loses the unique race;
            # return the winner's receipt instead of failing the request.
            logger.warning("Receipt insert failed, re-reading: %s", e)
            retry = (
                self.supabase.table(self._table)
                .select("*")
                .eq("payment_id", str(payment_id))
                .limit(1)
                .execute()
            )
            return retry.data[0] if retry.data else None

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
