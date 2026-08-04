import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../auth.jsx'

export default function Auth() {
  const [mode, setMode] = React.useState('login')
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const { login, register } = useAuth()
  const navigate = useNavigate()

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (mode === 'login') await login(email, password)
      else await register(email, password)
      navigate('/history')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <header className="page__header">
        <span className="eyebrow">Account</span>
        <h1>{mode === 'login' ? 'Log in' : 'Create an account'}</h1>
        <p>
          {mode === 'login'
            ? "Log in to save your generated content, edit it later, and see your usage stats."
            : 'Create an account to keep a history of everything you generate.'}
        </p>
      </header>

      <form className="card form" onSubmit={onSubmit}>
        <label className="field">
          <span>Email</span>
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="field">
          <span>Password {mode === 'register' && '(8+ characters)'}</span>
          <input required type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        <button className="btn btn--primary" type="submit" disabled={loading}>
          {loading ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Register'}
        </button>
        {error && <div className="error">{error}</div>}
      </form>

      <p className="muted">
        {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
        <a href="#" onClick={(e) => { e.preventDefault(); setMode(mode === 'login' ? 'register' : 'login'); setError('') }}>
          {mode === 'login' ? 'Register' : 'Log in'}
        </a>
      </p>
    </div>
  )
}
