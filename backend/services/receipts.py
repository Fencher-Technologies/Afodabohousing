# mypy: ignore-errors
from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, datetime
from decimal import Decimal
from html import escape
from io import BytesIO
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle


@dataclass(frozen=True)
class ReceiptData:
    payment: dict[str, Any]
    lease: dict[str, Any]
    tenant: dict[str, Any]
    property: dict[str, Any]
    manager: dict[str, Any] | None

    @property
    def receipt_number(self) -> str:
        payment_id = str(self.payment["id"])
        basis = self.payment.get("paid_date") or self.payment.get("created_at") or datetime.now(UTC).date().isoformat()
        compact_date = str(basis)[:10].replace("-", "")
        return f"AFD-{compact_date}-{payment_id[-8:].upper()}"


def _format_money(value: Any) -> str:
    amount = Decimal(str(value or 0))
    return f"UGX {amount:,.0f}"


def _format_date(value: Any) -> str:
    if not value:
        return "Not recorded"
    return str(value)[:10]


def _tenant_name(receipt: ReceiptData) -> str:
    tenant = receipt.tenant
    return f"{tenant.get('first_name', '')} {tenant.get('last_name', '')}".strip()


def _property_label(receipt: ReceiptData) -> str:
    prop = receipt.property
    parts = [
        prop.get("title") or prop.get("address"),
        prop.get("address"),
        prop.get("city"),
    ]
    return ", ".join(str(part) for part in parts if part)


def _manager_label(receipt: ReceiptData) -> str:
    manager = receipt.manager or {}
    prop = receipt.property
    name = manager.get("full_name") or manager.get("email") or "Property manager"
    email = prop.get("manager_email") or manager.get("email")
    phone = prop.get("manager_phone") or manager.get("phone")
    contact = " | ".join(str(part) for part in [email, phone] if part)
    return f"{name} ({contact})" if contact else str(name)


def build_receipt_html(receipt: ReceiptData) -> str:
    rows = [
        ("Receipt number", receipt.receipt_number),
        ("Tenant", _tenant_name(receipt)),
        ("Property", _property_label(receipt)),
        ("Manager", _manager_label(receipt)),
        ("Amount", _format_money(receipt.payment.get("amount"))),
        ("Payment date", _format_date(receipt.payment.get("paid_date") or receipt.payment.get("created_at"))),
        ("Payment method", receipt.payment.get("payment_method") or "Not recorded"),
        ("Payment status", receipt.payment.get("status") or "Not recorded"),
        ("Transaction ID", receipt.payment.get("transaction_id") or "Not recorded"),
    ]
    table_rows = "\n".join(
        f"<tr><th>{escape(label)}</th><td>{escape(str(value))}</td></tr>" for label, value in rows
    )
    issued_at = datetime.now(UTC).strftime("%Y-%m-%d %H:%M UTC")
    return f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Receipt {escape(receipt.receipt_number)}</title>
  <style>
    body {{ font-family: Arial, sans-serif; margin: 40px; color: #1f2933; }}
    header {{ border-bottom: 2px solid #0f766e; margin-bottom: 28px; padding-bottom: 16px; }}
    h1 {{ font-size: 28px; margin: 0 0 6px; }}
    .brand {{ color: #0f766e; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }}
    table {{ border-collapse: collapse; width: 100%; margin-top: 20px; }}
    th, td {{ border-bottom: 1px solid #d9e2ec; padding: 12px 10px; text-align: left; }}
    th {{ width: 34%; color: #52606d; font-weight: 700; }}
    .amount {{ font-size: 22px; font-weight: 700; color: #0f766e; }}
    footer {{ margin-top: 36px; color: #627d98; font-size: 12px; }}
    @media print {{ body {{ margin: 18mm; }} }}
  </style>
</head>
<body>
  <header>
    <div class="brand">Afodabo Housing</div>
    <h1>Rent Payment Receipt</h1>
    <div>Issued {escape(issued_at)}</div>
  </header>
  <section>
    <div class="amount">{escape(_format_money(receipt.payment.get("amount")))}</div>
    <table>{table_rows}</table>
  </section>
  <footer>This receipt was generated digitally by Afodabo Housing.</footer>
</body>
</html>"""


def build_receipt_pdf(receipt: ReceiptData) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        title=f"Receipt {receipt.receipt_number}",
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "ReceiptTitle",
        parent=styles["Title"],
        fontName="Helvetica-Bold",
        fontSize=24,
        leading=30,
        textColor=colors.HexColor("#0F766E"),
        spaceAfter=6,
    )
    meta_style = ParagraphStyle(
        "ReceiptMeta",
        parent=styles["Normal"],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#52606D"),
    )
    story = [
        Paragraph("Afodabo Housing", meta_style),
        Paragraph("Rent Payment Receipt", title_style),
        Paragraph(f"Receipt number: {receipt.receipt_number}", meta_style),
        Spacer(1, 10 * mm),
    ]
    rows = [
        ["Tenant", _tenant_name(receipt)],
        ["Property", _property_label(receipt)],
        ["Manager", _manager_label(receipt)],
        ["Amount", _format_money(receipt.payment.get("amount"))],
        ["Payment date", _format_date(receipt.payment.get("paid_date") or receipt.payment.get("created_at"))],
        ["Payment method", receipt.payment.get("payment_method") or "Not recorded"],
        ["Payment status", receipt.payment.get("status") or "Not recorded"],
        ["Transaction ID", receipt.payment.get("transaction_id") or "Not recorded"],
    ]
    table = Table(rows, colWidths=[42 * mm, 118 * mm], hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#F0F7F6")),
                ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#334E68")),
                ("TEXTCOLOR", (1, 0), (1, -1), colors.HexColor("#102A43")),
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
                ("FONTSIZE", (0, 0), (-1, -1), 10),
                ("LEADING", (0, 0), (-1, -1), 14),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D9E2EC")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    story.extend([table, Spacer(1, 12 * mm), Paragraph("Generated digitally by Afodabo Housing.", meta_style)])
    doc.build(story)
    return buffer.getvalue()
