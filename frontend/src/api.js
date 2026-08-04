const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const KEY_STORAGE = 'polyglot_groq_api_key'
const TOKEN_STORAGE = 'polyglot_jwt'

export function getApiBaseUrl() {
  return BASE_URL
}

export function getApiKey() {
  return localStorage.getItem(KEY_STORAGE) || ''
}

export function setApiKey(key) {
  if (key) localStorage.setItem(KEY_STORAGE, key)
  else localStorage.removeItem(KEY_STORAGE)
}

function getJwt() {
  return localStorage.getItem(TOKEN_STORAGE) || ''
}

async function request(path, { method = 'POST', body, headers = {}, raw = false } = {}) {
  const apiKey = getApiKey()
  const jwt = getJwt()
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(apiKey ? { 'X-Api-Key': apiKey } : {}),
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    let detail = res.statusText
    try {
      const err = await res.json()
      detail = Array.isArray(err.detail)
        ? err.detail.map((d) => d.msg).join('; ')
        : err.detail || detail
    } catch (_) {}
    throw new Error(detail)
  }
  return raw ? res : res.json()
}

async function download(path, body, filename) {
  const res = await request(path, { body, raw: true })
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export const api = {
  // --- auth ---
  register: (payload) => request('/api/auth/register', { body: payload }),
  login: (payload) => request('/api/auth/login', { body: payload }),
  me: () => request('/api/auth/me', { method: 'GET' }),

  // --- templates ---
  templates: () => request('/api/templates', { method: 'GET' }),

  // --- generation tools ---
  generate: (payload) => request('/api/generate', { body: payload }),
  rewrite: (payload) => request('/api/rewrite', { body: payload }),
  translate: (payload) => request('/api/translate', { body: payload }),
  adapt: (payload) => request('/api/adapt', { body: payload }),
  factCheck: (payload) => request('/api/fact-check', { body: payload }),
  seo: (payload) => request('/api/seo', { body: payload }),
  plagiarism: (payload) => request('/api/plagiarism', { body: payload }),
  ragIngest: (payload) => request('/api/rag/ingest', { body: payload }),
  ragQuery: (payload) => request('/api/rag/query', { body: payload }),
  feedback: (payload) => request('/api/feedback', { body: payload }),
  rlhfDataset: () => request('/api/rlhf-dataset', { method: 'GET' }),
  listArticles: () => request('/api/articles', { method: 'GET' }),

  // --- content history (requires login) ---
  history: (limit = 50) => request(`/api/history?limit=${limit}`, { method: 'GET' }),
  updateArticle: (id, content) => request(`/api/articles/${id}`, { method: 'PUT', body: { content } }),
  deleteArticle: (id) => request(`/api/articles/${id}`, { method: 'DELETE' }),
  versions: (id) => request(`/api/articles/${id}/versions`, { method: 'GET' }),
  restoreVersion: (id, versionId) => request(`/api/articles/${id}/restore`, { body: { version_id: versionId } }),
  shareArticle: (id) => request(`/api/share/${id}`, { method: 'GET' }),

  // --- analytics / admin ---
  analytics: () => request('/api/analytics', { method: 'GET' }),
  adminUsers: () => request('/api/admin/users', { method: 'GET' }),
  adminStats: () => request('/api/admin/stats', { method: 'GET' }),

  // --- image generation ---
  imageStatus: () => request('/api/image/status', { method: 'GET' }),
  imageGenerate: (payload) => request('/api/image/generate', { body: payload }),

  // --- export ---
  exportPdf: (payload) => download('/api/export/pdf', payload, `${(payload.title || 'article').slice(0, 50)}.pdf`),
  exportDocx: (payload) => download('/api/export/docx', payload, `${(payload.title || 'article').slice(0, 50)}.docx`),
  exportMarkdown: (payload) => download('/api/export/markdown', payload, `${(payload.title || 'article').slice(0, 50)}.md`),

  health: () => request('/health', { method: 'GET' }),
}
