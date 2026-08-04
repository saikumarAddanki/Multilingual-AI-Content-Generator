"""
Prompt templates — each adds structural/style hints on top of the base
generate_article() prompt in app/llm.py. Purely additive: picking a
template still respects the user's chosen language, tone, and length.
"""

TEMPLATES = {
    "blog": {
        "label": "Blog post",
        "hint": (
            "Structure as a blog post: a hook opening line, an intro paragraph, "
            "2-4 subheaded sections, and a closing takeaway. Conversational but informative."
        ),
    },
    "linkedin": {
        "label": "LinkedIn post",
        "hint": (
            "Write as a LinkedIn post: short punchy paragraphs (1-3 sentences each), "
            "a strong first line that stops the scroll, no markdown headings, and a "
            "closing line inviting engagement (a question or call-to-action). Keep it "
            "under the requested word count strictly — LinkedIn posts should feel concise."
        ),
    },
    "instagram": {
        "label": "Instagram caption",
        "hint": (
            "Write as an Instagram caption: short, visual, energetic. Include relevant "
            "emoji naturally (not excessive), line breaks for readability, and 5-8 relevant "
            "hashtags at the end on their own line."
        ),
    },
    "email": {
        "label": "Marketing email",
        "hint": (
            "Structure as a marketing email: a compelling subject line on the first line "
            "(prefixed 'Subject:'), a greeting, short scannable paragraphs, one clear call "
            "to action, and a sign-off."
        ),
    },
    "product_description": {
        "label": "Product description",
        "hint": (
            "Write as an e-commerce product description: a benefit-driven headline, "
            "3-5 scannable bullet points on key features/benefits, and a short closing "
            "paragraph that builds desire. Avoid generic filler — be specific."
        ),
    },
    "resume_summary": {
        "label": "Resume summary",
        "hint": (
            "Write as a professional resume summary/profile section: 3-4 sentences, "
            "first person implied (no 'I'), achievement-oriented, no fluff, no clichés "
            "like 'hard-working team player'. Focus on concrete impact."
        ),
    },
    "press_release": {
        "label": "Press release",
        "hint": (
            "Structure as a press release: an attention-grabbing headline, a dateline "
            "opening ('CITY, DATE —'), the core announcement in the first paragraph "
            "(who/what/when/where/why), supporting details, a relevant quote, and a "
            "boilerplate-style closing paragraph."
        ),
    },
}


def list_templates() -> list:
    return [{"id": key, "label": val["label"]} for key, val in TEMPLATES.items()]


def get_template_hint(template_id: str) -> str:
    template = TEMPLATES.get(template_id)
    return template["hint"] if template else ""
