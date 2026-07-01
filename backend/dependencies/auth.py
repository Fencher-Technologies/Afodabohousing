import logging

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel
from supabase import Client

from config import get_settings
from services.base import with_retry

from .database import get_service_client, get_supabase_client

logger = logging.getLogger(__name__)

security = HTTPBearer()


class CurrentUser(BaseModel):
    id: str
    email: str
    role: str = "authenticated"
    status: str = "active"
    full_name: str | None = None

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


def _fetch_profile(user_id: str, supabase: Client) -> dict:
    try:
        result = supabase.table("profiles").select("role, status, full_name").eq("user_id", user_id).execute()
        if result.data:
            return result.data[0]
    except Exception as e:
        logger.warning("Failed to fetch profile for %s: %s", user_id, str(e))
    return {}


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    supabase: Client = Depends(get_supabase_client),
) -> CurrentUser:
    user = _resolve_user_via_supabase(credentials.credentials, supabase)
    profile = _fetch_profile(user.id, supabase)
    if profile:
        user.role = profile.get("role", user.role)
        user.status = profile.get("status", "active")
        user.full_name = profile.get("full_name")
    return user


def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(
        HTTPBearer(auto_error=False)
    ),
    supabase: Client = Depends(get_supabase_client),
) -> CurrentUser | None:
    if not credentials:
        return None

    try:
        return get_current_user(credentials, supabase)
    except HTTPException:
        return None


def require_active_user(
    current_user: CurrentUser = Depends(get_current_user),
) -> CurrentUser:
    if current_user.status != "active":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is not active. Please contact your administrator.",
        )
    return current_user


def require_super_admin(
    current_user: CurrentUser = Depends(require_active_user),
) -> CurrentUser:
    if current_user.role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin access required",
        )
    return current_user


def require_manager(
    current_user: CurrentUser = Depends(require_active_user),
) -> CurrentUser:
    if current_user.role != "house_manager":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="House manager access required",
        )
    return current_user


def require_super_admin_or_manager(
    current_user: CurrentUser = Depends(require_active_user),
) -> CurrentUser:
    if current_user.role not in ("super_admin", "house_manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin or house manager access required",
        )
    return current_user


def require_tenant(
    current_user: CurrentUser = Depends(require_active_user),
) -> CurrentUser:
    if current_user.role != "tenant":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tenant access required",
        )
    return current_user
