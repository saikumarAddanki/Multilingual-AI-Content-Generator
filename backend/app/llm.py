"""
Thin wrapper around an OpenAI-compatible chat completion endpoint.
Defaults to Groq (https://console.groq.com) because it's free-tier friendly
and very fast, but ANY OpenAI-compatible provider works (OpenAI, Together,
local Ollama/vLLM) by changing base_url / model.

The API key can come from two places, checked in this order:
  1. Per-request header `X-Api-Key` (set from the frontend Settings page,
     stored in the user's browser only — never written to disk here).
  2. The GROQ_API_KEY value in backend/.env, used as a server-wide
     fallback (handy for local dev / your own deployments).
"""
from typing import Optional
from openai import AsyncOpenAI
from app.config import get_settings

settings = get_settings()


def _client_for(api_key: Optional[str]) -> AsyncOpenAI:
    key = api_key or settings.llm_api_key
    if not key:
        raise RuntimeError(
            "No LLM API key configured. Paste a Groq API key in the app's "
            "Settings page, or set GROQ_API_KEY in backend/.env."
        )
    return AsyncOpenAI(api_key=key, base_url=settings.llm_base_url)


async def chat(system: str, user: str, api_key: Optional[str] = None,
                temperature: float = 0.7, max_tokens: int = 1800) -> str:
    client = _client_for(api_key)
    resp = await client.chat.completions.create(
        model=settings.chat_model,
        temperature=temperature,
        max_tokens=max_tokens,
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    )
    return resp.choices[0].message.content.strip()


# ---- Task-specific prompt builders -----------------------------------------

async def generate_article(topic: str, language: str, tone: str, length_words: int,
                            context: str = "", api_key: Optional[str] = None,
                            template_hint: str = "") -> str:
    system = (
        f"You are an expert multilingual content writer. Write natively in {language} "
        f"(not a translation from English) — use idioms, register, and structure that read "
        f"as if written by a native {language} journalist. Adopt a {tone} tone throughout."
    )
    if template_hint:
        system += f"\n\nFormat requirement: {template_hint}"
    else:
        system += (
            "\n\nFormat requirement: Well-structured long-form writing with a compelling "
            "headline, an introduction, 3-5 clearly-titled sections, and a conclusion."
        )
    grounding = f"\n\nUse this background research if relevant, and cite facts naturally:\n{context}" if context else ""
    user = (
        f"Write content of about {length_words} words on: \"{topic}\"."
        f"{grounding}"
    )
    return await chat(system, user, api_key=api_key, max_tokens=min(4000, length_words * 3))


async def rewrite_tone(text: str, target_tone: str, language: str, api_key: Optional[str] = None) -> str:
    system = f"You are an editor rewriting text in {language}. Preserve meaning and facts exactly."
    user = f'Rewrite the following text in a "{target_tone}" tone. Keep the same language ({language}) and length.\n\n{text}'
    return await chat(system, user, api_key=api_key, temperature=0.6)


async def translate_text(text: str, target_language: str, api_key: Optional[str] = None) -> str:
    system = (
        f"You are a professional translator. Translate into {target_language} with natural, "
        f"fluent phrasing — never a literal word-for-word translation."
    )
    user = f"Translate this text into {target_language}:\n\n{text}"
    return await chat(system, user, api_key=api_key, temperature=0.3)


async def culturally_adapt(text: str, target_locale: str, api_key: Optional[str] = None) -> str:
    system = (
        "You are a localization expert. Adapt references, idioms, units, examples, and cultural "
        f"context so the text feels native to {target_locale}, without changing the core message."
    )
    user = f"Culturally adapt this text for {target_locale}:\n\n{text}"
    return await chat(system, user, api_key=api_key, temperature=0.6)


async def fact_check(text: str, evidence: str, api_key: Optional[str] = None) -> str:
    system = (
        "You are a meticulous fact-checker. Compare the claims in the article to the evidence "
        "provided. Flag unsupported or contradicted claims. Return a short bullet list: "
        "each claim, a verdict (Supported / Unsupported / Contradicted / Not checkable), and why."
    )
    ev = evidence or "(no external evidence supplied — flag claims that would need a source)"
    user = f"ARTICLE:\n{text}\n\nEVIDENCE:\n{ev}"
    return await chat(system, user, api_key=api_key, temperature=0.2)
