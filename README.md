# Polyglot — Multilingual AI Content Generator

Generate, rewrite, translate, and culturally adapt long-form content in
multiple languages, with local SEO scoring, an originality/plagiarism
check against your own knowledge base, a lightweight RAG pipeline (TF-IDF
similarity — chosen to fit free-tier hosting memory limits), and
RLHF-style feedback collection.

Runs on **Groq** (OpenAI-compatible, free tier, very fast) by default — but
any OpenAI-compatible provider works by changing two env vars.

```
├── backend/     FastAPI + Groq/OpenAI SDK + TF-IDF RAG + MongoDB (optional)
├── frontend/    React + Vite, dark "ink & amber" UI
└── docker-compose.yml
```

## Features → where they live

| Feature | Where |
|---|---|
| Topic → article generation | `POST /api/generate` · Generate page |
| Rewrite in a different tone | `POST /api/rewrite` · Rewrite page |
| Translate | `POST /api/translate` · Translate page |
| Cultural adaptation | `POST /api/adapt` · Adapt page |
| Fact checking against your sources | `POST /api/fact-check` · Fact-check page |
| SEO scoring (local, free) | `POST /api/seo` · SEO page |
| AI/originality score | `POST /api/plagiarism` · Originality page |
| RAG ingest + query (TF-IDF) | `POST /api/rag/ingest`, `/api/rag/query` · Knowledge base page |
| Feedback + RLHF dataset export | `POST /api/feedback`, `GET /api/rlhf-dataset` |
| Export to PDF / DOCX / Markdown | `POST /api/export/{pdf,docx,markdown}` |
| **Auth (JWT, email + password)** | `POST /api/auth/{register,login}`, `GET /api/auth/me` · Login page |
| **Content history (save/edit/delete)** | `GET/PUT/DELETE /api/articles/{id}`, `GET /api/history` · History page |
| **Version history + restore** | `GET /api/articles/{id}/versions`, `POST .../restore` · History page |
| **Prompt templates** (blog, LinkedIn, email, etc.) | `GET /api/templates` · dropdown on Generate page |
| **Shareable read-only link** | `GET /api/share/{id}` · `/share/:id` page |
| **Usage analytics** | `GET /api/analytics` · Analytics page |
| **Admin dashboard** (users + platform stats) | `GET /api/admin/{users,stats}` · Admin page (admin role only) |
| **Rate limiting** | applied via `slowapi`, configurable per-route |
| **Caching** (Redis or in-memory) | repeated identical generations are served from cache |
| **Voice input** (speech-to-text) | browser `SpeechRecognition` API — mic button on Generate |
| **Image generation** (optional, separate API key) | `POST /api/image/generate` · Image page |

The Groq API key is entered once in the app's **Settings** page. It's
stored in the browser's `localStorage` and sent as an `X-Api-Key` header
on each request — it is never written to disk on the server.

---

## 1. Get a Groq API key

1. Go to **[console.groq.com/keys](https://console.groq.com/keys)** and sign up (free).
2. Create an API key (starts with `gsk_...`).
3. You'll paste this into the app's Settings page once it's running — no
   need to put it in any config file unless you want a server-side fallback.

---

## 2. Run it locally

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env          # optional — you can leave GROQ_API_KEY blank
uvicorn app.main:app --reload --port 8000
```

There's no model download on first run — RAG uses TF-IDF (scikit-learn),
not a neural embedding model, specifically so it stays light enough to
run on free-tier hosts.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env          # VITE_API_URL=http://localhost:8000
npm run dev
```

Open **http://localhost:5173**, go to **Settings**, paste your Groq key,
and hit Generate.

### Or: Docker Compose (both services + MongoDB)

```bash
GROQ_API_KEY=gsk_your_key_here docker compose up --build
```

Frontend at `http://localhost:4173`, backend at `http://localhost:8000`.

---

## 3. Push to GitHub

```bash
cd multilingual-ai-content-generator
git init                       # skip if already a repo
git add .
git commit -m "Initial commit: Polyglot multilingual content generator"
```

Create an empty repo on GitHub (github.com → New repository, don't
initialize with a README), then:

```bash
git remote add origin https://github.com/<your-username>/<your-repo>.git
git branch -M main
git push -u origin main
```

`.gitignore` already excludes `.env`, `node_modules/`, `venv/`, and the
local vector-store data — you won't accidentally commit secrets.

---

## 4. Deploy the backend (Render — free tier works)

1. **render.com** → New → Web Service → connect your GitHub repo.
2. Settings:
   - **Root directory:** `backend`
   - **Runtime:** Python 3
   - **Build command:** `pip install -r requirements.txt`
   - **Start command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
3. Environment variables (Render → Environment):
   ```
   GROQ_API_KEY        (optional — leave blank if users always paste their own)
   LLM_BASE_URL         https://api.groq.com/openai/v1
   CHAT_MODEL            llama-3.3-70b-versatile
   CORS_ORIGINS          https://<your-frontend-domain>   (fill in after step 5)
   MONGO_URI              (optional — see step 6)
   JWT_SECRET             a long random string — REQUIRED before real users sign up.
                           Generate one locally with:
                           python -c "import secrets; print(secrets.token_hex(32))"
   ADMIN_EMAIL             (optional) the email you'll register with to get admin access
   IMAGE_API_KEY           (optional) enables the Image Generation page
   REDIS_URL               (optional) enables Redis-backed caching instead of in-memory
   ```
4. Deploy. Note the resulting URL, e.g. `https://polyglot-backend.onrender.com`.

> ⚠️ **Auth needs MongoDB to be real.** Without `MONGO_URI` set, registered
> users live in server memory — every redeploy wipes every account,
> including any admin account. Follow
> **[MONGODB_SETUP.md](./MONGODB_SETUP.md)** before relying on
> login/history/admin for anything beyond a quick local test.

**Alternative:** Railway.app works the same way — same root directory,
build/start commands, and env vars, via its dashboard or `railway.json`.

> Free-tier disks on Render/Railway are ephemeral — anything ingested into
> the local vector store resets on redeploy. For a persistent knowledge
> base in production, point `VECTOR_STORE_PATH` at a mounted volume (paid
> tier) or swap `app/rag.py` for a managed vector DB (Pinecone, Chroma
> Cloud, Qdrant) — the `ingest()`/`query()` interface is designed to be a
> drop-in swap.

---

## 5. Deploy the frontend (Vercel)

1. **vercel.com** → Add New → Project → import the same GitHub repo.
2. Settings:
   - **Root directory:** `frontend`
   - **Framework preset:** Vite
   - **Build command:** `npm run build`
   - **Output directory:** `dist`
3. Environment variable:
   ```
   VITE_API_URL   https://polyglot-backend.onrender.com   (your Render URL from step 4)
   ```
4. Deploy. Vercel gives you a URL like `https://polyglot.vercel.app`.

**Alternative:** Netlify — same root directory and build command, output
directory `dist`, same `VITE_API_URL` env var.

---

## 6. Wire CORS + (optional) MongoDB

- Back in Render, set `CORS_ORIGINS` to your Vercel URL (e.g.
  `https://polyglot.vercel.app`) and redeploy the backend, or requests
  from the browser will be blocked.
- For persistent article/feedback storage, create a free cluster at
  **mongodb.com/atlas**, get its connection string, and set `MONGO_URI`
  on Render. Without it, the app still works — articles/feedback just
  live in server memory and reset on restart. Full step-by-step guide:
  **[MONGODB_SETUP.md](./MONGODB_SETUP.md)**.

---

## 7. Verify

1. Open your Vercel URL → **Settings** → paste your Groq key → **Test connection**.
2. Go to **Generate**, write something short, confirm it streams back.
3. Add a source under **Knowledge base**, then try **Fact check** or
   **Originality** to see RAG grounding in action.

---

## Notes on the "Advanced Features"

- **RAG / vector DB:** implemented with TF-IDF + cosine similarity
  (scikit-learn) in `backend/app/rag.py` — chosen over neural embeddings
  (sentence-transformers/FAISS) specifically because that stack needs
  more RAM than Render's free tier (512MB) provides and will crash the
  service. TF-IDF matches on shared words/phrases rather than deeper
  semantic meaning — a real tradeoff, but a reliable one on free hosting.
  If you move to a paid tier or a separate high-memory worker, swap this
  module for an embeddings-based one; `ingest()`/`query()` are designed
  as a drop-in interface either way.
- **Prompt versioning:** `db.save_article` tags each generation with a
  `prompt_version` field — bump it in `app/main.py` when you change a
  prompt template, so you can compare outputs across versions later.
- **User feedback / RLHF dataset:** `POST /api/feedback` records a
  rating and optional human-edited text per article; `GET
  /api/rlhf-dataset` exports `{prompt, chosen, rejected, rating}` rows —
  a ready starting shape for DPO/RLHF fine-tuning data.
