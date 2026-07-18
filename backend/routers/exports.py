import csv
import io
from datetime import date

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from supabase import Client

from dependencies import (
    CurrentUser,
    get_service_client,
    require_super_admin,
    require_super_admin_or_manager,
)

router = APIRouter(prefix="/exports", tags=["exports"])

COLUMNS = {
    "properties": [
        "id", "title", "property_type", "bedrooms", "bathrooms",
        "rent_amount", "rent_period", "state", "city", "area",
        "address", "status", "manager_phone", "created_at",
    ],
    "tenants": [
        "id", "first_name", "last_name", "email", "phone",
        "status", "created_at",
    ],
    "leases": [
        "id", "property_id", "tenant_id", "monthly_rent",
        "start_date", "end_date", "status", "created_at",
    ],
    "payments": [
        "id", "lease_id", "tenant_id", "amount", "status",
        "payment_type", "due_date", "paid_date", "notes", "created_at",
    ],
    "boosts": [
        "id", "property_id", "manager_id", "amount_paid",
        "duration_days", "started_at", "expires_at", "status",
        "transaction_id", "payment_method", "created_at",
    ],
    "managers": [
        "id", "user_id", "email", "full_name", "phone",
        "role", "status", "created_at",
    ],
}

TABLE_MAP = {
    "properties": "properties",
    "tenants": "tenants",
    "leases": "leases",
    "payments": "payments",
    "boosts": "property_boosts",
    "managers": "profiles",
}


def _build_query(
    supabase: Client,
    resource: str,
    current_user: CurrentUser,
    status_filter: str | None = None,
    state_filter: str | None = None,
    property_type_filter: str | None = None,
    skip: int = 0,
    limit: int = 10000,
):
    table = TABLE_MAP[resource]
    query = supabase.table(table).select(",".join(COLUMNS[resource]))

    if resource == "managers":
        query = query.eq("role", "house_manager")
    elif current_user.role == "house_manager" and resource != "boosts":
        if resource == "properties":
            query = query.eq("owner_id", current_user.id)
        elif resource == "tenants":
            query = query.eq("owner_id", current_user.id)
        elif resource == "leases":
            query = query.eq("owner_id", current_user.id)
        elif resource == "payments":
            query = query.eq("owner_id", current_user.id)

    if status_filter:
        query = query.eq("status", status_filter)
    if state_filter and resource == "properties":
        query = query.ilike("state", f"%{state_filter}%")
    if property_type_filter and resource == "properties":
        query = query.eq("property_type", property_type_filter)

    query = query.order("created_at", desc=True).range(skip, skip + limit - 1)
    return query.execute()


def _make_csv(rows: list[dict], columns: list[str]) -> io.StringIO:
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(columns)
    for row in rows:
        writer.writerow([str(row.get(c, "") or "") for c in columns])
    buf.seek(0)
    return buf


def _make_xlsx(rows: list[dict], columns: list[str]) -> io.BytesIO:
    from openpyxl import Workbook
    from openpyxl.styles import Font

    wb = Workbook()
    ws = wb.active
    ws.title = "Export"

    header_font = Font(bold=True)
    for i, col in enumerate(columns, 1):
        cell = ws.cell(row=1, column=i, value=col)
        cell.font = header_font

    for r, row in enumerate(rows, 2):
        for c, col in enumerate(columns, 1):
            ws.cell(row=r, column=c, value=row.get(col, "") or "")

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return buf


@router.get("/properties")
def export_properties(
    format: str = Query("csv", pattern="^(csv|xlsx)$"),
    status: str | None = Query(None),
    state: str | None = Query(None),
    property_type: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(10000, ge=1, le=50000),
    current_user: CurrentUser = Depends(require_super_admin_or_manager),
    supabase: Client = Depends(get_service_client),
):
    result = _build_query(supabase, "properties", current_user, status, state, property_type, skip, limit)
    rows = result.data or []
    ext = format
    media = "text/csv" if format == "csv" else "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    buf = _make_csv(rows, COLUMNS["properties"]) if format == "csv" else _make_xlsx(rows, COLUMNS["properties"])
    return StreamingResponse(
        buf, media_type=media,
        headers={"Content-Disposition": f"attachment; filename=properties_{date.today()}.{ext}"},
    )


@router.get("/tenants")
def export_tenants(
    format: str = Query("csv", pattern="^(csv|xlsx)$"),
    status: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(10000, ge=1, le=50000),
    current_user: CurrentUser = Depends(require_super_admin_or_manager),
    supabase: Client = Depends(get_service_client),
):
    result = _build_query(supabase, "tenants", current_user, status, skip=skip, limit=limit)
    rows = result.data or []
    ext = format
    media = "text/csv" if format == "csv" else "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    buf = _make_csv(rows, COLUMNS["tenants"]) if format == "csv" else _make_xlsx(rows, COLUMNS["tenants"])
    return StreamingResponse(
        buf, media_type=media,
        headers={"Content-Disposition": f"attachment; filename=tenants_{date.today()}.{ext}"},
    )


@router.get("/leases")
def export_leases(
    format: str = Query("csv", pattern="^(csv|xlsx)$"),
    status: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(10000, ge=1, le=50000),
    current_user: CurrentUser = Depends(require_super_admin_or_manager),
    supabase: Client = Depends(get_service_client),
):
    result = _build_query(supabase, "leases", current_user, status, skip=skip, limit=limit)
    rows = result.data or []
    ext = format
    media = "text/csv" if format == "csv" else "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    buf = _make_csv(rows, COLUMNS["leases"]) if format == "csv" else _make_xlsx(rows, COLUMNS["leases"])
    return StreamingResponse(
        buf, media_type=media,
        headers={"Content-Disposition": f"attachment; filename=leases_{date.today()}.{ext}"},
    )


@router.get("/payments")
def export_payments(
    format: str = Query("csv", pattern="^(csv|xlsx)$"),
    status: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(10000, ge=1, le=50000),
    current_user: CurrentUser = Depends(require_super_admin_or_manager),
    supabase: Client = Depends(get_service_client),
):
    result = _build_query(supabase, "payments", current_user, status, skip=skip, limit=limit)
    rows = result.data or []
    ext = format
    media = "text/csv" if format == "csv" else "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    buf = _make_csv(rows, COLUMNS["payments"]) if format == "csv" else _make_xlsx(rows, COLUMNS["payments"])
    return StreamingResponse(
        buf, media_type=media,
        headers={"Content-Disposition": f"attachment; filename=payments_{date.today()}.{ext}"},
    )


@router.get("/boosts")
def export_boosts(
    format: str = Query("csv", pattern="^(csv|xlsx)$"),
    status: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(10000, ge=1, le=50000),
    current_user: CurrentUser = Depends(require_super_admin),
    supabase: Client = Depends(get_service_client),
):
    result = _build_query(supabase, "boosts", current_user, status, skip=skip, limit=limit)
    rows = result.data or []
    ext = format
    media = "text/csv" if format == "csv" else "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    buf = _make_csv(rows, COLUMNS["boosts"]) if format == "csv" else _make_xlsx(rows, COLUMNS["boosts"])
    return StreamingResponse(
        buf, media_type=media,
        headers={"Content-Disposition": f"attachment; filename=boosts_{date.today()}.{ext}"},
    )


@router.get("/managers")
def export_managers(
    format: str = Query("csv", pattern="^(csv|xlsx)$"),
    status: str | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(10000, ge=1, le=50000),
    current_user: CurrentUser = Depends(require_super_admin),
    supabase: Client = Depends(get_service_client),
):
    result = _build_query(supabase, "managers", current_user, status, skip=skip, limit=limit)
    rows = result.data or []
    ext = format
    media = "text/csv" if format == "csv" else "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    buf = _make_csv(rows, COLUMNS["managers"]) if format == "csv" else _make_xlsx(rows, COLUMNS["managers"])
    return StreamingResponse(
        buf, media_type=media,
        headers={"Content-Disposition": f"attachment; filename=managers_{date.today()}.{ext}"},
    )
