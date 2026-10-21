import re
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from supabase import Client

from dependencies import CurrentUser, get_service_client, require_super_admin_or_manager
from models import ProfileResponse

router = APIRouter(prefix="/managers", tags=["managers"])

# An explicit column list, never select("*"): profiles also holds pin_hash and
# auth_password_enc, which must not leave the database through this endpoint.
_PROFILE_COLUMNS = (
    "id, user_id, email, full_name, phone, avatar_url, role, status, "
    "created_by, manager_id, created_at, accepted_terms, accepted_terms_at, "
    "terms_version, privacy_version"
)

# Characters with meaning inside a PostgREST or() filter string.
_FILTER_SYNTAX = re.compile(r"[,()*%\\\"']")


class PaginatedResponse(BaseModel):
    items: list
    total: int
    skip: int
    limit: int


@router.get("", response_model=PaginatedResponse)
def list_managers(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: str | None = None,
    user_id: UUID | None = None,
    email: str | None = None,
    phone: str | None = None,
    current_user: CurrentUser = Depends(require_super_admin_or_manager),
    supabase: Client = Depends(get_service_client),
) -> PaginatedResponse:
    """House managers, newest first.

    A super admin sees every manager. A manager sees only their own record:
    handing one manager the names, emails and phone numbers of every other
    manager on the platform would expose their competitors' details.
    """
    query = (
        supabase.table("profiles")
        .select(_PROFILE_COLUMNS, count="exact")
        .eq("role", "house_manager")
    )

    if current_user.role != "super_admin":
        query = query.eq("user_id", str(current_user.id))

    if user_id:
        query = query.eq("user_id", str(user_id))
    if email and email.strip():
        query = query.eq("email", email.strip().lower())
    if phone and phone.strip():
        query = query.eq("phone", phone.strip())
    if search:
        term = _FILTER_SYNTAX.sub(" ", search).strip()
        if term:
            query = query.or_(
                f"full_name.ilike.%{term}%,email.ilike.%{term}%,phone.ilike.%{term}%"
            )

    result = query.order("created_at", desc=True).range(skip, skip + limit - 1).execute()
    rows = result.data or []
    total = result.count if getattr(result, "count", None) is not None else len(rows)

    return PaginatedResponse(
        # Phone-registered managers can have no email; the response model needs a string.
        items=[ProfileResponse(**{**row, "email": row.get("email") or ""}) for row in rows],
        total=total,
        skip=skip,
        limit=limit,
    )
