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

    current_user = CurrentUser(
        id=str(user_data.get("id") or ""),
        email=user_data.get("email") or "",
        role=user_data.get("role") or "authenticated",
    )

    set_sentry_user(
        {
            "id": current_user.id,
            "email": current_user.email,
            "role": current_user.role,
        }
    )

    return current_user


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    supabase: Client = Depends(get_supabase_client),
) -> CurrentUser:
    return _resolve_user_via_supabase(credentials.credentials, supabase)


def get_optional_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(
        HTTPBearer(auto_error=False)
    ),
    supabase: Client = Depends(get_supabase_client),
) -> CurrentUser | None:
    if not credentials:
        return None

    try:
        return _resolve_user_via_supabase(credentials.credentials, supabase)
    except HTTPException:
        return None


def require_admin(
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_service_client),
) -> CurrentUser:
    role = None
    try:
        result = supabase.rpc("get_user_role", {"_user_id": current_user.id}).execute()
        data = result.data if hasattr(result, "data") else result
        role = data[0] if isinstance(data, list) and data else data
    except Exception:
        logger.warning("get_user_role RPC failed for %s, falling back to profiles table", current_user.id)

    if role != "admin":
        try:
            result = supabase.table("profiles").select("role").eq("user_id", current_user.id).execute()
            if result.data:
                role = result.data[0].get("role")
        except Exception:
            logger.error("Failed to check admin role from profiles table", exc_info=True)

    if role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return current_user


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
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_service_client),
) -> CurrentUser:
    role = None
    try:
        result = supabase.rpc("get_user_role", {"_user_id": current_user.id}).execute()
        data = result.data if hasattr(result, "data") else result
        role = data[0] if isinstance(data, list) and data else data
    except Exception:
        logger.warning("get_user_role RPC failed for %s, falling back to profiles table", current_user.id)

    if role != "super_admin":
        try:
            result = supabase.table("profiles").select("role").eq("user_id", current_user.id).execute()
            if result.data:
                role = result.data[0].get("role")
        except Exception:
            logger.error("Failed to check super_admin role from profiles table", exc_info=True)

    if role != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin access required",
        )
    return current_user


def require_manager(
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_service_client),
) -> CurrentUser:
    role = None
    try:
        result = supabase.rpc("get_user_role", {"_user_id": current_user.id}).execute()
        data = result.data if hasattr(result, "data") else result
        role = data[0] if isinstance(data, list) and data else data
    except Exception:
        logger.warning("get_user_role RPC failed for %s, falling back to profiles table", current_user.id)

    if role != "house_manager":
        try:
            result = supabase.table("profiles").select("role").eq("user_id", current_user.id).execute()
            if result.data:
                role = result.data[0].get("role")
        except Exception:
            logger.error("Failed to check house_manager role from profiles table", exc_info=True)

    if role != "house_manager":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="House manager access required",
        )
    return current_user


def require_super_admin_or_manager(
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_service_client),
) -> CurrentUser:
    role = None
    try:
        result = supabase.rpc("get_user_role", {"_user_id": current_user.id}).execute()
        data = result.data if hasattr(result, "data") else result
        role = data[0] if isinstance(data, list) and data else data
    except Exception:
        logger.warning("get_user_role RPC failed for %s, falling back to profiles table", current_user.id)

    if role not in ("super_admin", "house_manager"):
        try:
            result = supabase.table("profiles").select("role").eq("user_id", current_user.id).execute()
            if result.data:
                role = result.data[0].get("role")
        except Exception:
            logger.error("Failed to check role from profiles table", exc_info=True)

    if role not in ("super_admin", "house_manager"):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super admin or house manager access required",
        )
    return current_user


def require_tenant(
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_service_client),
) -> CurrentUser:
    role = None
    try:
        result = supabase.rpc("get_user_role", {"_user_id": current_user.id}).execute()
        data = result.data if hasattr(result, "data") else result
        role = data[0] if isinstance(data, list) and data else data
    except Exception:
        logger.warning("get_user_role RPC failed for %s, falling back to profiles table", current_user.id)

    if role != "tenant":
        try:
            result = supabase.table("profiles").select("role").eq("user_id", current_user.id).execute()
            if result.data:
                role = result.data[0].get("role")
        except Exception:
            logger.error("Failed to check tenant role from profiles table", exc_info=True)

    if role != "tenant":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Tenant access required",
        )
    return current_user
