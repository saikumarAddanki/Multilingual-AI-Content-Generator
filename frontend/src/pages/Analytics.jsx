import React from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import { useAuth } from '../auth.jsx'

export default function Analytics() {
  const { user, loading: authLoading } = useAuth()
  const [stats, setStats] = React.useState(null)
  const [error, setError] = React.useState('')

  React.useEffect(() => {
    if (!user) return
    api.analytics().then(setStats).catch((err) => setError(err.message))
  }, [user])

  if (authLoading) return null

  if (!user) {
    return (
      <div className="page">
        <header className="page__header">
          <span className="eyebrow">Analytics</span>
          <h1>Log in to see your usage</h1>
          <p>Word counts, reading time, and token usage are tracked per account.</p>
        </header>
        <Link className="btn btn--primary" to="/login">Log in / Register</Link>
      </div>
    )
  }

  return (
    <div className="page">
      <header className="page__header">
        <span className="eyebrow">Analytics</span>
        <h1>Your usage</h1>
        <p>A summary of everything you've generated while logged in.</p>
      </header>

      {error && <div className="error">{error}</div>}

      {stats && (
        <div className="card">
          <div className="stat-grid">
            <div className="stat">
              <div className="stat__value">{stats.total_articles}</div>
              <div className="stat__label">Articles generated</div>
            </div>
            <div className="stat">
              <div className="stat__value">{stats.total_words.toLocaleString()}</div>
              <div className="stat__label">Total words</div>
            </div>
            <div className="stat">
              <div className="stat__value">{stats.total_reading_minutes}</div>
              <div className="stat__label">Reading minutes</div>
            </div>
            <div className="stat">
              <div className="stat__value">{stats.approx_total_tokens.toLocaleString()}</div>
              <div className="stat__label">Approx. tokens used</div>
            </div>
          </div>

          {Object.keys(stats.articles_by_language).length > 0 && (
            <>
              <h3 style={{ marginTop: 28 }}>By language</h3>
              <ul className="check-list">
                {Object.entries(stats.articles_by_language).map(([lang, count]) => (
                  <li key={lang}><strong>{lang}</strong> — {count} article{count === 1 ? '' : 's'}</li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
    </div>
  )
}
