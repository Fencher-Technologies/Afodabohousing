"""Printable PDF rendering for payment receipts.

Renders from the receipt's stored snapshot, so the document stays correct
even if the underlying tenant, property, or payment rows later change.
"""

from __future__ import annotations

from datetime import UTC, datetime
from io import BytesIO
from typing import Any

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

NAVY = colors.HexColor("#161E31")
CHARCOAL = colors.HexColor("#353E45")
CREAM = colors.HexColor("#F7F5F0")
BORDER = colors.HexColor("#E5E1DA")
MUTED = colors.HexColor("#5A636B")

_BRAND = ParagraphStyle("brand", fontName="Helvetica-Bold", fontSize=16, textColor=NAVY, alignment=TA_LEFT)
_DOC = ParagraphStyle("doc", fontName="Helvetica-Bold", fontSize=12, textColor=CHARCOAL, alignment=TA_RIGHT)
_LABEL = ParagraphStyle("label", fontName="Helvetica", fontSize=9, textColor=MUTED, alignment=TA_LEFT)
_VALUE = ParagraphStyle("value", fontName="Helvetica-Bold", fontSize=10, textColor=CHARCOAL, alignment=TA_LEFT)
_AMOUNT = ParagraphStyle("amount", fontName="Helvetica-Bold", fontSize=22, textColor=NAVY, alignment=TA_LEFT)
_FOOT = ParagraphStyle("foot", fontName="Helvetica", fontSize=8, textColor=MUTED, alignment=TA_LEFT)


def _fmt_amount(amount: Any, currency: str) -> str:
    try:
        return f"{currency} {float(amount):,.2f}"
    except (TypeError, ValueError):
        return f"{currency} {amount}"


def _fmt_date(value: Any) -> str:
    if not value:
        return "-"
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).strftime("%d %b %Y")
    except ValueError:
        return str(value)[:10]


def build_receipt_pdf(receipt: dict[str, Any]) -> bytes:
    """Render a one-page A4 receipt PDF from a receipts table row."""
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=20 * mm,
        rightMargin=20 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm,
        title=f"Receipt {receipt.get('receipt_number', '')}",
    )

    currency = receipt.get("currency") or "UGX"
    status = (receipt.get("status") or "active").upper()

    story: list[Any] = []

    header = Table(
        [[Paragraph("AXIS HOUSING", _BRAND), Paragraph("PAYMENT RECEIPT", _DOC)]],
        colWidths=[85 * mm, 85 * mm],
    )
    header.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LINEBELOW", (0, 0), (-1, 0), 1.5, NAVY),
    ]))
    story.append(header)
    story.append(Spacer(1, 10 * mm))

    meta = Table(
        [[
            Paragraph(f"Receipt No: <b>{receipt.get('receipt_number', '-')}</b>", _LABEL),
            Paragraph(f"Status: <b>{status}</b>", _LABEL),
            Paragraph(f"Issued: {_fmt_date(receipt.get('created_at'))}", _LABEL),
        ]],
        colWidths=[70 * mm, 45 * mm, 55 * mm],
    )
    meta.setStyle(TableStyle([("BOTTOMPADDING", (0, 0), (-1, -1), 6)]))
    story.append(meta)
    story.append(Spacer(1, 6 * mm))

    story.append(Paragraph("AMOUNT RECEIVED", _LABEL))
    story.append(Paragraph(_fmt_amount(receipt.get("amount"), currency), _AMOUNT))
    story.append(Spacer(1, 8 * mm))

    rows = [
        ("Received from", receipt.get("tenant_name") or "-"),
        ("Property", receipt.get("property_title") or "-"),
        ("Property address", receipt.get("property_address") or "-"),
        ("Unit", receipt.get("unit_label") or "-"),
        ("Payment type", (receipt.get("payment_type") or "rent").replace("_", " ").title()),
        ("Payment method", (receipt.get("payment_method") or "-").replace("_", " ").title()),
        ("Payment date", _fmt_date(receipt.get("payment_date"))),
        ("Transaction reference", receipt.get("transaction_reference") or "-"),
        ("Recorded by", receipt.get("manager_name") or "Property Manager"),
    ]
    # Show the period the payment covers, not just its length: a tenant
    # needs to see the date their rent runs to.
    start = receipt.get("coverage_start_date") or receipt.get("payment_date")
    end = receipt.get("coverage_end_date")
    if start and end:
        rows.append(("Rent period", f"{_fmt_date(start)} to {_fmt_date(end)}"))
    if receipt.get("coverage_days"):
        rows.append(("Rent coverage", f"{receipt['coverage_days']} days"))

    table = Table(
        [[Paragraph(k, _LABEL), Paragraph(str(v), _VALUE)] for k, v in rows],
        colWidths=[55 * mm, 115 * mm],
    )
    table.setStyle(TableStyle([
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [colors.white, CREAM]),
        ("LINEBELOW", (0, 0), (-1, -2), 0.5, BORDER),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ]))
    story.append(table)
    story.append(Spacer(1, 12 * mm))

    story.append(Paragraph(
        "This receipt was generated electronically by Axis Housing and is valid without a "
        "physical signature. It acknowledges the payment shown above as confirmed by the "
        "house manager.",
        _FOOT,
    ))

    doc.build(story)
    return buf.getvalue()
