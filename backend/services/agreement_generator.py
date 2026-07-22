import logging
from datetime import date
from io import BytesIO
from typing import Any

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib import colors
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

logger = logging.getLogger(__name__)


def generate_agreement_pdf(
    tenant_name: str,
    property_title: str,
    property_address: str,
    monthly_rent: float,
    security_deposit: float,
    start_date: date,
    end_date: date,
    manager_name: str | None = None,
    tenant_signature: str | None = None,
    manager_signature: str | None = None,
) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        title="Tenancy Agreement",
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("AgreementTitle", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=22, leading=28, textColor=colors.HexColor("#0F766E"), spaceAfter=12)
    heading_style = ParagraphStyle("Heading", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=13, leading=18, textColor=colors.HexColor("#334E68"), spaceAfter=6, spaceBefore=14)
    body_style = ParagraphStyle("Body", parent=styles["Normal"], fontSize=10, leading=16, spaceAfter=6)
    signature_style = ParagraphStyle("Signature", parent=styles["Normal"], fontSize=10, leading=16, spaceBefore=20)
    story = [
        Paragraph("AFODABO HOUSING", ParagraphStyle("Brand", parent=styles["Normal"], fontSize=10, leading=14, textColor=colors.HexColor("#0F766E"))),
        Paragraph("Tenancy Agreement", title_style),
        Spacer(1, 6 * mm),
        Paragraph("Agreement Details", heading_style),
    ]
    rent_str = f"UGX {monthly_rent:,.0f}"
    deposit_str = f"UGX {security_deposit:,.0f}"
    details = [
        ["Tenant", tenant_name],
        ["Property", f"{property_title} - {property_address}"],
        ["Monthly Rent", rent_str],
        ["Security Deposit", deposit_str],
        ["Start Date", start_date.isoformat()],
        ["End Date", end_date.isoformat()],
        ["Manager", manager_name or "Property Manager"],
    ]
    table = Table(details, colWidths=[42 * mm, 118 * mm], hAlign="LEFT")
    table.setStyle(TableStyle([
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
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.extend([table, Spacer(1, 8 * mm)])
    terms_text = """
    This Tenancy Agreement is made between the Landlord (Afodabo Housing) and the Tenant named above.<br/><br/>
    1. <b>Term:</b> The tenancy shall commence on the start date and continue until the end date unless terminated earlier as per the terms herein.<br/><br/>
    2. <b>Rent:</b> The tenant agrees to pay monthly rent as specified above, payable in advance on or before the 5th day of each month.<br/><br/>
    3. <b>Deposit:</b> The security deposit shall be held by the Landlord as security against any breach of the terms of this Agreement.<br/><br/>
    4. <b>Use:</b> The premises shall be used solely as a private residence.<br/><br/>
    5. <b>Maintenance:</b> The tenant shall keep the premises in good condition and report any major repairs to the Landlord promptly.<br/><br/>
    6. <b>Termination:</b> Either party may terminate this agreement by giving 30 days written notice.
    """
    story.append(Paragraph("Terms & Conditions", heading_style))
    story.append(Paragraph(terms_text, body_style))
    story.append(Spacer(1, 10 * mm))
    story.append(Paragraph("Signatures", heading_style))
    sig_data = []
    sig_data.append(["Tenant Signature", tenant_signature or tenant_name])
    sig_data.append(["Manager Signature", manager_signature or manager_name or "Property Manager"])
    sig_table = Table(sig_data, colWidths=[42 * mm, 118 * mm], hAlign="LEFT")
    sig_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#F0F7F6")),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.HexColor("#334E68")),
        ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
        ("FONTNAME", (1, 0), (1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#D9E2EC")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(sig_table)
    story.append(Spacer(1, 6 * mm))
    story.append(Paragraph("Generated digitally by Afodabo Housing.", body_style))
    doc.build(story)
    return buffer.getvalue()
