import React from 'react'
import { getApiKey, setApiKey, api } from '../api.js'

export default function Settings() {
  const [key, setKey] = React.useState(getApiKey())
  const [saved, setSaved] = React.useState(false)
  const [status, setStatus] = React.useState(null)
  const [checking, setChecking] = React.useState(false)

  function onSave(e) {
    e.preventDefault()
    setApiKey(key.trim())
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function onClear() {
    setApiKey('')
    setKey('')
  }

  async function onCheckBackend() {
    setChecking(true)
    setStatus(null)
    try {
      await api.health()
      setStatus({ ok: true, msg: 'Backend reachable.' })
    } catch (err) {
      setStatus({ ok: false, msg: `Backend unreachable: ${err.message}` })
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="page">
      <header className="page__header">
        <span className="eyebrow">09 · Settings</span>
        <h1>Groq API key</h1>
        <p>
          Get a free key at <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer">console.groq.com/keys</a>.
          It's stored only in this browser's local storage and sent directly to your own backend —
          never written to any file or database.
        </p>
      </header>

      <form className="card form" onSubmit={onSave}>
        <label className="field">
          <span>Groq API key</span>
          <input
            type="password"
            autoComplete="off"
            placeholder="gsk_…"
            value={key}
            onChange={(e) => setKey(e.target.value)}
          />
        </label>
        <div className="field-row">
          <button className="btn btn--primary" type="submit">Save key</button>
          <button className="btn btn--ghost" type="button" onClick={onClear}>Clear</button>
        </div>
        {saved && <div className="success">Saved to this browser.</div>}
      </form>

      <div className="card">
        <h3>Backend connection</h3>
        <p className="muted">API base URL: <code>{import.meta.env.VITE_API_URL || 'http://localhost:8000'}</code></p>
        <button className="btn btn--ghost" onClick={onCheckBackend} disabled={checking}>
          {checking ? 'Checking…' : 'Test connection'}
        </button>
        {status && (
          <div className={status.ok ? 'success' : 'error'}>{status.msg}</div>
        )}
      </div>
    </div>
  )
}
