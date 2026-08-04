"""
JWT-based authentication (email + password). No OAuth/Google Sign-In yet —
that's a reasonable follow-up (swap in `authlib` and a Google client ID),
but JWT covers the "save my content and log back in" use case on its own.

Two dependencies are exported for routes:
  get_current_user_optional — returns the user dict if a valid token is
    present, else None. Use this for routes that work for both logged-in
    and anonymous users (e.g. generate — anonymous users just don't get
    their articles saved to a personal history).
  require_user — raises 401 if there's no valid token. Use for routes
    that only make sense for a logged-in user (content history, etc.)
  require_admin — raises 403 if the user isn't an admin.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from fastapi import Header, HTTPException
from jose import jwt, JWTError

from app.config import get_settings
from app import db

settings = get_settings()


def hash_password(password: str) -> str:
    # bcrypt has a hard 72-byte input limit — truncate defensively rather
    # than error on unusually long passwords.
    return bcrypt.hashpw(password.encode("utf-8")[:72], bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8")[:72], password_hash.encode("utf-8"))


def create_access_token(user_id: str, email: str, role: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.jwt_expire_minutes)
    payload = {"sub": user_id, "email": email, "role": role, "exp": expire}
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def _decode(token: str) -> dict:
    try:
        return jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token. Please log in again.")


def _extract_token(authorization: Optional[str]) -> Optional[str]:
    if not authorization or not authorization.startswith("Bearer "):
        return None
    return authorization.removeprefix("Bearer ").strip()


async def get_current_user_optional(authorization: Optional[str] = Header(default=None)) -> Optional[dict]:
    token = _extract_token(authorization)
    if not token:
        return None
    payload = _decode(token)
    user = await db.get_user_by_id(payload["sub"])
    return user


async def require_user(authorization: Optional[str] = Header(default=None)) -> dict:
    user = await get_current_user_optional(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Login required for this action.")
    return user


async def require_admin(authorization: Optional[str] = Header(default=None)) -> dict:
    user = await require_user(authorization)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required.")
    return user
