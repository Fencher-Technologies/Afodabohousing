# mypy: ignore-errors
import logging

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from supabase import Client

from services.base import with_retry
from services.observability import set_sentry_user

from .database import get_service_client, get_supabase_client

logger = logging.getLogger(__name__)

security = HTTPBearer()


class CurrentUser(BaseModel):
    id: str
    email: str
    role: str = "authenticated"
    status: str = "active"

    model_config = {"arbitrary_types_allowed": True}


def _is_upstream_connectivity_error(exc: Exception) -> bool:
    if isinstance(exc, (httpx.ConnectError, httpx.ReadError, httpx.TimeoutException)):
        return True

    message = str(exc).lower()
    return (
        "getaddrinfo failed" in message
        or "forcibly closed by the remote host" in message
        or "temporary failure in name resolution" in message
    )


@with_retry
def _get_user_with_retry(supabase: Client, token: str):
    return supabase.auth.get_user(token)


def _lookup_profile(supabase: Client, user_id: str) -> dict:
    """Fetch the profiles row (role, status) for a user. Returns {} on failure."""
    try:
        result = (
            supabase.table("profiles")
            .select("role, status")
            .eq("user_id", user_id)
            .execute()
        )
        if result.data:
            return result.data[0]
    except Exception:
        logger.error("Failed to load profile for user %s", user_id, exc_info=True)
    return {}


def _lookup_role(supabase: Client, user_id: str) -> str | None:
    """Resolve the application role: profiles table first, get_user_role RPC
    as fallback (the same source /auth/me trusts, so guards and user-facing
    role never disagree)."""
    profile = _lookup_profile(supabase, user_id)
    if profile.get("role"):
        return profile["role"]
    try:
        result = supabase.rpc("get_user_role", {"_user_id": user_id}).execute()
        data = result.data if hasattr(result, "data") else result
        role = data[0] if isinstance(data, list) and data else data
        if role:
            return role
    except Exception:
        logger.warning("get_user_role RPC failed for %s", user_id)
    return None


def _resolve_user_via_supabase(token: str, supabase: Client) -> CurrentUser:
    try:
        response = _get_user_with_retry(supabase, token)
    except Exception as exc:
        logger.warning("Supabase token lookup failed", exc_info=True)
        if _is_upstream_connectivity_error(exc):
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Authentication service is temporarily unavailable. Please try again.",
            ) from exc
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    user = getattr(response, "user", None)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user_data = user.model_dump() if hasattr(user, "model_dump") else user
    if not isinstance(user_data, dict):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return CurrentUser(
        id=str(user_data.get("id") or ""),
        email=user_data.get("email") or "",
        role=user_data.get("role") or "authenticated",
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    supabase: Client = Depends(get_supabase_client),
    service: Client = Depends(get_service_client),
) -> CurrentUser:
    user = _resolve_user_via_supabase(credentials.credentials, supabase)
    # Populate the real application role and account status from the profiles
    # table. Without this, role stays at the Supabase sentinel "authenticated"
    # and every role check downstream (tenant lease fetch, super_admin bypass,
    # exports scoping) silently takes the wrong branch.
    profile = _lookup_profile(service, user.id)
    if profile.get("role"):
        user.role = profile["role"]
    if profile.get("status"):
        user.status = profile["status"]
    set_sentry_user(user)
    return user


def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(
        HTTPBearer(auto_error=False)
    ),
    supabase: Client = Depends(get_supabase_client),
    service: Client = Depends(get_service_client),
) -> CurrentUser | None:
    if not credentials:
        return None

    try:
        return get_current_user(credentials, supabase, service)
    except HTTPException:
        return None


def _effective_role(current_user: CurrentUser, supabase: Client) -> str | None:
    """Role for guard checks: the one resolved at authentication time, with a
    fresh lookup only if authentication left the sentinel in place."""
    if current_user.role and current_user.role != "authenticated":
        return current_user.role
    return _lookup_role(supabase, current_user.id)


def require_admin(
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_service_client),
) -> CurrentUser:
    if _effective_role(current_user, supabase) != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


def require_active_user(
    current_user: CurrentUser = Depends(get_current_user),
) -> CurrentUser:
    # "pending" accounts (phone-registered managers awaiting approval) keep
    # read access; suspended and rejected accounts are blocked.
    if current_user.status not in ("active", "pending"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is not active. Please contact your administrator.",
        )
    return current_user


def require_super_admin(
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_service_client),
) -> CurrentUser:
    if _effective_role(current_user, supabase) != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin access required",
        )
    return current_user


def require_manager(
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_service_client),
) -> CurrentUser:
    if _effective_role(current_user, supabase) != "house_manager":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="House manager access required",
        )
    return current_user


def require_super_admin_or_manager(
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_service_client),
) -> CurrentUser:
    if _effective_role(current_user, supabase) not in ("super_admin", "house_manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin or house manager access required",
        )
    return current_user


def require_active_subscription(
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_service_client),
) -> CurrentUser:
    """Enforce an active subscription for managers performing data mutations.

    Tenants and non-manager roles pass through untouched. A manager is
    blocked (403) when they have no subscription row, when the subscription
    status is not active, or when the subscription has expired by time
    (status still active but expires_at is in the past - resolved lazily).
    """
    role = _effective_role(current_user, supabase)

    if role not in ("super_admin", "house_manager"):
        return current_user

    from services.subscriptions import get_subscription_service

    sub = get_subscription_service(supabase).get_current_subscription(current_user.id)
    if not sub or sub.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Active subscription required. Renew your subscription to continue.",
        )
    return current_user


def require_tenant(
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_service_client),
) -> CurrentUser:
    if _effective_role(current_user, supabase) != "tenant":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tenant access required",
        )
    return current_user
