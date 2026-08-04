import React from 'react'
import { api } from '../api.js'
import ApiKeyBanner from '../components/ApiKeyBanner.jsx'

export default function Adapt() {
  const [text, setText] = React.useState('')
  const [targetLocale, setTargetLocale] = React.useState('Brazil')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')
  const [output, setOutput] = React.useState('')

  async function onSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setOutput('')
    try {
      const res = await api.adapt({ text, target_locale: targetLocale })
      setOutput(res.content)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <header className="page__header">
        <span className="eyebrow">04 · Cultural adapt</span>
        <h1>Adapt for a locale</h1>
        <p>Swap idioms, units, and references so the piece reads as native, not translated.</p>
      </header>
      <ApiKeyBanner />
      <form className="card form" onSubmit={onSubmit}>
        <label className="field">
          <span>Text</span>
          <textarea required rows={8} value={text} onChange={(e) => setText(e.target.value)}
            placeholder="Text to adapt…" />
        </label>
        <label className="field">
          <span>Target locale</span>
          <input required value={targetLocale} onChange={(e) => setTargetLocale(e.target.value)}
            placeholder="e.g. Brazil, Gulf Arabic, Quebec" />
        </label>
        <button className="btn btn--primary" type="submit" disabled={loading}>
          {loading ? 'Adapting…' : 'Adapt'}
        </button>
        {error && <div className="error">{error}</div>}
      </form>
      {output && <div className="card result"><pre className="result__body">{output}</pre></div>}
    </div>
  )
}
