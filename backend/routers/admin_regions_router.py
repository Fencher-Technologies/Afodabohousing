"""Super Admin endpoints for reviewing pending region sync changes."""

from __future__ import annotations

from datetime import datetime
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from dependencies import require_super_admin
from dependencies.database import get_service_client

# Every route here reads and writes through the service-role client, which
# bypasses RLS entirely — the guard has to live in the application layer.
# _require_admin below was a no-op `pass`, leaving all five endpoints open to
# the internet, including the sync trigger and the pending-change decision.
router = APIRouter(
    prefix="/admin/regions",
    tags=["admin", "regions"],
    dependencies=[Depends(require_super_admin)],
)


# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------

class RegionChangeDecision(BaseModel):
    decision: str  # "approve" or "reject"
    superseded_by_region_id: str | None = None


class SyncTriggerRequest(BaseModel):
    dry_run: bool = False


class SyncTriggerResponse(BaseModel):
    status: str
    counts: dict[str, int] | None = None
    message: str


# ---------------------------------------------------------------------------
# Auth helper (role-based)
# ---------------------------------------------------------------------------

# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/pending")
async def list_pending_reviews(
    status: str = Query("pending", description="Filter by status: pending, approved, rejected"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> dict[str, Any]:
    """List pending region changes requiring Super Admin confirmation."""
    sb = get_service_client()

    query = (
        sb.table("pending_region_review")
        .select("*", count="exact")
        .eq("status", status)
        .order("created_at", desc=True)
        .range(offset, offset + limit - 1)
    )
    result = query.execute()

    return {
        "items": result.data,
        "total": result.count or 0,
        "limit": limit,
        "offset": offset,
    }


@router.post("/pending/{review_id}/decide")
async def decide_pending_review(
    review_id: str,
    body: RegionChangeDecision,
) -> dict[str, str]:
    """Approve or reject a pending region change."""
    sb = get_service_client()

    if body.decision not in ("approve", "reject"):
        raise HTTPException(status_code=400, detail="decision must be 'approve' or 'reject'")

    # Fetch the pending review
    existing = (
        sb.table("pending_region_review")
        .select("*")
        .eq("id", review_id)
        .single()
        .execute()
    )
    if not existing.data:
        raise HTTPException(status_code=404, detail="Pending review not found")

    review = existing.data

    if review["status"] != "pending":
        raise HTTPException(status_code=400, detail=f"Review already {review['status']}")

    now = datetime.utcnow().isoformat() + "Z"

    if body.decision == "approve":
        # Apply the change to the actual regions table
        region_id = review["region_id"]
        new_name = review["new_name"]
        change_type = review["change_type"]

        if change_type in ("rename", "name_change"):
            sb.table("regions").update({"name": new_name}).eq("id", region_id).execute()
        elif change_type in ("merge", "split"):
            # For merge/split, mark the old region as deprecated
            sb.table("regions").update({
                "deprecated_at": now,
                "superseded_by_region_id": body.superseded_by_region_id,
            }).eq("id", region_id).execute()

    # Mark the review as resolved
    sb.table("pending_region_review").update({
        "status": "approved" if body.decision == "approve" else "rejected",
        "reviewed_at": now,
        "resolved_at": now,
    }).eq("id", review_id).execute()

    return {"status": "ok", "decision": body.decision}


@router.get("/sync-history")
async def list_sync_history(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
) -> dict[str, Any]:
    """List past sync runs with counts."""
    sb = get_service_client()

    result = (
        sb.table("sync_history")
        .select("*", count="exact")
        .order("run_timestamp", desc=True)
        .range(offset, offset + limit - 1)
        .execute()
    )

    return {
        "items": result.data,
        "total": result.count or 0,
        "limit": limit,
        "offset": offset,
    }


@router.post("/sync")
async def trigger_sync(body: SyncTriggerRequest) -> SyncTriggerResponse:
    """Manually trigger a GeoNames sync (for Super Admin use).

    If dry_run=true, shows what would change without applying.
    """
    import subprocess
    import sys as _sys

    sb = get_service_client()

    cmd = [_sys.executable, "scripts/sync_geonames.py", "sync"]
    if body.dry_run:
        cmd.append("--dry-run")

    try:
        proc = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=120,
            cwd=str(Path(__file__).parent.parent),
        )
        return SyncTriggerResponse(
            status="ok" if proc.returncode == 0 else "error",
            message=proc.stdout[-500:] if proc.stdout else proc.stderr[-500:],
        )
    except subprocess.TimeoutExpired:
        return SyncTriggerResponse(status="timeout", message="Sync timed out after 120s")


@router.get("/deprecated")
async def list_deprecated_regions(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> dict[str, Any]:
    """List deprecated regions (for manager dashboard flagging)."""
    sb = get_service_client()

    result = (
        sb.table("regions")
        .select("*", count="exact")
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
