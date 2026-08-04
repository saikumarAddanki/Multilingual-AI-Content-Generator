import React from 'react'
import { api } from '../api.js'

export default function SEO() {
  const [text, setText] = React.useState('')
  const [keyword, setKeyword] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')
  const [result, setResult] = React.useState(null)

  async function onSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await api.seo({ text, target_keyword: keyword || null })
      setResult(res)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <header className="page__header">
        <span className="eyebrow">06 · SEO</span>
        <h1>Score for SEO</h1>
        <p>Local, free checks — length, headings, keyword density, and readability. No API key needed.</p>
      </header>
      <form className="card form" onSubmit={onSubmit}>
        <label className="field">
          <span>Text</span>
          <textarea required rows={10} value={text} onChange={(e) => setText(e.target.value)}
            placeholder="Paste your article (markdown headings like ## Section work best)…" />
        </label>
        <label className="field">
          <span>Target keyword (optional)</span>
          <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="e.g. solar microgrids" />
        </label>
        <button className="btn btn--primary" type="submit" disabled={loading}>
          {loading ? 'Scoring…' : 'Score'}
        </button>
        {error && <div className="error">{error}</div>}
      </form>
      {result && (
        <div className="card result">
          <div className="score-ring">
            <div className="score-ring__value">{result.overall_score}</div>
            <div className="score-ring__label">/ 100</div>
          </div>
          <ul className="check-list">
            {result.checks.map((c, i) => (
              <li key={i} className={c.pass ? 'is-pass' : 'is-fail'}>
                <strong>{c.check}</strong> — {c.detail}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
