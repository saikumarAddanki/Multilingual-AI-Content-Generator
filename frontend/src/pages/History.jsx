import React from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import { useAuth } from '../auth.jsx'

export default function History() {
  const { user, loading: authLoading } = useAuth()
  const [articles, setArticles] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState('')
  const [editingId, setEditingId] = React.useState(null)
  const [editText, setEditText] = React.useState('')
  const [versionsFor, setVersionsFor] = React.useState(null)
  const [versions, setVersions] = React.useState([])

  const load = React.useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.history()
      setArticles(res.articles || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  React.useEffect(() => {
    if (user) load()
  }, [user, load])

  async function onDelete(id) {
    if (!confirm('Delete this article? This cannot be undone.')) return
    try {
      await api.deleteArticle(id)
      setArticles((prev) => prev.filter((a) => a._id !== id))
    } catch (err) {
      setError(err.message)
    }
  }

  function startEdit(article) {
    setEditingId(article._id)
    setEditText(article.content)
  }

  async function saveEdit(id) {
    try {
      const res = await api.updateArticle(id, editText)
      setArticles((prev) => prev.map((a) => (a._id === id ? res.article : a)))
      setEditingId(null)
    } catch (err) {
      setError(err.message)
    }
  }

  async function showVersions(id) {
    setVersionsFor(id)
    try {
      const res = await api.versions(id)
      setVersions(res.versions || [])
    } catch (err) {
      setError(err.message)
    }
  }

  async function restore(id, versionId) {
    try {
      const res = await api.restoreVersion(id, versionId)
      setArticles((prev) => prev.map((a) => (a._id === id ? res.article : a)))
      setVersionsFor(null)
    } catch (err) {
      setError(err.message)
    }
  }

  function shareUrl(id) {
    return `${window.location.origin}/share/${id}`
  }

  if (authLoading) return null

  if (!user) {
    return (
      <div className="page">
        <header className="page__header">
          <span className="eyebrow">Content history</span>
          <h1>Log in to see your history</h1>
          <p>Saved articles, edits, and version history are tied to your account.</p>
        </header>
        <Link className="btn btn--primary" to="/login">Log in / Register</Link>
      </div>
    )
  }

  return (
    <div className="page">
      <header className="page__header">
        <span className="eyebrow">Content history</span>
        <h1>Your generated content</h1>
        <p>Everything you've generated while logged in — edit, delete, or roll back to an earlier version.</p>
      </header>

      {error && <div className="error">{error}</div>}
      {loading && <p className="muted">Loading…</p>}
      {!loading && articles.length === 0 && <p className="muted">Nothing here yet — go generate something.</p>}

      {articles.map((a) => (
        <div className="card" key={a._id}>
          <div className="result__meta">
            <strong>{a.topic}</strong><span>·</span><span>{a.language}</span><span>·</span><span>{a.tone}</span>
            <span>·</span><span>{a.word_count} words</span>
          </div>

          {editingId === a._id ? (
            <>
              <textarea rows={8} value={editText} onChange={(e) => setEditText(e.target.value)} />
              <div className="field-row" style={{ marginTop: 12 }}>
                <button className="btn btn--primary" onClick={() => saveEdit(a._id)}>Save</button>
                <button className="btn btn--ghost" onClick={() => setEditingId(null)}>Cancel</button>
              </div>
            </>
          ) : (
            <pre className="result__body">{a.content}</pre>
          )}

          <div className="field-row" style={{ marginTop: 14 }}>
            {editingId !== a._id && (
              <button className="btn btn--ghost" onClick={() => startEdit(a)}>Edit</button>
            )}
            <button className="btn btn--ghost" onClick={() => showVersions(a._id)}>Version history</button>
            <button className="btn btn--ghost" onClick={() => navigator.clipboard.writeText(shareUrl(a._id))}>
              Copy share link
            </button>
            <button className="btn btn--ghost" onClick={() => onDelete(a._id)}>Delete</button>
          </div>

          {versionsFor === a._id && (
            <div className="check-list" style={{ marginTop: 14 }}>
              {versions.length === 0 && <li>No earlier versions — you haven't edited this yet.</li>}
              {versions.map((v) => (
                <li key={v._id}>
                  <strong>{new Date(v.saved_at).toLocaleString()}</strong> — {v.content.slice(0, 100)}…
                  <button className="btn btn--ghost" style={{ marginLeft: 10 }} onClick={() => restore(a._id, v._id)}>
                    Restore this version
                  </button>
                </li>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
