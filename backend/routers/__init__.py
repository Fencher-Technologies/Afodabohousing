from .auth import router as auth_router
from .leases import router as leases_router
from .maintenance_requests import router as maintenance_requests_router
from .payments import router as payments_router
from .properties import router as properties_router
from .tenants import router as tenants_router

__all__ = [
    "auth_router",
    "properties_router",
    "tenants_router",
    "leases_router",
    "payments_router",
    "maintenance_requests_router",
]
