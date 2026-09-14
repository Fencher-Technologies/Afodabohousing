import csv
import io
from datetime import date

from fastapi import APIRouter, Depends, Query
from fastapi.responses import StreamingResponse
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
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
        "monthly_rent", "rent_period", "state", "city", "square_feet",
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
        "coverage_days", "frozen_monthly_rent",
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
    property_type_slug_filter: str | None = None,
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
    if property_type_slug_filter and resource == "properties":
        query = query.eq("property_type_slug", property_type_slug_filter)

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


def _location_line(*parts: object) -> str:
    """Join address parts, skipping the empty strings that nullable
    address/city/state columns (migrations 040/041/042) leave behind."""
    return ", ".join(str(p).strip() for p in parts if str(p or "").strip())


def _money(amount: object, currency: str) -> str:
    try:
        return f"{currency} {float(amount or 0):,.0f}"
    except (TypeError, ValueError):
        return f"{currency} {amount}"


def _portfolio_styles():
    from services.receipt_pdf import CHARCOAL, MUTED, NAVY

    styles = getSampleStyleSheet()
    return {
        "title": ParagraphStyle("Title", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=20, textColor=NAVY, spaceAfter=2),
        "subtitle": ParagraphStyle("Subtitle", parent=styles["Normal"], fontName="Helvetica", fontSize=10, textColor=MUTED, spaceAfter=0),
        "brand": ParagraphStyle("brand", fontName="Helvetica-Bold", fontSize=16, textColor=NAVY),
        "doc": ParagraphStyle("doc", fontName="Helvetica-Bold", fontSize=12, textColor=CHARCOAL),
        "h2": ParagraphStyle("H2", parent=styles["Heading2"], fontSize=13, spaceAfter=6, spaceBefore=14, textColor=CHARCOAL),
        "empty": ParagraphStyle("Empty", parent=styles["Normal"], fontName="Helvetica-Oblique", fontSize=10, textColor=MUTED, spaceAfter=4),
        "cell_h": ParagraphStyle("cell_h", fontName="Helvetica-Bold", fontSize=9, textColor=colors.white, leading=12),
        "cell": ParagraphStyle("cell", fontName="Helvetica", fontSize=9, textColor=CHARCOAL, leading=12),
        "foot": ParagraphStyle("foot", fontName="Helvetica", fontSize=8, textColor=MUTED),
    }


def _portfolio_header(st: dict, generated: str):
    """Logo (repo asset, graceful fallback to styled text) + report title."""
    from pathlib import Path

    from reportlab.platypus import Image as RLImage

    logo = Path(__file__).resolve().parents[2] / "src" / "assets" / "axis-lockup.png"
    if logo.exists():
        left = RLImage(str(logo), width=44 * mm, height=14 * mm, kind="proportional")
    else:
        left = Paragraph("AXIS HOUSING", st["brand"])
    return Table(
        [[left, Paragraph("PORTFOLIO REPORT", st["doc"])]],
        colWidths=[87 * mm, 87 * mm],
    )


def _styled_table(header: list, rows: list, widths: list, st: dict) -> Table:
    from services.receipt_pdf import BORDER, CREAM, NAVY

    data = [[Paragraph(f"<b>{h}</b>", st["cell_h"]) for h in header]]
    for r in rows:
        data.append([Paragraph(str(c) if c not in (None, "") else "-", st["cell"]) for c in r])
    t = Table(data, colWidths=widths, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, CREAM]),
        ("GRID", (0, 0), (-1, -1), 0.5, BORDER),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    return t


def _portfolio_footer(canvas, doc, generated: str) -> None:
    from services.receipt_pdf import MUTED

    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(18 * mm, 12 * mm, f"Axis Housing  •  Generated {generated}")
    canvas.drawRightString(A4[0] - 18 * mm, 12 * mm, f"Page {doc.page}")
    canvas.restoreState()


def build_portfolio_report_pdf(context: dict) -> bytes:
    """Render the portfolio report from an assembled context dict.

    Pure builder (no DB): the endpoint assembles `context`, tests and
    tooling can call this directly with sample data.
    """
    from io import BytesIO

    st = _portfolio_styles()
    generated = context.get("generated_on") or date.today().isoformat()

    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        rightMargin=18 * mm, leftMargin=18 * mm, topMargin=18 * mm, bottomMargin=18 * mm,
        title="Portfolio Report",
    )

    story = [_portfolio_header(st, generated), Spacer(1, 4 * mm)]
    story.append(Paragraph("Portfolio Report", st["title"]))
    story.append(Paragraph(context.get("period_label") or "Reporting period: All time", st["subtitle"]))
    story.append(Paragraph(f"Prepared for {context.get('manager_name') or 'Property Manager'}", st["subtitle"]))
    story.append(Spacer(1, 4 * mm))

    properties = context.get("properties") or []
    story.append(Paragraph(f"Properties ({len(properties)})", st["h2"]))
    if properties:
        story.append(_styled_table(
            ["Title", "Type", "Beds", "Rent", "Status", "Location"],
            properties,
            [52 * mm, 26 * mm, 12 * mm, 32 * mm, 20 * mm, 32 * mm],
            st,
        ))
    else:
        story.append(Paragraph("No properties for this period", st["empty"]))

    tenants = context.get("tenants") or []
    story.append(Paragraph(f"Tenants ({len(tenants)})", st["h2"]))
    if tenants:
        story.append(_styled_table(
            ["Name", "Email", "Phone", "Status"],
            tenants,
            [45 * mm, 55 * mm, 32 * mm, 42 * mm],
            st,
        ))
    else:
        story.append(Paragraph("No tenants for this period", st["empty"]))

    story.append(Paragraph("Summary", st["h2"]))
    summary_rows = context.get("summary") or []
    if summary_rows:
        story.append(_styled_table(
            ["Metric", "Value"],
            summary_rows,
            [87 * mm, 87 * mm],
            st,
        ))
    else:
        story.append(Paragraph("No activity for this period", st["empty"]))

    doc.build(
        story,
        onFirstPage=lambda c, d: _portfolio_footer(c, d, generated),
        onLaterPages=lambda c, d: _portfolio_footer(c, d, generated),
    )
    return buf.getvalue()


@router.get("/report-pdf")
def export_report_pdf(
    current_user: CurrentUser = Depends(require_super_admin_or_manager),
    supabase: Client = Depends(get_service_client),
    start_date: date | None = Query(None, description="Only count payments on/after this date"),
    end_date: date | None = Query(None, description="Only count payments on/before this date"),
):
    from services import get_lease_service

    generated = date.today().isoformat()

    profile = (
        supabase.table("profiles").select("full_name").eq("user_id", current_user.id).limit(1).execute()
    )
    manager_name = (profile.data or [{}])[0].get("full_name") or None

    props = supabase.table("properties").select(
        "title, property_type, bedrooms, monthly_rent, rent_currency, status, city, state, address"
    ).eq("owner_id", current_user.id).execute()
    tenants_data = supabase.table("tenants").select(
        "first_name, last_name, email, phone, status, user_id"
    ).eq("owner_id", current_user.id).execute()

    # Phone fallback: tenants.phone is often empty while profiles.phone holds
    # the number (same auth user, different row). One batched lookup.
    tenants_list = list(tenants_data.data or [])
    missing = [t for t in tenants_list if not (t.get("phone") or "").strip() and t.get("user_id")]
    if missing:
        profs = (
            supabase.table("profiles").select("user_id, phone")
            .in_("user_id", [str(t["user_id"]) for t in missing])
            .execute()
        )
        by_uid = {str(p.get("user_id")): (p.get("phone") or "") for p in (profs.data or [])}
        for t in missing:
            fallback = by_uid.get(str(t.get("user_id")), "")
            if fallback.strip():
                t["phone"] = fallback

    leases_data = supabase.table("leases").select(
        "id, monthly_rent, currency, status, start_date, end_date"
    ).eq("owner_id", current_user.id).execute()
    lease_ids = [str(l.get("id")) for l in (leases_data.data or []) if l.get("id")]
    currency_of = {str(l.get("id")): (l.get("currency") or "UGX") for l in (leases_data.data or [])}
    if lease_ids:
        payments_data = supabase.table("payments").select(
            "amount, status, paid_date, created_at, lease_id"
        ).in_("lease_id", lease_ids).execute()
    else:
        payments_data = type("EmptyResponse", (), {"data": []})()

    def _in_period(p: dict) -> bool:
        day = (p.get("paid_date") or (p.get("created_at") or "")[:10] or "")
        if start_date and day < start_date.isoformat():
            return False
        if end_date and day > end_date.isoformat():
            return False
        return True

    confirmed = [
        p for p in (payments_data.data or [])
        if p.get("status") in ("confirmed", "completed") and _in_period(p)
    ]
    collected_by_ccy: dict[str, float] = {}
    for p in confirmed:
        ccy = currency_of.get(str(p.get("lease_id")), "UGX")
        collected_by_ccy[ccy] = collected_by_ccy.get(ccy, 0.0) + float(p.get("amount") or 0)
    rent_by_ccy: dict[str, float] = {}
    for l in (leases_data.data or []):
        ccy = l.get("currency") or "UGX"
        rent_by_ccy[ccy] = rent_by_ccy.get(ccy, 0.0) + float(l.get("monthly_rent") or 0)

    # Snapshot figures reuse the dashboard's money-ledger enrichment
    # (LeaseService.get_all), so the PDF can never disagree with it.
    lease_svc = get_lease_service(supabase)
    enriched, _ = lease_svc.get_all(current_user.id, skip=0, limit=500)
    outstanding = round(sum(float(l.get("balance_due") or 0) for l in enriched), 2)
    expected = sum(float(l.get("expected_rent") or 0) for l in enriched)
    active = sum(1 for l in enriched if l.get("effective_status") == "active")
    total_leases = len(enriched) or 1
    occupancy = round((active / total_leases) * 100, 2)
    collection_rate = round((sum(float(l.get("total_paid") or 0) for l in enriched) / expected) * 100, 2) if expected else 0.0

    if start_date or end_date:
        period_label = f"Reporting period: {start_date.isoformat() if start_date else '…'} to {end_date.isoformat() if end_date else '…'} (payments); portfolio snapshot as of {generated}"

        def collected_label(c: str) -> str:
            return f"Total collected ({c}, period)"
    else:
        period_label = f"Reporting period: All time (portfolio snapshot as of {generated})"

        def collected_label(c: str) -> str:
            return f"Total collected ({c})"

    properties = [
        [
            r.get("title", ""),
            r.get("property_type", ""),
            str(r.get("bedrooms", "")),
            _money(r.get("monthly_rent"), r.get("rent_currency") or "UGX"),
            r.get("status", ""),
            _location_line(r.get("address"), r.get("city"), r.get("state")),
        ]
        for r in (props.data or [])
    ]
    tenants = [
        [
            f"{r.get('first_name', '')} {r.get('last_name', '')}".strip(),
            r.get("email", ""),
            (r.get("phone") or "").strip(),
            r.get("status", ""),
        ]
        for r in tenants_list
    ]

    summary: list = []
    for ccy in sorted(set(rent_by_ccy) | set(collected_by_ccy)):
        summary.append([f"Total monthly rent ({ccy})", _money(rent_by_ccy.get(ccy, 0.0), ccy)])
    for ccy in sorted(set(rent_by_ccy) | set(collected_by_ccy)):
        summary.append([collected_label(ccy), f"{_money(collected_by_ccy.get(ccy, 0.0), ccy)} ({len(confirmed)} payment(s))"])
    summary += [
        ["Active leases", f"{active} of {len(enriched)}"],
        ["Tenants", str(len(tenants))],
        ["Occupancy rate", f"{occupancy}%"],
        ["Total outstanding", _money(outstanding, next(iter(sorted(set(rent_by_ccy) | set(collected_by_ccy))), "UGX"))],
        ["Collection rate", f"{collection_rate}%"],
    ]

    pdf = build_portfolio_report_pdf({
        "generated_on": generated,
        "period_label": period_label,
        "manager_name": manager_name,
        "properties": properties,
        "tenants": tenants,
        "summary": summary,
    })
    buf = io.BytesIO(pdf)
    return StreamingResponse(
        buf, media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="portfolio_report_{date.today()}.pdf"'},
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
