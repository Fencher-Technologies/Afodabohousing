import logging
import threading
from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

from supabase import Client

from config import get_settings
from models.subscription import (
    ManagerSubscriptionResponse,
    SubscriptionCreateResponse,
    SubscriptionPlanResponse,
)
from services.nylonpay import initiate_payment

logger = logging.getLogger(__name__)


def get_subscription_service(supabase: Client) -> "SubscriptionService":
    return SubscriptionService(supabase)


class SubscriptionService:
    def __init__(self, supabase: Client):
        self.supabase = supabase

    def get_active_plans(self) -> list[SubscriptionPlanResponse]:
        result = (
            self.supabase.table("subscription_plans")
            .select("*")
            .eq("is_active", True)
            .order("sort_order")
            .execute()
        )
        return [SubscriptionPlanResponse(**row) for row in result.data]

    def get_plan(self, plan_id: str) -> dict | None:
        result = (
            self.supabase.table("subscription_plans")
            .select("*")
            .eq("id", plan_id)
            .limit(1)
            .execute()
        )
        return result.data[0] if result.data else None

    def get_current_subscription(self, manager_id: str) -> ManagerSubscriptionResponse | None:
        result = (
            self.supabase.table("manager_subscriptions")
            .select("*")
            .eq("manager_id", manager_id)
            .order("created_at", desc=True)
            .limit(1)
            .execute()
        )
        if not result.data:
            return None

        sub = result.data[0]
        plan = self.get_plan(sub["plan_id"])
        plan_name = plan["name"] if plan else sub["plan_id"]

        days_remaining = 0
        if sub.get("expires_at") and sub["status"] == "active":
            expires = sub["expires_at"]
            if isinstance(expires, str):
                expires = datetime.fromisoformat(expires.replace("Z", "+00:00"))
            remaining = expires - datetime.now(UTC)
            days_remaining = max(0, remaining.days)

        return ManagerSubscriptionResponse(
            id=str(sub["id"]),
            manager_id=str(sub["manager_id"]),
            plan_id=sub["plan_id"],
            plan_name=plan_name,
            status=sub["status"],
            started_at=sub.get("started_at"),
            expires_at=sub.get("expires_at"),
            auto_renew=sub.get("auto_renew", True),
            payment_reference=sub.get("payment_reference"),
            payment_status=sub.get("payment_status", "pending"),
            days_remaining=days_remaining,
        )

    def create_subscription(
        self, manager_id: str, plan_id: str, profile: dict | None = None, phone_number: str | None = None
    ) -> SubscriptionCreateResponse:
        plan = self.get_plan(plan_id)
        if not plan:
            raise ValueError(f"Plan '{plan_id}' not found")

        reference = str(uuid4())
        amount = int(plan["price_ugx"])

        profile = profile or {}
        first_name = (profile.get("full_name") or "").split()[0] or "Manager"
        last_name = " ".join((profile.get("full_name") or "").split()[1:]) or "User"
        phone = phone_number or profile.get("phone") or ""
        email = profile.get("email") or ""

        sub_payload = {
            "manager_id": manager_id,
            "plan_id": plan_id,
            "status": "pending",
            "payment_reference": reference,
            "payment_status": "pending",
        }

        result = self.supabase.table("manager_subscriptions").insert(sub_payload).execute()
        subscription_id = str(result.data[0]["id"])

        initiate_payment(
            amount=amount,
            customer_name=f"{first_name} {last_name}".strip(),
            customer_phone=phone,
            customer_email=email,
            reference=reference,
            description=f"Afodabo Housing - {plan['name']} Subscription",
            metadata={
                "subscription_id": subscription_id,
                "manager_id": manager_id,
                "plan_id": plan_id,
            },
        )

        settings = get_settings()
        if settings.nylonpay_environment == "sandbox":
            def auto_confirm():
                try:
                    import time as _time
                    _time.sleep(30)
                    self.confirm_subscription(reference)
                    logger.info("Sandbox auto-confirmed subscription %s", reference)
                except Exception as e:
                    logger.error("Sandbox auto-confirm failed for %s: %s", reference, e)
            threading.Timer(30.0, auto_confirm).start()
            logger.info("Scheduled sandbox auto-confirm for reference %s in 30s", reference)

        return SubscriptionCreateResponse(
            subscription_id=subscription_id,
            plan_id=plan_id,
            amount=float(amount),
            currency="UGX",
            payment_reference=reference,
            message="Check your phone for the payment prompt.",
        )

    def confirm_subscription(self, payment_reference: str) -> dict | None:
        result = (
            self.supabase.table("manager_subscriptions")
            .select("*")
            .eq("payment_reference", payment_reference)
            .limit(1)
            .execute()
        )
        if not result.data:
            return None

        sub = result.data[0]
        plan = self.get_plan(sub["plan_id"])
        if not plan:
            return None

        duration_days = plan["duration_days"]
        now = datetime.now(UTC)

        sub_payload = {
            "status": "active",
            "payment_status": "completed",
            "started_at": now.isoformat(),
            "expires_at": (now + timedelta(days=duration_days)).isoformat(),
            "updated_at": now.isoformat(),
        }

        self.supabase.table("manager_subscriptions").update(sub_payload).eq(
            "id", sub["id"]
        ).execute()

        return self.get_current_subscription(sub["manager_id"])

    def expire_subscriptions(self) -> int:
        now = datetime.now(UTC).isoformat()
        result = (
            self.supabase.table("manager_subscriptions")
            .update({"status": "expired", "updated_at": now})
            .eq("status", "active")
            .lt("expires_at", now)
            .execute()
        )
        return len(result.data) if result.data else 0
