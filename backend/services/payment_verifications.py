import logging
from datetime import UTC, date, datetime
from decimal import Decimal
from uuid import UUID

from fastapi import Depends, HTTPException, status
from supabase import Client

from dependencies.database import get_service_client
from models.payment import PaymentCreate
from models.payment_verification import (
    PaymentVerificationCreate,
    PaymentVerificationReject,
)
from services.crud import PaymentService
from services.notifications import notify

logger = logging.getLogger(__name__)


def get_payment_verification_svc(
    supabase: Client = Depends(get_service_client),
) -> "PaymentVerificationService":
    return PaymentVerificationService(supabase)


class PaymentVerificationService:
    def __init__(self, supabase: Client):
        self.supabase = supabase
        self._table = "payment_verifications"

    def _get_tenant_from_user(self, user_id: str) -> dict:
        result = (
            self.supabase.table("tenants")
            .select("id, owner_id, user_id, email, phone, first_name, last_name")
            .eq("user_id", user_id)
            .execute()
        )
        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Tenant profile not found",
            )
        return result.data[0]

    def _get_active_lease(self, tenant_id: str) -> dict:
        today = date.today().isoformat()
        # Match the app's normalization: everything except terminated/expired is "active"
        terminal = ("terminated", "expired")
        result = (
            self.supabase.table("leases")
            .select("id, property_id, owner_id, monthly_rent, status, start_date, end_date")
            .eq("tenant_id", tenant_id)
            .lte("start_date", today)
            .gte("end_date", today)
            .execute()
        )
        if result.data:
            for lease in result.data:
                if lease.get("status") not in terminal:
                    return lease
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active tenancy found. You must have an active lease to submit a payment verification.",
        )

    def _check_duplicate(self, lease_id: str, amount: Decimal, payment_date: str) -> None:
        result = (
            self.supabase.table(self._table)
            .select("id, status")
            .eq("lease_id", lease_id)
            .eq("amount", str(amount))
            .eq("payment_date", payment_date)
            .eq("status", "pending")
            .execute()
        )
        if result.data:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A pending verification already exists for this tenancy, amount, and payment date.",
            )

    def _resolve_manager_user_id(self, owner_id: str) -> str | None:
        result = (
            self.supabase.table("profiles")
            .select("user_id")
            .eq("user_id", owner_id)
            .execute()
        )
        if result.data:
            return result.data[0]["user_id"]
        return owner_id

    def _get_tenant_user_id(self, tenant_id: str) -> str | None:
        result = (
            self.supabase.table("tenants")
            .select("user_id")
            .eq("id", tenant_id)
            .execute()
        )
        if result.data and result.data[0].get("user_id"):
            return result.data[0]["user_id"]
        result = (
            self.supabase.table("profiles")
            .select("user_id")
            .eq("id", tenant_id)
            .execute()
        )
        if result.data:
            return result.data[0]["user_id"]
        return None

    def _get_tenant_name(self, tenant_id: str) -> str:
        result = (
            self.supabase.table("tenants")
            .select("first_name, last_name")
            .eq("id", tenant_id)
            .execute()
        )
        if result.data:
            t = result.data[0]
            return f"{t.get('first_name', '')} {t.get('last_name', '')}".strip() or "Tenant"
        return "Tenant"

    def create_submission(
        self,
        data: PaymentVerificationCreate,
        tenant_user_id: str,
    ) -> dict:
        tenant = self._get_tenant_from_user(tenant_user_id)
        tenant_id = tenant["id"]

        lease = self._get_active_lease(tenant_id)
        lease_id = lease["id"]
        owner_id = lease["owner_id"]
        property_id = lease["property_id"]

        self._check_duplicate(lease_id, data.amount, data.payment_date.isoformat())

        payload = {
            "lease_id": lease_id,
            "tenant_id": tenant_id,
            "owner_id": owner_id,
            "property_id": property_id,
            "amount": str(data.amount),
            "payment_method": data.payment_method,
            "transaction_reference": data.transaction_reference,
            "payment_date": data.payment_date.isoformat(),
            "screenshot_url": data.screenshot_url,
            "notes": data.notes,
            "status": "pending",
        }

        result = self.supabase.table(self._table).insert(payload).execute()
        submission = result.data[0]

        tenant_name = self._get_tenant_name(tenant_id)
        manager_user_id = self._resolve_manager_user_id(owner_id)
        if manager_user_id:
            try:
                notify(
                    self.supabase,
                    recipient_id=manager_user_id,
                    type="payment_verification_submitted",
                    title="Payment Awaiting Verification",
                    body=f"{tenant_name} has submitted a rent payment of {float(data.amount):,.0f} awaiting verification.",
                    metadata={
                        "verification_id": str(submission["id"]),
                        "amount": str(data.amount),
                        "payment_method": data.payment_method,
                    },
                )
            except Exception as e:
                logger.warning("Failed to notify manager: %s", str(e))

        return submission

    def get_my_submissions(
        self, tenant_user_id: str, status_filter: str | None = None
    ) -> list[dict]:
        tenant = self._get_tenant_from_user(tenant_user_id)
        tenant_id = tenant["id"]

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

    def get_owner_submissions(
        self,
        owner_id: str,
        status_filter: str | None = None,
        search: str | None = None,
    ) -> list[dict]:
        query = (
            self.supabase.table(self._table)
            .select("*, tenants!inner(first_name, last_name, phone, email), properties!inner(title)")
            .eq("owner_id", owner_id)
            .order("created_at", desc=True)
        )

        if search:
            search_lower = search.lower()
            query = query.or_(
                f"tenants.first_name.ilike.%{search_lower}%,"
                f"tenants.last_name.ilike.%{search_lower}%,"
                f"properties.title.ilike.%{search_lower}%"
            )

        if status_filter:
            query = query.eq("status", status_filter)

        result = query.execute()
        return result.data or []

    def get_by_id(self, verification_id: UUID) -> dict | None:
        result = (
            self.supabase.table(self._table)
            .select("*")
            .eq("id", str(verification_id))
            .execute()
        )
        return result.data[0] if result.data else None

    def approve_submission(
        self,
        verification_id: UUID,
        reviewer_id: str,
        payment_service: PaymentService,
    ) -> dict:
        submission = self.get_by_id(verification_id)
        if not submission:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Verification request not found",
            )
        if submission["status"] != "pending":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot approve a {submission['status']} verification request.",
            )

        # Claim the submission first with a conditional update. If two
        # reviewers act at once, only one claim succeeds; the other gets a
        # clear 400 instead of a duplicated rent payment.
        now = datetime.now(UTC)
        claim = (
            self.supabase.table(self._table)
            .update({
                "status": "approved",
                "reviewed_by": reviewer_id,
                "reviewed_at": now.isoformat(),
            })
            .eq("id", str(verification_id))
            .eq("status", "pending")
            .execute()
        )
        if not claim.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="This verification request was already processed.",
            )

        try:
            payment = payment_service.create(
                PaymentCreate(
                    lease_id=submission["lease_id"],
                    tenant_id=submission["tenant_id"],
                    amount=Decimal(str(submission["amount"])),
                    payment_type="rent",
                    payment_method=submission["payment_method"],
                    status="confirmed",
                    paid_date=submission["payment_date"],
                    transaction_id=submission["transaction_reference"] or None,
                    proof_url=submission.get("screenshot_url") or None,
                    notes=f"Verified payment. Original verification ID: {submission['id']}",
                )
            )
        except ValueError as e:
            # Payment creation failed: release the claim so the manager can
            # correct the data and approve again.
            self.supabase.table(self._table).update(
                {"status": "pending", "reviewed_by": None, "reviewed_at": None}
            ).eq("id", str(verification_id)).execute()
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=str(e),
            )
        except Exception:
            self.supabase.table(self._table).update(
                {"status": "pending", "reviewed_by": None, "reviewed_at": None}
            ).eq("id", str(verification_id)).execute()
            raise

        # Auto-issue the tenant-facing receipt for the confirmed payment.
        receipt = None
        try:
            from services.receipts import ReceiptService

            receipt = ReceiptService(self.supabase).create_for_payment(payment)
        except Exception as e:
            logger.warning("Receipt generation failed for payment %s: %s", payment.get("id"), e)

        result = (
            self.supabase.table(self._table)
            .select("*")
            .eq("id", str(verification_id))
            .execute()
        )

        tenant_user_id = self._get_tenant_user_id(submission["tenant_id"])
        if tenant_user_id:
            try:
                notify(
                    self.supabase,
                    recipient_id=tenant_user_id,
                    type="payment_verified",
                    title="Payment Verified",
                    body=f"Your payment of {float(submission['amount']):,.0f} has been verified by the house manager.",
                    metadata={
                        "verification_id": str(verification_id),
                        "payment_id": str(payment["id"]),
                        "amount": str(submission["amount"]),
                        "receipt_id": str(receipt["id"]) if receipt else None,
                        "receipt_number": receipt.get("receipt_number") if receipt else None,
                    },
                )
            except Exception as e:
                logger.warning("Failed to notify tenant: %s", str(e))

        return result.data[0] if result.data else submission

    def reject_submission(
        self,
        verification_id: UUID,
        reviewer_id: str,
        data: PaymentVerificationReject,
    ) -> dict:
        submission = self.get_by_id(verification_id)
        if not submission:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Verification request not found",
            )
        if submission["status"] != "pending":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Cannot reject a {submission['status']} verification request.",
            )

        now = datetime.now(UTC)
        update_payload = {
            "status": "rejected",
            "reviewed_by": reviewer_id,
            "reviewed_at": now.isoformat(),
            "rejection_reason": data.rejection_reason,
        }
        result = (
            self.supabase.table(self._table)
            .update(update_payload)
            .eq("id", str(verification_id))
            .execute()
        )

        tenant_user_id = self._get_tenant_user_id(submission["tenant_id"])
        if tenant_user_id:
            try:
                notify(
                    self.supabase,
                    recipient_id=tenant_user_id,
                    type="payment_rejected",
                    title="Payment Not Verified",
                    body=f"Your payment of {float(submission['amount']):,.0f} could not be verified. Reason: {data.rejection_reason}",
                    metadata={
                        "verification_id": str(verification_id),
                        "amount": str(submission["amount"]),
                        "rejection_reason": data.rejection_reason,
                    },
                )
            except Exception as e:
                logger.warning("Failed to notify tenant: %s", str(e))

        return result.data[0] if result.data else submission
