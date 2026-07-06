from .admin import router as admin_router
from .auth import router as auth_router
from .boosts import router as boosts_router
from .leases import router as leases_router
from .maintenance_requests import router as maintenance_requests_router
from .messages import router as messages_router
from .payments import router as payments_router
from .properties import router as properties_router
from .rental_units import router as rental_units_router
from .tenants import router as tenants_router
from .uploads import router as uploads_router
from .webhooks import router as webhooks_router

__all__ = [
    "admin_router",
    "auth_router",
    "boosts_router",
    "leases_router",
    "maintenance_requests_router",
    "messages_router",
    "payments_router",
    "properties_router",
    "rental_units_router",
    "tenants_router",
    "uploads_router",
    "webhooks_router",
]
