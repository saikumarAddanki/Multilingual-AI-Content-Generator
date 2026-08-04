import React from 'react'
import { api } from '../api.js'
import ApiKeyBanner from '../components/ApiKeyBanner.jsx'

export default function FactCheck() {
  const [text, setText] = React.useState('')
  const [useRag, setUseRag] = React.useState(true)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')
  const [report, setReport] = React.useState(null)

  async function onSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setReport(null)
    try {
      const res = await api.factCheck({ text, use_rag: useRag })
      setReport(res)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <header className="page__header">
        <span className="eyebrow">05 · Fact check</span>
        <h1>Check claims against evidence</h1>
        <p>Compares the article's claims to your ingested knowledge base and flags what's unsupported.</p>
      </header>
      <ApiKeyBanner />
      <form className="card form" onSubmit={onSubmit}>
        <label className="field">
          <span>Article text</span>
          <textarea required rows={10} value={text} onChange={(e) => setText(e.target.value)}
            placeholder="Paste the article to fact-check…" />
        </label>
        <label className="checkbox">
          <input type="checkbox" checked={useRag} onChange={(e) => setUseRag(e.target.checked)} />
          <span>Use my knowledge base as evidence</span>
        </label>
        <button className="btn btn--primary" type="submit" disabled={loading}>
          {loading ? 'Checking…' : 'Fact-check'}
        </button>
        {error && <div className="error">{error}</div>}
      </form>
      {report && (
        <div className="card result">
          <div className="result__meta">
            <span>{report.evidence_used ? 'Checked against your knowledge base' : 'No evidence found — general review only'}</span>
          </div>
          <pre className="result__body">{report.report}</pre>
        </div>
      )}
    </div>
  )
}
