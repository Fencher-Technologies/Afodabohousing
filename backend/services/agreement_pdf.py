# mypy: ignore-errors
from __future__ import annotations

from datetime import UTC, datetime
from decimal import Decimal, ROUND_HALF_UP
from io import BytesIO
from typing import Any

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    HRFlowable,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


def _format_money(value: Any) -> str:
    amount = Decimal(str(value or 0)).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    return f"UGX {amount:,.0f}"


def _format_date(value: Any) -> str:
    if not value:
        return "—"
    return str(value)[:10]


def _format_datetime(value: Any) -> str:
    if not value:
        return "—"
    try:
        dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        return dt.strftime("%d %B %Y at %H:%M")
    except (ValueError, TypeError):
        return str(value)[:10]


def _sigs_status(sigs: dict[str, Any], role: str) -> str:
    rs = sigs.get(role, {})
    if rs.get("consent_status") == "approved" and rs.get("signed_name"):
        return f'Signed by {rs["signed_name"]} on {_format_datetime(rs.get("signed_at"))}'
    return "Awaiting signature"


class AgreementPDFGenerator:
    def __init__(self, content: dict[str, Any]):
        self.content = content
        self._styles = getSampleStyleSheet()

    # ── Styles ──────────────────────────────────────────────────────────

    def _init_styles(self) -> dict[str, ParagraphStyle]:
        return {
            "title": ParagraphStyle(
                "AgreementTitle",
                fontName="Helvetica-Bold",
                fontSize=18,
                leading=22,
                alignment=TA_CENTER,
                spaceAfter=4,
                textColor=colors.HexColor("#1a1a1a"),
            ),
            "subtitle": ParagraphStyle(
                "AgreementSubtitle",
                fontName="Helvetica",
                fontSize=9,
                leading=12,
                alignment=TA_CENTER,
                textColor=colors.HexColor("#666666"),
            ),
            "section": ParagraphStyle(
                "SectionTitle",
                fontName="Helvetica-Bold",
                fontSize=12,
                leading=16,
                spaceBefore=14,
                spaceAfter=6,
                textColor=colors.HexColor("#0F766E"),
            ),
            "subsection": ParagraphStyle(
                "SubsectionTitle",
                fontName="Helvetica-Bold",
                fontSize=10,
                leading=14,
                spaceBefore=8,
                spaceAfter=3,
                textColor=colors.HexColor("#334155"),
            ),
            "body": ParagraphStyle(
                "BodyText",
                fontName="Helvetica",
                fontSize=9.5,
                leading=13,
                spaceAfter=4,
                textColor=colors.HexColor("#1f2937"),
            ),
            "body_bold": ParagraphStyle(
                "BodyBold",
                fontName="Helvetica-Bold",
                fontSize=9.5,
                leading=13,
                spaceAfter=4,
                textColor=colors.HexColor("#1f2937"),
            ),
            "clause_title": ParagraphStyle(
                "ClauseTitle",
                fontName="Helvetica-Bold",
                fontSize=9.5,
                leading=13,
                spaceBefore=6,
                spaceAfter=2,
                textColor=colors.HexColor("#1f2937"),
            ),
            "clause_body": ParagraphStyle(
                "ClauseBody",
                fontName="Helvetica",
                fontSize=9,
                leading=12.5,
                spaceAfter=4,
                textColor=colors.HexColor("#334155"),
            ),
            "signature_name": ParagraphStyle(
                "SignatureName",
                fontName="Helvetica-Bold",
                fontSize=11,
                leading=15,
                spaceBefore=4,
                spaceAfter=2,
                textColor=colors.HexColor("#1a1a1a"),
            ),
            "signature_label": ParagraphStyle(
                "SignatureLabel",
                fontName="Helvetica-Bold",
                fontSize=8,
                leading=10,
                textColor=colors.HexColor("#64748B"),
            ),
            "signature_meta": ParagraphStyle(
                "SignatureMeta",
                fontName="Helvetica",
                fontSize=7.5,
                leading=10,
                textColor=colors.HexColor("#94A3B8"),
            ),
            "footer": ParagraphStyle(
                "Footer",
                fontName="Helvetica",
                fontSize=7,
                leading=9,
                alignment=TA_CENTER,
                textColor=colors.HexColor("#999999"),
            ),
            "term_label": ParagraphStyle(
                "TermLabel",
                fontName="Helvetica",
                fontSize=9.5,
                leading=13,
                textColor=colors.HexColor("#64748B"),
            ),
            "term_value": ParagraphStyle(
                "TermValue",
                fontName="Helvetica-Bold",
                fontSize=9.5,
                leading=13,
                alignment=TA_RIGHT,
                textColor=colors.HexColor("#1f2937"),
            ),
        }

    # ── Helpers ─────────────────────────────────────────────────────────

    def _hr(self) -> HRFlowable:
        return HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#E2E8F0"))

    def _spacer(self, h: float = 4) -> Spacer:
        return Spacer(1, h)

    # ── Build document ──────────────────────────────────────────────────

    def generate(self) -> bytes:
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=20 * mm,
            leftMargin=20 * mm,
            topMargin=18 * mm,
            bottomMargin=18 * mm,
            title=f"Tenancy Agreement {self.content.get('agreement_number', '')}",
            author="Afodabo Housing",
        )

        sty = self._init_styles()
        story: list = []

        # ── Header ─────────────────────────────────────────────────────
        story.append(Paragraph("TENANCY AGREEMENT", sty["title"]))

        anum = self.content.get("agreement_number")
        if anum:
            story.append(Paragraph(f"No. {anum}", sty["subtitle"]))

        version = self.content.get("version", 1)
        story.append(Paragraph(f"Version {version}", sty["subtitle"]))

        generated_at = self.content.get("generated_at")
        if generated_at:
            story.append(Paragraph(
                f"Generated: {_format_datetime(generated_at)}", sty["subtitle"]
            ))

        story.append(self._spacer(6))
        story.append(self._hr())
        story.append(self._spacer(8))

        # ── Section 1: Parties and Property ────────────────────────────
        story.append(Paragraph("1. PARTIES AND PROPERTY", sty["section"]))
        story.append(self._spacer(2))

        tenant = self.content.get("tenant", {})
        manager = self.content.get("manager", {})
        prop = self.content.get("property", {})

        story.append(Paragraph("Tenant", sty["subsection"]))
        story.append(Paragraph(tenant.get("full_name", ""), sty["body"]))
        if tenant.get("email"):
            story.append(Paragraph(f"Email: {tenant['email']}", sty["body"]))
        if tenant.get("phone"):
            story.append(Paragraph(f"Phone: {tenant['phone']}", sty["body"]))

        story.append(self._spacer(4))
        story.append(Paragraph("Landlord / Manager", sty["subsection"]))
        story.append(Paragraph(manager.get("full_name", ""), sty["body"]))
        if manager.get("email"):
            story.append(Paragraph(f"Email: {manager['email']}", sty["body"]))
        if manager.get("phone"):
            story.append(Paragraph(f"Phone: {manager['phone']}", sty["body"]))

        story.append(self._spacer(4))
        story.append(Paragraph("Property", sty["subsection"]))
        story.append(Paragraph(prop.get("title", ""), sty["body"]))
        if prop.get("address"):
            story.append(Paragraph(prop["address"], sty["body"]))
        if prop.get("city"):
            story.append(Paragraph(prop["city"], sty["body"]))
        if prop.get("description"):
            story.append(Paragraph(prop["description"], sty["body"]))

        amenities = prop.get("amenities", [])
        if amenities:
            story.append(Paragraph(f"Amenities: {', '.join(amenities)}", sty["body"]))

        story.append(self._spacer(6))

        # ── Section 2: Tenancy Terms ───────────────────────────────────
        story.append(Paragraph("2. TENANCY TERMS", sty["section"]))
        story.append(self._spacer(2))

        tenancy = self.content.get("tenancy", {})
        term_rows = [
            [Paragraph("Monthly Rent", sty["term_label"]),
             Paragraph(_format_money(tenancy.get("monthly_rent")), sty["term_value"])],
            [Paragraph("Security Deposit", sty["term_label"]),
             Paragraph(_format_money(tenancy.get("security_deposit")), sty["term_value"])],
            [Paragraph("Payment Frequency", sty["term_label"]),
             Paragraph(str(tenancy.get("payment_frequency", "monthly")), sty["term_value"])],
            [Paragraph("Start Date", sty["term_label"]),
             Paragraph(_format_date(tenancy.get("start_date")), sty["term_value"])],
            [Paragraph("End Date", sty["term_label"]),
             Paragraph(_format_date(tenancy.get("end_date")), sty["term_value"])],
        ]

        term_table = Table(term_rows, colWidths=[90 * mm, 80 * mm])
        term_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#F8FAFC")),
            ("LINEBELOW", (0, 0), (-1, -1), 0.5, colors.HexColor("#E2E8F0")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]))
        story.append(term_table)
        story.append(self._spacer(6))

        # ── Section 3: Standard Clauses ────────────────────────────────
        std_clauses = [c for c in self.content.get("standard_clauses", []) if c.get("enabled")]
        if std_clauses:
            story.append(Paragraph("3. STANDARD TERMS AND CONDITIONS", sty["section"]))
            story.append(self._spacer(2))

            for i, clause in enumerate(std_clauses, 1):
                story.append(Paragraph(
                    f"{i}. {clause.get('title', '')}", sty["clause_title"]
                ))
                story.append(Paragraph(clause.get("content", ""), sty["clause_body"]))

            story.append(self._spacer(6))

        # ── Section 4: Custom Clauses ──────────────────────────────────
        custom_clauses = self.content.get("custom_clauses", [])
        if custom_clauses:
            story.append(Paragraph("4. ADDITIONAL TERMS", sty["section"]))
            story.append(self._spacer(2))

            for i, clause in enumerate(custom_clauses, 1):
                title = clause.get("title", f"Additional Clause {i}")
                story.append(Paragraph(f"{i}. {title}", sty["clause_title"]))
                story.append(Paragraph(clause.get("content", ""), sty["clause_body"]))

            story.append(self._spacer(6))

        # ── Section 5: Signatures ──────────────────────────────────────
        story.append(PageBreak())
        story.append(Paragraph("5. SIGNATURES", sty["section"]))
        story.append(self._spacer(2))

        story.append(Paragraph(
            "By signing below, the parties acknowledge that they have read and agree to the terms "
            "of this tenancy agreement.",
            sty["body"],
        ))
        story.append(self._spacer(8))

        sigs = self.content.get("signatures", {})

        # Tenant signature block
        story.append(self._hr())
        story.append(self._spacer(4))
        story.append(Paragraph("TENANT", sty["signature_label"]))
        ts = sigs.get("tenant", {})
        if ts.get("consent_status") == "approved" and ts.get("signed_name"):
            story.append(Paragraph(ts["signed_name"], sty["signature_name"]))
            if ts.get("signed_at"):
                story.append(Paragraph(
                    f"Signed: {_format_datetime(ts['signed_at'])}", sty["signature_meta"]
                ))
            cv = ts.get("consent_version", 0)
            story.append(Paragraph(
                f"Consent v{cv} &nbsp;|&nbsp; Agreement v{version}", sty["signature_meta"]
            ))
        else:
            story.append(Paragraph("__________________________", sty["body"]))
            story.append(Paragraph("Awaiting signature", sty["signature_meta"]))

        story.append(self._spacer(12))

        # Manager signature block
        story.append(self._hr())
        story.append(self._spacer(4))
        story.append(Paragraph("LANDLORD / MANAGER", sty["signature_label"]))
        ms = sigs.get("manager", {})
        if ms.get("consent_status") == "approved" and ms.get("signed_name"):
            story.append(Paragraph(ms["signed_name"], sty["signature_name"]))
            if ms.get("signed_at"):
                story.append(Paragraph(
                    f"Signed: {_format_datetime(ms['signed_at'])}", sty["signature_meta"]
                ))
            cv = ms.get("consent_version", 0)
            story.append(Paragraph(
                f"Consent v{cv} &nbsp;|&nbsp; Agreement v{version}", sty["signature_meta"]
            ))
        else:
            story.append(Paragraph("__________________________", sty["body"]))
            story.append(Paragraph("Awaiting signature", sty["signature_meta"]))

        story.append(self._spacer(20))
        story.append(self._hr())
        story.append(Paragraph(
            "Generated digitally by Afodabo Housing. This document is electronically signed.",
            sty["footer"],
        ))

        doc.build(story)
        return buffer.getvalue()
