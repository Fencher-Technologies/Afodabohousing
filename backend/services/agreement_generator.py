import logging
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

logger = logging.getLogger(__name__)


def _style(cls: str, **kw):
    return ParagraphStyle(cls, fontName="Helvetica", fontSize=10, leading=16, spaceAfter=6, **kw)


def generate_agreement_pdf(content: dict) -> bytes:
    t = content.get("tenant", {})
    m = content.get("manager", {})
    p = content.get("property", {})
    ten = content.get("tenancy", {})
    clauses = content.get("standard_clauses", [])
    custom = content.get("custom_clauses", [])
    sigs = content.get("signatures", {})
    agreement_number = content.get("agreement_number", "")
    version = content.get("version", 1)

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=A4,
        rightMargin=18 * mm, leftMargin=18 * mm,
        topMargin=18 * mm, bottomMargin=18 * mm,
        title=f"Tenancy Agreement {agreement_number}",
    )
    styles = getSampleStyleSheet()

    title_s = _style("AgreementTitle", parent=styles["Title"], fontSize=20, leading=26, textColor=colors.HexColor("#0F766E"), spaceAfter=4)
    subtitle_s = _style("Subtitle", parent=styles["Normal"], fontSize=8, leading=10, textColor=colors.HexColor("#627D98"), spaceAfter=10)
    h2_s = _style("H2", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=12, leading=16, textColor=colors.HexColor("#334E68"), spaceBefore=14, spaceAfter=4)
    body_s = _style("Body", fontSize=10, leading=16, spaceAfter=6)
    clause_title_s = _style("ClauseTitle", fontName="Helvetica-Bold", fontSize=10, leading=14, spaceBefore=6, spaceAfter=1)
    clause_body_s = _style("ClauseBody", fontSize=10, leading=15, spaceAfter=6, leftIndent=10)

    story = [
        Paragraph("AFODABO HOUSING", _style("Brand", fontSize=9, leading=12, textColor=colors.HexColor("#0F766E"), spaceAfter=2)),
        Paragraph(f"Tenancy Agreement — {agreement_number or 'Draft'}", title_s),
        Paragraph(f"Version {version} · Generated {content.get('generated_at', '')[:10] if content.get('generated_at') else ''}", subtitle_s),
        Spacer(1, 4 * mm),
    ]

    # Details table
    details = [
        ["Tenant", f"{t.get('full_name', '')}"],
        ["Email", t.get("email", "—")],
        ["Phone", t.get("phone", "—")],
        ["Property", f"{p.get('title', '')} - {p.get('address', '')}, {p.get('city', '')}"],
        ["Monthly Rent", f"UGX {ten.get('monthly_rent', '0')}"],
        ["Security Deposit", f"UGX {ten.get('security_deposit', '0')}"],
        ["Start Date", ten.get("start_date", "")],
        ["End Date", ten.get("end_date", "")],
        ["Manager", m.get("full_name", "Property Manager")],
        ["Manager Email", m.get("email", "—")],
        ["Manager Phone", m.get("phone", "—")],
    ]
    tbl = Table(details, colWidths=[38 * mm, 122 * mm], hAlign="LEFT")
    tbl.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#F0F7F6")),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#334E68")),
        ("TEXTCOLOR", (1, 0), (1, -1), colors.HexColor("#102A43")),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D9E2EC")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.extend([Paragraph("Agreement Details", h2_s), tbl, Spacer(1, 6 * mm)])

    # Property description
    if p.get("description"):
        story.append(Paragraph(f"<b>Description:</b> {p['description']}", body_s))

    if p.get("amenities"):
        ams = ", ".join(str(a) for a in p["amenities"])
        story.append(Paragraph(f"<b>Amenities:</b> {ams}", body_s))

    # Standard clauses
    if clauses:
        story.append(Paragraph("Standard Clauses", h2_s))
        for i, clause in enumerate(clauses):
            if clause.get("enabled") is False:
                continue
            title = clause.get("title", f"Clause {i + 1}")
            story.append(Paragraph(f"<b>{i + 1}. {title}</b>", clause_title_s))
            story.append(Paragraph(clause.get("content", ""), clause_body_s))

    # Custom clauses
    if custom:
        story.extend([Spacer(1, 4 * mm), Paragraph("Custom Clauses", h2_s)])
        for i, clause in enumerate(custom):
            title = clause.get("title", f"Custom Clause {i + 1}")
            story.append(Paragraph(f"<b>{i + 1}. {title}</b>", clause_title_s))
            story.append(Paragraph(clause.get("content", ""), clause_body_s))

    story.extend([Spacer(1, 10 * mm), Paragraph("Signatures", h2_s)])

    t_sig = sigs.get("tenant", {})
    m_sig = sigs.get("manager", {})
    sig_table = Table([
        ["Tenant", t_sig.get("signed_name", "______________")],
        ["Signed At", t_sig.get("signed_at", "")[:10] if t_sig.get("signed_at") else "______________"],
        ["", ""],
        ["Manager", m_sig.get("signed_name", "______________")],
        ["Signed At", m_sig.get("signed_at", "")[:10] if m_sig.get("signed_at") else "______________"],
    ], colWidths=[42 * mm, 118 * mm], hAlign="LEFT")
    sig_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#F0F7F6")),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#334E68")),
        ("TEXTCOLOR", (1, 0), (1, -1), colors.HexColor("#102A43")),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D9E2EC")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(sig_table)
    story.append(Spacer(1, 6 * mm))
    story.append(Paragraph("Generated digitally by Axis.", _style("Footer", fontSize=8, leading=10, textColor=colors.HexColor("#BCCCDC"))))
    doc.build(story)
    return buffer.getvalue()
