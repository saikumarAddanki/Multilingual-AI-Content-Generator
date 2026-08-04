"""
Persistence layer. Uses MongoDB (via motor) when MONGO_URI is set;
otherwise falls back to a process-local in-memory store so the app still
runs with zero setup for local development / demos.

Collections:
  users     — auth accounts (email, hashed password, role)
  articles  — generated content, prompt version, owner, word/token stats
  versions  — snapshot of an article before each edit (version history)
  feedback  — user ratings/edits, doubling as an RLHF preference dataset
"""
import uuid
from datetime import datetime, timezone
from typing import Optional

from app.config import get_settings

settings = get_settings()

_mongo_client = None
_db = None
_memory_users: dict = {}
_memory_articles: dict = {}
_memory_versions: dict = {}  # article_id -> list of snapshots
_memory_feedback: list = []


def _get_db():
    global _mongo_client, _db
    if not settings.mongo_uri:
        return None
    if _db is None:
        from motor.motor_asyncio import AsyncIOMotorClient
        _mongo_client = AsyncIOMotorClient(settings.mongo_uri)
        _db = _mongo_client[settings.mongo_db_name]
    return _db


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


# ------------------------------------------------------------------ users --

async def create_user(email: str, password_hash: str) -> dict:
    user_id = str(uuid.uuid4())
    is_first_admin = bool(settings.admin_email) and email.lower() == settings.admin_email.lower()
    doc = {
        "_id": user_id,
        "email": email.lower(),
        "password_hash": password_hash,
        "role": "admin" if is_first_admin else "user",
        "created_at": _now(),
    }
    db = _get_db()
    if db is not None:
        await db.users.insert_one(doc)
    else:
        _memory_users[user_id] = doc
    return doc


async def get_user_by_email(email: str) -> Optional[dict]:
    db = _get_db()
    email = email.lower()
    if db is not None:
        return await db.users.find_one({"email": email})
    for u in _memory_users.values():
        if u["email"] == email:
            return u
    return None


async def get_user_by_id(user_id: str) -> Optional[dict]:
    db = _get_db()
    if db is not None:
        return await db.users.find_one({"_id": user_id})
    return _memory_users.get(user_id)


async def list_users(limit: int = 200) -> list:
    db = _get_db()
    if db is not None:
        cursor = db.users.find({}).sort("created_at", -1).limit(limit)
        return [doc async for doc in cursor]
    items = sorted(_memory_users.values(), key=lambda d: d["created_at"], reverse=True)
    return items[:limit]


# --------------------------------------------------------------- articles --

async def save_article(topic: str, language: str, tone: str, content: str,
                        prompt_version: str = "v1", user_id: Optional[str] = None,
                        template: Optional[str] = None) -> str:
    article_id = str(uuid.uuid4())
    word_count = len(content.split())
    doc = {
        "_id": article_id,
        "user_id": user_id,
        "topic": topic,
        "language": language,
        "tone": tone,
        "template": template,
        "content": content,
        "prompt_version": prompt_version,
        "word_count": word_count,
        "reading_time_minutes": round(word_count / 200, 1),
        "approx_tokens": round(word_count * 1.3),
        "created_at": _now(),
        "updated_at": _now(),
    }
    db = _get_db()
    if db is not None:
        await db.articles.insert_one(doc)
    else:
        _memory_articles[article_id] = doc
    return article_id


async def get_article(article_id: str) -> Optional[dict]:
    db = _get_db()
    if db is not None:
        return await db.articles.find_one({"_id": article_id})
    return _memory_articles.get(article_id)


async def list_articles(limit: int = 20, user_id: Optional[str] = None) -> list:
    db = _get_db()
    query = {"user_id": user_id} if user_id else {}
    if db is not None:
        cursor = db.articles.find(query).sort("created_at", -1).limit(limit)
        return [doc async for doc in cursor]
    items = [a for a in _memory_articles.values() if not user_id or a.get("user_id") == user_id]
    items = sorted(items, key=lambda d: d["created_at"], reverse=True)
    return items[:limit]


async def update_article(article_id: str, new_content: str) -> Optional[dict]:
    """Edits an article's content, snapshotting the previous version first
    so it can be restored later (version history)."""
    existing = await get_article(article_id)
    if not existing:
        return None
    await _save_version(existing)
    word_count = len(new_content.split())
    updates = {
        "content": new_content,
        "word_count": word_count,
        "reading_time_minutes": round(word_count / 200, 1),
        "approx_tokens": round(word_count * 1.3),
        "updated_at": _now(),
    }
    db = _get_db()
    if db is not None:
        await db.articles.update_one({"_id": article_id}, {"$set": updates})
        return await db.articles.find_one({"_id": article_id})
    _memory_articles[article_id].update(updates)
    return _memory_articles[article_id]


async def delete_article(article_id: str) -> bool:
    db = _get_db()
    if db is not None:
        result = await db.articles.delete_one({"_id": article_id})
        await db.versions.delete_many({"article_id": article_id})
        return result.deleted_count > 0
    existed = article_id in _memory_articles
    _memory_articles.pop(article_id, None)
    _memory_versions.pop(article_id, None)
    return existed


# --------------------------------------------------------------- versions --

async def _save_version(article_doc: dict) -> None:
    version_id = str(uuid.uuid4())
    snapshot = {
        "_id": version_id,
        "article_id": article_doc["_id"],
        "content": article_doc["content"],
        "saved_at": _now(),
    }
    db = _get_db()
    if db is not None:
        await db.versions.insert_one(snapshot)
    else:
        _memory_versions.setdefault(article_doc["_id"], []).append(snapshot)


async def list_versions(article_id: str) -> list:
    db = _get_db()
    if db is not None:
        cursor = db.versions.find({"article_id": article_id}).sort("saved_at", -1)
        return [doc async for doc in cursor]
    return sorted(_memory_versions.get(article_id, []), key=lambda d: d["saved_at"], reverse=True)


async def restore_version(article_id: str, version_id: str) -> Optional[dict]:
    versions = await list_versions(article_id)
    match = next((v for v in versions if v["_id"] == version_id), None)
    if not match:
        return None
    return await update_article(article_id, match["content"])


# --------------------------------------------------------------- analytics --

async def usage_summary(user_id: Optional[str] = None) -> dict:
    articles = await list_articles(limit=10000, user_id=user_id)
    total_articles = len(articles)
    total_words = sum(a.get("word_count", 0) for a in articles)
    total_tokens = sum(a.get("approx_tokens", 0) for a in articles)
    by_language: dict = {}
    for a in articles:
        by_language[a["language"]] = by_language.get(a["language"], 0) + 1
    return {
        "total_articles": total_articles,
        "total_words": total_words,
        "total_reading_minutes": round(total_words / 200, 1),
        "approx_total_tokens": total_tokens,
        "articles_by_language": by_language,
    }


# ----------------------------------------------------------------- status --

async def backend_status() -> dict:
    """Reports whether MongoDB is actually reachable, for a health check."""
    if not settings.mongo_uri:
        return {"backend": "in-memory", "connected": True, "detail": "MONGO_URI not set — using process memory."}
    db = _get_db()
    try:
        await db.command("ping")
        return {"backend": "mongodb", "connected": True, "detail": f"Connected to {settings.mongo_db_name}."}
    except Exception as e:
        return {"backend": "mongodb", "connected": False, "detail": str(e)}


# ---------------------------------------------------------------- feedback --

async def save_feedback(article_id: str, rating: int, comment: Optional[str],
                         edited_text: Optional[str]) -> str:
    feedback_id = str(uuid.uuid4())
    doc = {
        "_id": feedback_id,
        "article_id": article_id,
        "rating": rating,
        "comment": comment,
        "edited_text": edited_text,
        "created_at": _now(),
    }
    db = _get_db()
    if db is not None:
        await db.feedback.insert_one(doc)
    else:
        _memory_feedback.append(doc)
    return feedback_id


async def export_rlhf_dataset() -> list:
    """Pairs (original generation, human-edited version + rating) — the
    seed format for an RLHF / DPO preference dataset."""
    db = _get_db()
    rows = []
    if db is not None:
        async for fb in db.feedback.find({}):
            article = await db.articles.find_one({"_id": fb["article_id"]})
            if article:
                rows.append(_to_rlhf_row(article, fb))
    else:
        for fb in _memory_feedback:
            article = _memory_articles.get(fb["article_id"])
            if article:
                rows.append(_to_rlhf_row(article, fb))
    return rows


def _to_rlhf_row(article: dict, fb: dict) -> dict:
    return {
        "prompt": f"Write a {article['tone']} article in {article['language']} about {article['topic']}",
        "chosen": fb.get("edited_text") or article["content"],
        "rejected": article["content"] if fb.get("edited_text") else None,
        "rating": fb["rating"],
    }
