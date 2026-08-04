"""
Optional image generation. Groq is text-only, so this uses a *separate*
OpenAI-compatible image endpoint (OpenAI's DALL-E by default). The feature
is simply unavailable until IMAGE_API_KEY is configured — the frontend
hides/disables it based on GET /api/image/status.
"""
from typing import Optional
from openai import AsyncOpenAI
from app.config import get_settings

settings = get_settings()


def is_configured() -> bool:
    return bool(settings.image_api_key)


async def generate_image(prompt: str, size: str = "1024x1024") -> str:
    """Returns a URL to the generated image."""
    if not is_configured():
        raise RuntimeError(
            "Image generation isn't configured on this server. Set IMAGE_API_KEY "
            "(and optionally IMAGE_BASE_URL / IMAGE_MODEL) in the backend environment."
        )
    client = AsyncOpenAI(api_key=settings.image_api_key, base_url=settings.image_base_url)
    result = await client.images.generate(model=settings.image_model, prompt=prompt, size=size, n=1)
    return result.data[0].url
