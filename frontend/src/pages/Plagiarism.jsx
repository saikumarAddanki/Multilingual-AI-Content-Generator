import React from 'react'
import { api } from '../api.js'

export default function Plagiarism() {
  const [text, setText] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')
  const [result, setResult] = React.useState(null)

  async function onSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)
    try {
      const res = await api.plagiarism({ text })
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
        <span className="eyebrow">07 · Originality</span>
        <h1>Originality / plagiarism score</h1>
        <p>Compares your text against documents ingested into the knowledge base below.</p>
      </header>
      <form className="card form" onSubmit={onSubmit}>
        <label className="field">
          <span>Text</span>
          <textarea required rows={10} value={text} onChange={(e) => setText(e.target.value)}
            placeholder="Paste the text to check…" />
        </label>
        <button className="btn btn--primary" type="submit" disabled={loading}>
          {loading ? 'Scoring…' : 'Check originality'}
        </button>
        {error && <div className="error">{error}</div>}
      </form>
      {result && (
        <div className="card result">
          <div className="score-ring">
            <div className="score-ring__value">{result.originality_score}</div>
            <div className="score-ring__label">/ 100</div>
          </div>
          <p className="muted">{result.note}</p>
          {result.flagged_passages.length > 0 && (
            <ul className="check-list">
              {result.flagged_passages.map((f, i) => (
                <li key={i} className="is-fail">
                  <strong>{Math.round(f.similarity * 100)}% match</strong> with "{f.matched_source}" — “{f.excerpt}…”
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
