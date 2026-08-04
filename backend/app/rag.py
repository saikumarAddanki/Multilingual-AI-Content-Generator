"""
Lightweight RAG layer using TF-IDF + cosine similarity (scikit-learn),
instead of neural embeddings.

Why TF-IDF instead of sentence-transformers/FAISS: the transformer +
torch + faiss stack needs well over 512MB RAM just to load, which
crashes free-tier hosts (Render's free Web Service caps at 512MB).
TF-IDF is a fraction of the memory footprint and has zero heavy
dependencies, at the cost of matching on shared words/phrases rather
than deeper semantic meaning. For fact-checking and originality
checks against a small personal corpus, that tradeoff is usually fine.

If you move to a paid tier (or a separate worker with more RAM) and
want semantic search back, swap this module for one built on
sentence-transformers + FAISS — the ingest()/query() interface below
is designed to be a drop-in replacement either way.
"""
import json
import os
import threading
import uuid
from typing import List, Dict

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.config import get_settings

settings = get_settings()
_lock = threading.Lock()


def _chunk(text: str, max_words: int = 180) -> List[str]:
    words = text.split()
    chunks = [" ".join(words[i:i + max_words]) for i in range(0, len(words), max_words)]
    return chunks or [text]


class VectorStore:
    """Despite the name (kept for interface compatibility), this stores
    TF-IDF vectors, not neural embeddings."""

    def __init__(self, path: str):
        self.path = path
        os.makedirs(path, exist_ok=True)
        self.meta_path = os.path.join(path, "meta.json")
        self.meta: List[Dict] = []
        self.vectorizer: TfidfVectorizer | None = None
        self.matrix = None
        self._load()

    def _load(self):
        if os.path.exists(self.meta_path):
            with open(self.meta_path, "r", encoding="utf-8") as f:
                self.meta = json.load(f)
            if self.meta:
                self._refit()

    def _save(self):
        with open(self.meta_path, "w", encoding="utf-8") as f:
            json.dump(self.meta, f, ensure_ascii=False)

    def _refit(self):
        """TF-IDF needs the whole corpus to compute term weights, so we
        refit on every ingest. Fine for the corpus sizes a demo/personal
        knowledge base actually reaches; for a large corpus, batch
        ingestion or an incremental vectorizer would be worth adding."""
        texts = [m["chunk"] for m in self.meta]
        self.vectorizer = TfidfVectorizer(max_features=20000, sublinear_tf=True)
        self.matrix = self.vectorizer.fit_transform(texts)

    def ingest(self, title: str, content: str, source: str = "") -> str:
        doc_id = str(uuid.uuid4())
        chunks = _chunk(content)
        with _lock:
            for chunk in chunks:
                self.meta.append({"doc_id": doc_id, "title": title, "source": source, "chunk": chunk})
            self._refit()
            self._save()
        return doc_id

    @property
    def ntotal(self) -> int:
        return len(self.meta)

    def query(self, text: str, top_k: int = 4) -> List[Dict]:
        if not self.meta or self.vectorizer is None:
            return []
        query_vec = self.vectorizer.transform([text])
        sims = cosine_similarity(query_vec, self.matrix)[0]
        top_idx = np.argsort(sims)[::-1][:top_k]
        results = []
        for idx in top_idx:
            if sims[idx] <= 0:
                continue
            item = dict(self.meta[idx])
            item["score"] = float(sims[idx])
            results.append(item)
        return results


_store: VectorStore | None = None


def get_store() -> VectorStore:
    global _store
    if _store is None:
        _store = VectorStore(settings.vector_store_path)
    return _store
