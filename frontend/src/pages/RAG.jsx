import React from 'react'
import { api } from '../api.js'

export default function RAG() {
  const [title, setTitle] = React.useState('')
  const [content, setContent] = React.useState('')
  const [source, setSource] = React.useState('')
  const [ingestMsg, setIngestMsg] = React.useState('')
  const [query, setQuery] = React.useState('')
  const [results, setResults] = React.useState([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')

  async function onIngest(e) {
    e.preventDefault()
    setError('')
    setIngestMsg('')
    try {
      const res = await api.ragIngest({ title, content, source })
      setIngestMsg(`Ingested. Corpus now has ${res.corpus_size_chunks} chunks.`)
      setTitle('')
      setContent('')
      setSource('')
    } catch (err) {
      setError(err.message)
    }
  }

  async function onQuery(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api.ragQuery({ query, top_k: 5 })
      setResults(res.results)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <header className="page__header">
        <span className="eyebrow">08 · Knowledge base</span>
        <h1>RAG corpus</h1>
        <p>Add reference documents here — Generate and Fact-check can ground their output in them.</p>
      </header>

      <form className="card form" onSubmit={onIngest}>
        <h3>Add a document</h3>
        <label className="field">
          <span>Title</span>
          <input required value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label className="field">
          <span>Source (optional)</span>
          <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="URL or citation" />
        </label>
        <label className="field">
          <span>Content</span>
          <textarea required rows={8} value={content} onChange={(e) => setContent(e.target.value)} />
        </label>
        <button className="btn btn--primary" type="submit">Ingest</button>
        {ingestMsg && <div className="success">{ingestMsg}</div>}
      </form>

      <form className="card form" onSubmit={onQuery}>
        <h3>Query the corpus</h3>
        <label className="field">
          <span>Query</span>
          <input required value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <button className="btn btn--primary" type="submit" disabled={loading}>
          {loading ? 'Searching…' : 'Search'}
        </button>
        {error && <div className="error">{error}</div>}
      </form>

      {results.length > 0 && (
        <div className="card result">
          <ul className="check-list">
            {results.map((r, i) => (
              <li key={i}>
                <strong>{r.title}</strong> ({(r.score * 100).toFixed(1)}% match) — {r.chunk.slice(0, 200)}…
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
