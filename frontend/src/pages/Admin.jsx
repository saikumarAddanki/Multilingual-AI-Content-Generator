import React from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api.js'
import { useAuth } from '../auth.jsx'

export default function Admin() {
  const { user, loading: authLoading } = useAuth()
  const [users, setUsers] = React.useState([])
  const [stats, setStats] = React.useState(null)
  const [error, setError] = React.useState('')
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    if (!user || user.role !== 'admin') return
    Promise.all([api.adminUsers(), api.adminStats()])
      .then(([u, s]) => {
        setUsers(u.users || [])
        setStats(s)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [user])

  if (authLoading) return null

  if (!user) {
    return (
      <div className="page">
        <header className="page__header">
          <span className="eyebrow">Admin</span>
          <h1>Log in required</h1>
        </header>
        <Link className="btn btn--primary" to="/login">Log in</Link>
      </div>
    )
  }

  if (user.role !== 'admin') {
    return (
      <div className="page">
        <header className="page__header">
          <span className="eyebrow">Admin</span>
          <h1>Admins only</h1>
          <p>Your account ({user.email}) doesn't have admin access.</p>
        </header>
      </div>
    )
  }

  return (
    <div className="page">
      <header className="page__header">
        <span className="eyebrow">Admin</span>
        <h1>Dashboard</h1>
        <p>User accounts and platform-wide usage.</p>
      </header>

      {error && <div className="error">{error}</div>}
      {loading && <p className="muted">Loading…</p>}

      {stats && (
        <div className="card">
          <h3>Platform stats</h3>
          <div className="stat-grid">
            <div className="stat">
              <div className="stat__value">{stats.total_articles}</div>
              <div className="stat__label">Total articles</div>
            </div>
            <div className="stat">
              <div className="stat__value">{stats.total_words.toLocaleString()}</div>
              <div className="stat__label">Total words</div>
            </div>
            <div className="stat">
              <div className="stat__value">{users.length}</div>
              <div className="stat__label">Registered users</div>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <h3>Users</h3>
        <ul className="check-list">
          {users.map((u) => (
            <li key={u.email}>
              <strong>{u.email}</strong> — {u.role} — joined {new Date(u.created_at).toLocaleDateString()}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
