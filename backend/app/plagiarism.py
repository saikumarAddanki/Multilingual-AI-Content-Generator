"""
Similarity-based plagiarism scoring. Compares the submitted text against
whatever has been ingested into the local RAG corpus (app.rag) using
embedding similarity, plus a cheap n-gram overlap check for near-verbatim
copying. This is a heuristic, not a legal plagiarism verdict — it's meant
to flag passages worth a human's second look.

To check against the live web instead of/in addition to your own corpus,
plug a search API call in here and diff the returned snippets the same way.
"""
import re
from typing import List

from app.rag import get_store, _chunk


def _ngrams(text: str, n: int = 8) -> set:
    words = re.findall(r"\w+", text.lower())
    return {" ".join(words[i:i + n]) for i in range(max(len(words) - n + 1, 0))}


def score_plagiarism(text: str) -> dict:
    store = get_store()
    chunks = _chunk(text, max_words=120)

    flagged = []
    max_sim = 0.0
    for chunk in chunks:
        matches = store.query(chunk, top_k=2)
        for m in matches:
            if m["score"] > 0.85:
                overlap = _ngrams(chunk) & _ngrams(m["chunk"])
                flagged.append({
                    "excerpt": chunk[:180],
                    "matched_source": m.get("title") or m.get("source") or "corpus document",
                    "similarity": round(m["score"], 3),
                    "shared_phrases": len(overlap),
                })
            max_sim = max(max_sim, m["score"])

    originality_score = round((1 - max_sim) * 100) if store.ntotal else 100
    return {
        "originality_score": originality_score,
        "corpus_size_chunks": store.ntotal,
        "flagged_passages": flagged,
        "note": (
            "Compared only against documents you've ingested via the RAG tab. "
            "Ingest reference sources first for a meaningful check."
            if store.ntotal else
            "No reference corpus ingested yet — score defaults to 100. "
            "Add sources under the RAG tab to enable real comparison."
        ),
    }
