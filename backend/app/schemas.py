from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List


class GenerateRequest(BaseModel):
    topic: str
    language: str = "English"
    tone: str = "informative"
    length_words: int = Field(default=600, ge=100, le=3000)
    use_rag: bool = False
    template: Optional[str] = None  # e.g. "blog", "linkedin" — see app/templates.py


class GenerateResponse(BaseModel):
    article_id: str
    title_guess: str
    content: str
    language: str
    tone: str
    word_count: int


class RewriteRequest(BaseModel):
    text: str
    target_tone: str
    language: str = "English"


class TranslateRequest(BaseModel):
    text: str
    target_language: str


class AdaptRequest(BaseModel):
    text: str
    target_locale: str


class FactCheckRequest(BaseModel):
    text: str
    article_id: Optional[str] = None
    use_rag: bool = True


class SEORequest(BaseModel):
    text: str
    target_keyword: Optional[str] = None


class PlagiarismRequest(BaseModel):
    text: str


class RAGIngestRequest(BaseModel):
    title: str
    content: str
    source: Optional[str] = None


class RAGQueryRequest(BaseModel):
    query: str
    top_k: int = 4


class FeedbackRequest(BaseModel):
    article_id: str
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = None
    edited_text: Optional[str] = None


class ExportPDFRequest(BaseModel):
    title: str
    content: str


class ExportDocxRequest(BaseModel):
    title: str
    content: str


class ExportMarkdownRequest(BaseModel):
    title: str
    content: str


# ------------------------------------------------------------------- auth --

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    email: str
    role: str


# --------------------------------------------------------------- articles --

class UpdateArticleRequest(BaseModel):
    content: str


class RestoreVersionRequest(BaseModel):
    version_id: str


# ------------------------------------------------------------------ image --

class ImageGenerateRequest(BaseModel):
    prompt: str
    size: str = "1024x1024"
