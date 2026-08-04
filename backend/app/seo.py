"""
Lightweight, dependency-cheap SEO scoring: readability (textstat),
keyword density, heading structure, and length checks.
No external API calls — fully local and free.
"""
import re
from typing import Optional
import textstat


def score_seo(text: str, target_keyword: Optional[str] = None) -> dict:
    words = re.findall(r"\w+", text.lower())
    word_count = len(words)
    headings = len(re.findall(r"^#{1,3}\s", text, flags=re.MULTILINE))

    keyword_density = None
    keyword_count = 0
    if target_keyword:
        kw = target_keyword.lower().strip()
        keyword_count = text.lower().count(kw)
        keyword_density = round((keyword_count / max(word_count, 1)) * 100, 2)

    try:
        reading_ease = textstat.flesch_reading_ease(text)
    except Exception:
        reading_ease = None

    checks = []
    checks.append({
        "check": "Length",
        "pass": word_count >= 300,
        "detail": f"{word_count} words (aim for 300+)",
    })
    checks.append({
        "check": "Headings present",
        "pass": headings >= 2,
        "detail": f"{headings} heading(s) found (aim for 2+ section headings)",
    })
    if target_keyword:
        checks.append({
            "check": "Keyword usage",
            "pass": 0.5 <= (keyword_density or 0) <= 2.5,
            "detail": f'"{target_keyword}" appears {keyword_count}x ({keyword_density}% density, ideal 0.5–2.5%)',
        })
    if reading_ease is not None:
        checks.append({
            "check": "Readability",
            "pass": reading_ease >= 40,
            "detail": f"Flesch reading ease {reading_ease:.1f} (60+ is easy, 30-50 is fairly difficult)",
        })

    passed = sum(1 for c in checks if c["pass"])
    overall_score = round((passed / len(checks)) * 100) if checks else 0

    return {
        "overall_score": overall_score,
        "word_count": word_count,
        "heading_count": headings,
        "keyword_density": keyword_density,
        "reading_ease": reading_ease,
        "checks": checks,
    }
