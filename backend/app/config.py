"""
Central configuration, loaded from environment variables / .env file.
Copy backend/.env.example to backend/.env and fill in your own values.
"""
import os
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # --- LLM provider: Groq by default (OpenAI-compatible, fast, free tier) ---
    # Users normally paste their own key in the app's Settings page instead
    # of setting this — this is only a server-side fallback.
    llm_api_key: str = os.getenv("GROQ_API_KEY", "")
    llm_base_url: str = os.getenv("LLM_BASE_URL", "https://api.groq.com/openai/v1")
    chat_model: str = os.getenv("CHAT_MODEL", "llama-3.3-70b-versatile")

    # --- Optional image generation (separate from Groq — Groq is text-only) ---
    # Any OpenAI-compatible image endpoint works (OpenAI's DALL-E, etc.).
    # Feature is simply hidden/disabled if this is left blank.
    image_api_key: str = os.getenv("IMAGE_API_KEY", "")
    image_base_url: str = os.getenv("IMAGE_BASE_URL", "https://api.openai.com/v1")
    image_model: str = os.getenv("IMAGE_MODEL", "dall-e-3")

    # --- Database ---
    mongo_uri: str = os.getenv("MONGO_URI", "")
    mongo_db_name: str = os.getenv("MONGO_DB_NAME", "content_generator")

    # --- Vector store / RAG (TF-IDF based — see app/rag.py) ---
    vector_store_path: str = os.getenv("VECTOR_STORE_PATH", "./data/vector_store")

    # --- Auth ---
    jwt_secret: str = os.getenv("JWT_SECRET", "dev-only-insecure-secret-change-me")
    jwt_algorithm: str = "HS256"
    jwt_expire_minutes: int = int(os.getenv("JWT_EXPIRE_MINUTES", "10080"))  # 7 days
    # First account registered with this email is auto-promoted to admin.
    # Leave blank to disable auto-admin (promote manually in the DB instead).
    admin_email: str = os.getenv("ADMIN_EMAIL", "")

    # --- Caching (optional — falls back to in-memory if REDIS_URL unset) ---
    redis_url: str = os.getenv("REDIS_URL", "")
    cache_ttl_seconds: int = int(os.getenv("CACHE_TTL_SECONDS", "900"))

    # --- Rate limiting ---
    rate_limit_generate: str = os.getenv("RATE_LIMIT_GENERATE", "20/minute")
    rate_limit_default: str = os.getenv("RATE_LIMIT_DEFAULT", "60/minute")

    # --- App ---
    cors_origins_raw: str = os.getenv("CORS_ORIGINS", "http://localhost:5173")

    @property
    def cors_origins(self) -> list[str]:
        return [o.strip() for o in self.cors_origins_raw.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
