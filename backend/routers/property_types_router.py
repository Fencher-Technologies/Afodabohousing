"""Property type catalog endpoints for the frontend dropdowns.

Categories and types are stored in the database and managed via SQL migrations.
These endpoints are read-only for the public; mutations happen via migrations.
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Query

from dependencies import get_service_client

router = APIRouter(prefix="/property-types", tags=["property-types"])


@router.get("/categories")
def list_categories() -> list[dict[str, Any]]:
    """List active property categories for the category dropdown."""
    supabase = get_service_client()
    resp = (
        supabase.table("property_categories")
        .select("slug, label, sort_order")
        .eq("is_active", True)
        .order("sort_order")
        .execute()
    )
    return resp.data or []


@router.get("/types")
def list_types(
    category: str | None = Query(None, description="Filter by category slug"),
) -> list[dict[str, Any]]:
    """List active property types, optionally filtered by category."""
    supabase = get_service_client()
    q = (
        supabase.table("property_types")
        .select("slug, label, category_slug, sort_order")
        .eq("is_active", True)
    )
    if category:
        q = q.eq("category_slug", category)
    q = q.order("sort_order")
    return (q.execute().data or [])
