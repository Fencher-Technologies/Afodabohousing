import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from supabase import Client

from dependencies.auth import (
    CurrentUser,
    get_current_user,
    require_manager,
    require_super_admin_or_manager,
    require_tenant,
)
from dependencies.database import get_service_client, get_supabase_client
from models.payment import PaymentCreate
from models.payment_verification import (
    PaymentVerificationCreate,
    PaymentVerificationReject,
    PaymentVerificationResponse,
)
from services.crud import PaymentService
from services.payment_verifications import (
    PaymentVerificationService,
    get_payment_verification_svc,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payment-verifications", tags=["payment-verifications"])


def get_payment_svc(
    supabase: Client = Depends(get_service_client),
) -> PaymentService:
    return PaymentService(supabase)


@router.post("", response_model=PaymentVerificationResponse, status_code=status.HTTP_201_CREATED)
def create_verification(
    data: PaymentVerificationCreate,
    current_user: CurrentUser = Depends(require_tenant),
    svc: PaymentVerificationService = Depends(get_payment_verification_svc),
):
    """
    Tenant submits a payment for verification.
    Backend auto-populates lease_id, tenant_id, owner_id, property_id
    from the tenant's active lease.
    """
    if data.amount <= 0:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Amount must be greater than 0.",
        )
    submission = svc.create_submission(data, current_user.id)
    return submission


@router.get("/my", response_model=list[PaymentVerificationResponse])
def get_my_verifications(
    status: str | None = Query(None, pattern="^(pending|approved|rejected)?$"),
    current_user: CurrentUser = Depends(require_tenant),
    svc: PaymentVerificationService = Depends(get_payment_verification_svc),
):
    """Tenant sees their own verification requests."""
    return svc.get_my_submissions(current_user.id, status)


@router.get("", response_model=list[PaymentVerificationResponse])
def get_owner_verifications(
    status: str | None = Query(None, pattern="^(pending|approved|rejected)?$"),
    search: str | None = Query(None, min_length=1),
    current_user: CurrentUser = Depends(require_super_admin_or_manager),
    svc: PaymentVerificationService = Depends(get_payment_verification_svc),
):
    """Manager sees verification requests for their properties."""
    return svc.get_owner_submissions(current_user.id, status, search)


@router.patch("/{verification_id}/approve", response_model=PaymentVerificationResponse)
def approve_verification(
    verification_id: UUID,
    current_user: CurrentUser = Depends(require_super_admin_or_manager),
    svc: PaymentVerificationService = Depends(get_payment_verification_svc),
    payment_svc: PaymentService = Depends(get_payment_svc),
):
    """
    Manager approves a pending verification.
    Creates an official payment via PaymentService (status=confirmed),
    which auto-updates balances, reports, and payment history.
    """
    submission = svc.get_by_id(verification_id)
    if not submission:
        raise HTTPException(status_code=404, detail="Verification request not found")
    if submission["owner_id"] != current_user.id and current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Access denied")
    return svc.approve_submission(verification_id, current_user.id, payment_svc)


@router.patch("/{verification_id}/reject", response_model=PaymentVerificationResponse)
def reject_verification(
    verification_id: UUID,
    data: PaymentVerificationReject,
    current_user: CurrentUser = Depends(require_super_admin_or_manager),
    svc: PaymentVerificationService = Depends(get_payment_verification_svc),
):
    """
    Manager rejects a pending verification.
    No payment is created. Rejection reason is recorded.
    """
    submission = svc.get_by_id(verification_id)
    if not submission:
        raise HTTPException(status_code=404, detail="Verification request not found")
    if submission["owner_id"] != current_user.id and current_user.role != "super_admin":
        raise HTTPException(status_code=403, detail="Access denied")
    return svc.reject_submission(verification_id, current_user.id, data)
