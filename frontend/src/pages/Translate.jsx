import React from 'react'
import { api } from '../api.js'
import ApiKeyBanner from '../components/ApiKeyBanner.jsx'

export default function Translate() {
  const [text, setText] = React.useState('')
  const [targetLanguage, setTargetLanguage] = React.useState('Spanish')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')
  const [output, setOutput] = React.useState('')

  async function onSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setOutput('')
    try {
      const res = await api.translate({ text, target_language: targetLanguage })
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
        <span className="eyebrow">03 · Translate</span>
        <h1>Translate</h1>
        <p>Fluent, idiomatic translation — not a literal word swap.</p>
      </header>
      <ApiKeyBanner />
      <form className="card form" onSubmit={onSubmit}>
        <label className="field">
          <span>Text</span>
          <textarea required rows={8} value={text} onChange={(e) => setText(e.target.value)}
            placeholder="Text to translate…" />
        </label>
        <label className="field">
          <span>Target language</span>
          <input required value={targetLanguage} onChange={(e) => setTargetLanguage(e.target.value)}
            placeholder="e.g. Japanese" />
        </label>
        <button className="btn btn--primary" type="submit" disabled={loading}>
          {loading ? 'Translating…' : 'Translate'}
        </button>
        {error && <div className="error">{error}</div>}
      </form>
      {output && <div className="card result"><pre className="result__body">{output}</pre></div>}
    </div>
  )
}
