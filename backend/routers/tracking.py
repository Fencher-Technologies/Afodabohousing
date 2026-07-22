import logging
from fastapi import APIRouter, Depends, Request, status
from supabase import Client
from dependencies import CurrentUser, get_current_user, get_service_client, get_optional_user
from models.tracking import PageViewCreate, PageViewResponse, PageViewStats

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/tracking", tags=["tracking"])


@router.post("/page-view", status_code=status.HTTP_201_CREATED)
def track_page_view(
    data: PageViewCreate,
    request: Request,
    current_user: CurrentUser | None = Depends(get_optional_user),
    supabase: Client = Depends(get_service_client),
) -> dict:
    payload = {
        "path": data.path,
        "ip_address": request.client.host if request.client else None,
        "user_agent": request.headers.get("user-agent"),
        "referrer": data.referrer,
        "session_id": data.session_id,
        "metadata": data.metadata or {},
    }
    if current_user:
        payload["user_id"] = current_user.id
    supabase.table("page_views").insert(payload).execute()
    return {"status": "tracked"}


@router.get("/stats", response_model=PageViewStats)
def get_page_view_stats(
    current_user: CurrentUser = Depends(get_current_user),
    supabase: Client = Depends(get_service_client),
) -> PageViewStats:
    total = supabase.table("page_views").select("*", count="exact").execute()
    unique = supabase.table("page_views").select("user_id", count="exact").not_.is_("user_id", "null").execute()
    views_by_path = supabase.rpc("get_page_views_by_path").execute() if hasattr(supabase, "rpc") else None
    views_by_day = supabase.rpc("get_page_views_by_day").execute() if hasattr(supabase, "rpc") else None
    return PageViewStats(
        total_views=total.count if hasattr(total, "count") else 0,
        unique_visitors=unique.count if hasattr(unique, "count") else 0,
        views_by_path=views_by_path.data if views_by_path and views_by_path.data else [],
        views_by_day=views_by_day.data if views_by_day and views_by_day.data else [],
    )
