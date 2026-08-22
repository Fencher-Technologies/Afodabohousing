"""Region filter endpoints for the frontend dropdowns.

These endpoints read from the local countries/regions tables (never live
against GeoNames or Google). The sync job keeps the data current; the
filter itself stays fast and free to use.
"""

from __future__ import annotations

from typing import Any

import httpx
from fastapi import APIRouter, Query

from dependencies.database import get_service_client

router = APIRouter(prefix="/regions", tags=["regions"])


@router.get("/resolve-url")
async def resolve_short_url(url: str) -> dict[str, str]:
    """Resolve a short URL (goo.gl, maps.app.goo, etc.) to its final destination."""
    try:
        async with httpx.AsyncClient(follow_redirects=True, timeout=10) as client:
            r = await client.get(url)
            return {"url": str(r.url)}
    except Exception:
        return {"url": url}


@router.get("/countries")
async def list_countries(
    active_only: bool = Query(True, description="Only return active countries"),
) -> list[dict[str, Any]]:
    """List all countries for the country dropdown."""
    sb = get_service_client()

    query = sb.table("countries").select("iso_code, name, is_active")
    if active_only:
        query = query.eq("is_active", True)
    query = query.order("name")

    result = query.execute()
    # Return consistent field names: id = iso_code, iso2 = iso_code
    return [
        {"id": r["iso_code"], "iso2": r["iso_code"], "name": r["name"]}
        for r in (result.data or [])
    ]


@router.get("/regions")
async def list_regions(
    country_id: str | None = Query(None, description="Filter by ISO country code"),
    admin_level: str | None = Query(None, description="Filter by admin_level"),
    active_only: bool = Query(True, description="Only return active (non-deprecated) regions"),
    search: str | None = Query(None, description="Search by name"),
) -> list[dict[str, Any]]:
    """List regions for the district/region dropdown.

    Supports:
      - Country filtering (e.g., ?country_id=UG → all Ugandan regions)
      - Admin level filtering (e.g., ?admin_level=state → only states)
      - Name search (e.g., ?search=kampala → fuzzy match)
    """
    sb = get_service_client()

    query = sb.table("regions").select(
        "id, country_id, name, admin_level, geonames_id, effective_date"
    )

    if country_id:
        query = query.eq("country_id", country_id)
    if admin_level:
        query = query.eq("admin_level", admin_level)
    if active_only:
        query = query.is_("deprecated_at", None)
    if search:
        query = query.ilike("name", f"%{search}%")

    query = query.order("country_id").order("admin_level").order("name")
    result = query.execute()
    return result.data


@router.get("/regions/{region_id}")
async def get_region(region_id: str) -> dict[str, Any]:
    """Get a single region by ID (for edit forms)."""
    sb = get_service_client()

    result = (
        sb.table("regions")
        .select("*")
        .eq("id", region_id)
        .single()
        .execute()
    )
    return result.data


@router.get("/countries/{country_id}/regions")
async def list_regions_by_country(
    country_id: str,
    admin_level: str | None = Query(None),
    active_only: bool = Query(True),
) -> list[dict[str, Any]]:
    """Convenience endpoint: regions for a specific country."""
    sb = get_service_client()

    query = (
        sb.table("regions")
        .select("id, name, admin_level, geonames_id")
        .eq("country_id", country_id)
    )
    if admin_level:
        query = query.eq("admin_level", admin_level)
    if active_only:
        query = query.is_("deprecated_at", None)
    query = query.order("admin_level").order("name")

    result = query.execute()
    return result.data


@router.get("/deprecated")
async def list_deprecated_for_manager(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> dict[str, Any]:
    """List deprecated regions for manager dashboard flagging.

    This endpoint is public (authenticated) so managers can see which
    of their properties' regions have been deprecated.
    """
    sb = get_service_client()

    result = (
        sb.table("regions")
        .select("id, country_id, name, admin_level, geonames_id, deprecated_at, superseded_by_region_id")
        .not_.is_("deprecated_at", "null")
        .order("deprecated_at", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )

    return {
        "items": result.data,
        "total": result.count or 0,
        "limit": limit,
        "offset": offset,
    }
