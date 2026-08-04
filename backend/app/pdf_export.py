"""
Exports generated articles to PDF. Uses reportlab with a bundled
Unicode-friendly font (DejaVu Sans, ships with reportlab) so non-Latin
scripts render instead of showing tofu boxes.
"""
import io
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.enums import TA_LEFT

try:
    import reportlab
    import os
    _font_path = os.path.join(os.path.dirname(reportlab.__file__), "fonts", "DejaVuSans.ttf")
    if os.path.exists(_font_path):
        pdfmetrics.registerFont(TTFont("DejaVuSans", _font_path))
        _BASE_FONT = "DejaVuSans"
    else:
        _BASE_FONT = "Helvetica"
except Exception:
    _BASE_FONT = "Helvetica"


def build_pdf(title: str, content: str) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4, topMargin=2 * cm, bottomMargin=2 * cm,
                             leftMargin=2 * cm, rightMargin=2 * cm)
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("TitleUnicode", parent=styles["Title"], fontName=_BASE_FONT, fontSize=20)
    body_style = ParagraphStyle("BodyUnicode", parent=styles["Normal"], fontName=_BASE_FONT,
                                 fontSize=11, leading=16, alignment=TA_LEFT, spaceAfter=10)

    story = [Paragraph(_escape(title), title_style), Spacer(1, 16)]
    for para in content.split("\n"):
        if para.strip():
            story.append(Paragraph(_escape(para), body_style))
        else:
            story.append(Spacer(1, 8))

    doc.build(story)
    return buf.getvalue()


def _escape(text: str) -> str:
    return text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
