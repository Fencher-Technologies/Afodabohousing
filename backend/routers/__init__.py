from .admin import router as admin_router
from .agreement_generator import router as agreement_generator_router
from .agreements import router as agreements_router
from .auth import router as auth_router
from .bookmarks import router as bookmarks_router
from .boosts import router as boosts_router
from .exports import router as exports_router
from .leases import router as leases_router
from .subscriptions import router as subscriptions_router
from .maintenance_requests import router as maintenance_requests_router
from .managers import router as managers_router
from .messages import router as messages_router
from .notifications import router as notifications_router
from .payments import router as payments_router
from .phone_auth import router as phone_auth_router
from .properties import router as properties_router
from .rental_units import router as rental_units_router
from .tenants import router as tenants_router
from .terms import router as terms_router
from .tracking import router as tracking_router
from .forex import router as forex_router
from .reports import router as reports_router
from .uploads import router as uploads_router
from .webhooks import router as webhooks_router

__all__ = [
    "admin_router",
    "agreement_generator_router",
    "agreements_router",
    "auth_router",
    "bookmarks_router",
    "boosts_router",
    "exports_router",
    "leases_router",
    "maintenance_requests_router",
    "managers_router",
    "messages_router",
    "notifications_router",
    "payments_router",
    "phone_auth_router",
    "properties_router",
    "rental_units_router",
    "reports_router",
    "subscriptions_router",
    "tenants_router",
    "terms_router",
    "tracking_router",
    "forex_router",
    "uploads_router",
    "webhooks_router",
]
