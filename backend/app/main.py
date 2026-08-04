"""
Multilingual AI Content Generator — FastAPI backend.

Run locally:
    uvicorn app.main:app --reload --port 8000

Auth: JWT (email + password). Send `Authorization: Bearer <token>` on
requests that should be tied to a logged-in user. Generate/rewrite/etc.
still work anonymously (no history saved); content history, versions,
and admin routes require login.

Groq key: all LLM routes also accept an optional `X-Api-Key` header —
the frontend Settings page collects a Groq key from the user and sends
it on every request. Falls back to GROQ_API_KEY server env if absent.
"""
from fastapi import FastAPI, Header, HTTPException, Request, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from typing import Optional

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from app.config import get_settings
from app import schemas, llm, db, rag, seo, plagiarism, pdf_export, export_docx, auth, templates, cache, image_gen

settings = get_settings()
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="Multilingual AI Content Generator", version="2.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _key(x_api_key: Optional[str]) -> Optional[str]:
    return x_api_key or None


async def _require_owner(article_id: str, user: dict) -> dict:
    article = await db.get_article(article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found.")
    if article.get("user_id") != user["_id"]:
        raise HTTPException(status_code=403, detail="You don't own this article.")
    return article


@app.get("/health")
async def health():
    db_status = await db.backend_status()
    return {
        "status": "ok",
        "database": db_status,
        "cache_backend": cache.backend_name(),
        "image_generation_configured": image_gen.is_configured(),
    }


# ---------------------------------------------------------------------- auth --
@app.post("/api/auth/register", response_model=schemas.TokenResponse)
async def register(req: schemas.RegisterRequest):
    existing = await db.get_user_by_email(req.email)
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists.")
    user = await db.create_user(req.email, auth.hash_password(req.password))
    token = auth.create_access_token(user["_id"], user["email"], user["role"])
    return schemas.TokenResponse(access_token=token, email=user["email"], role=user["role"])


@app.post("/api/auth/login", response_model=schemas.TokenResponse)
async def login(req: schemas.LoginRequest):
    user = await db.get_user_by_email(req.email)
    if not user or not auth.verify_password(req.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Incorrect email or password.")
    token = auth.create_access_token(user["_id"], user["email"], user["role"])
    return schemas.TokenResponse(access_token=token, email=user["email"], role=user["role"])


@app.get("/api/auth/me")
async def me(user: dict = Depends(auth.require_user)):
    return {"email": user["email"], "role": user["role"], "created_at": user["created_at"]}


# ------------------------------------------------------------------ templates --
@app.get("/api/templates")
async def get_templates():
    return {"templates": templates.list_templates()}


# ---------------------------------------------------------------------- generate --
@app.post("/api/generate", response_model=schemas.GenerateResponse)
@limiter.limit(settings.rate_limit_generate)
async def generate(request: Request, req: schemas.GenerateRequest,
                    x_api_key: Optional[str] = Header(default=None),
                    user: Optional[dict] = Depends(auth.get_current_user_optional)):
    context = ""
    if req.use_rag:
        hits = rag.get_store().query(req.topic, top_k=4)
        context = "\n---\n".join(h["chunk"] for h in hits)

    template_hint = templates.get_template_hint(req.template) if req.template else ""

    cache_key = None
    content = None
    if not req.use_rag:
        cache_key = cache.make_key("generate", req.topic, req.language, req.tone,
                                    str(req.length_words), req.template or "")
        content = await cache.get(cache_key)

    if content is None:
        try:
            content = await llm.generate_article(
                req.topic, req.language, req.tone, req.length_words,
                context=context, api_key=_key(x_api_key), template_hint=template_hint,
            )
        except RuntimeError as e:
            raise HTTPException(status_code=400, detail=str(e))
        if cache_key:
            await cache.set(cache_key, content)

    article_id = await db.save_article(
        req.topic, req.language, req.tone, content,
        user_id=user["_id"] if user else None, template=req.template,
    )
    title_guess = content.strip().split("\n")[0].lstrip("#").strip()[:120]
    return schemas.GenerateResponse(
        article_id=article_id,
        title_guess=title_guess,
        content=content,
        language=req.language,
        tone=req.tone,
        word_count=len(content.split()),
    )


@app.get("/api/articles")
async def list_recent_articles(limit: int = 20):
    """Recent generations across the server (legacy/demo view). For a
    logged-in user's own history, use GET /api/history instead."""
    articles = await db.list_articles(limit)
    return {"articles": articles}


@app.post("/api/rewrite")
@limiter.limit(settings.rate_limit_default)
async def rewrite(request: Request, req: schemas.RewriteRequest,
                   x_api_key: Optional[str] = Header(default=None)):
    try:
        result = await llm.rewrite_tone(req.text, req.target_tone, req.language, api_key=_key(x_api_key))
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"content": result}


@app.post("/api/translate")
@limiter.limit(settings.rate_limit_default)
async def translate(request: Request, req: schemas.TranslateRequest,
                     x_api_key: Optional[str] = Header(default=None)):
    try:
        result = await llm.translate_text(req.text, req.target_language, api_key=_key(x_api_key))
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"content": result}


@app.post("/api/adapt")
@limiter.limit(settings.rate_limit_default)
async def adapt(request: Request, req: schemas.AdaptRequest,
                 x_api_key: Optional[str] = Header(default=None)):
    try:
        result = await llm.culturally_adapt(req.text, req.target_locale, api_key=_key(x_api_key))
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"content": result}


@app.post("/api/fact-check")
@limiter.limit(settings.rate_limit_default)
async def fact_check_route(request: Request, req: schemas.FactCheckRequest,
                            x_api_key: Optional[str] = Header(default=None)):
    evidence = ""
    if req.use_rag:
        hits = rag.get_store().query(req.text, top_k=5)
        evidence = "\n---\n".join(f"[{h.get('title')}] {h['chunk']}" for h in hits)
    try:
        result = await llm.fact_check(req.text, evidence, api_key=_key(x_api_key))
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"report": result, "evidence_used": bool(evidence)}


# --------------------------------------------------------------------- seo --
@app.post("/api/seo")
async def seo_route(req: schemas.SEORequest):
    return seo.score_seo(req.text, req.target_keyword)


# ------------------------------------------------------------- plagiarism --
@app.post("/api/plagiarism")
async def plagiarism_route(req: schemas.PlagiarismRequest):
    return plagiarism.score_plagiarism(req.text)


# --------------------------------------------------------------------- rag --
@app.post("/api/rag/ingest")
async def rag_ingest(req: schemas.RAGIngestRequest):
    doc_id = rag.get_store().ingest(req.title, req.content, req.source or "")
    return {"doc_id": doc_id, "corpus_size_chunks": rag.get_store().ntotal}


@app.post("/api/rag/query")
async def rag_query(req: schemas.RAGQueryRequest):
    return {"results": rag.get_store().query(req.query, req.top_k)}


# ----------------------------------------------------------- content history --
@app.get("/api/history")
async def history(limit: int = 50, user: dict = Depends(auth.require_user)):
    articles = await db.list_articles(limit=limit, user_id=user["_id"])
    return {"articles": articles}


@app.put("/api/articles/{article_id}")
async def edit_article(article_id: str, req: schemas.UpdateArticleRequest,
                        user: dict = Depends(auth.require_user)):
    await _require_owner(article_id, user)
    updated = await db.update_article(article_id, req.content)
    return {"article": updated}


@app.delete("/api/articles/{article_id}")
async def remove_article(article_id: str, user: dict = Depends(auth.require_user)):
    await _require_owner(article_id, user)
    deleted = await db.delete_article(article_id)
    return {"deleted": deleted}


@app.get("/api/articles/{article_id}/versions")
async def get_versions(article_id: str, user: dict = Depends(auth.require_user)):
    await _require_owner(article_id, user)
    versions = await db.list_versions(article_id)
    return {"versions": versions}


@app.post("/api/articles/{article_id}/restore")
async def restore(article_id: str, req: schemas.RestoreVersionRequest,
                   user: dict = Depends(auth.require_user)):
    await _require_owner(article_id, user)
    restored = await db.restore_version(article_id, req.version_id)
    if not restored:
        raise HTTPException(status_code=404, detail="Version not found.")
    return {"article": restored}


# --------------------------------------------------------------------- share --
@app.get("/api/share/{article_id}")
async def share_article(article_id: str):
    """Public, read-only view of an article by ID — no login required.
    This is the lightweight version of 'team collaboration': anyone with
    the link can view (not edit). Real-time co-editing is a larger,
    separate build (websockets + a CRDT/OT layer)."""
    article = await db.get_article(article_id)
    if not article:
        raise HTTPException(status_code=404, detail="Article not found.")
    return {
        "topic": article["topic"],
        "language": article["language"],
        "tone": article["tone"],
        "content": article["content"],
        "created_at": article["created_at"],
    }


# ----------------------------------------------------------------- analytics --
@app.get("/api/analytics")
async def analytics(user: dict = Depends(auth.require_user)):
    return await db.usage_summary(user_id=user["_id"])


# ---------------------------------------------------------------------- admin --
@app.get("/api/admin/users")
async def admin_users(_: dict = Depends(auth.require_admin)):
    users = await db.list_users()
    return {"users": [{"email": u["email"], "role": u["role"], "created_at": u["created_at"]} for u in users]}


@app.get("/api/admin/stats")
async def admin_stats(_: dict = Depends(auth.require_admin)):
    return await db.usage_summary(user_id=None)


# ------------------------------------------------------------------- feedback --
@app.post("/api/feedback")
async def feedback_route(req: schemas.FeedbackRequest):
    fb_id = await db.save_feedback(req.article_id, req.rating, req.comment, req.edited_text)
    return {"feedback_id": fb_id}


@app.get("/api/rlhf-dataset")
async def rlhf_dataset():
    return {"rows": await db.export_rlhf_dataset()}


# --------------------------------------------------------------------- image --
@app.get("/api/image/status")
async def image_status():
    return {"configured": image_gen.is_configured()}


@app.post("/api/image/generate")
async def image_generate(req: schemas.ImageGenerateRequest):
    try:
        url = await image_gen.generate_image(req.prompt, req.size)
    except RuntimeError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"url": url}


# --------------------------------------------------------------------- export --
@app.post("/api/export/pdf")
async def export_pdf(req: schemas.ExportPDFRequest):
    pdf_bytes = pdf_export.build_pdf(req.title, req.content)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{req.title[:60] or "article"}.pdf"'},
    )


@app.post("/api/export/docx")
async def export_docx_route(req: schemas.ExportDocxRequest):
    docx_bytes = export_docx.build_docx(req.title, req.content)
    return Response(
        content=docx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f'attachment; filename="{req.title[:60] or "article"}.docx"'},
    )


@app.post("/api/export/markdown")
async def export_markdown_route(req: schemas.ExportMarkdownRequest):
    md = f"# {req.title}\n\n{req.content}"
    return Response(
        content=md,
        media_type="text/markdown",
        headers={"Content-Disposition": f'attachment; filename="{req.title[:60] or "article"}.md"'},
    )
