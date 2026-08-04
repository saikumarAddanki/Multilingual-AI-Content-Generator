import React from 'react'
import { api } from '../api.js'
import ApiKeyBanner from '../components/ApiKeyBanner.jsx'

const TONES = ['informative', 'conversational', 'persuasive', 'formal', 'playful', 'authoritative', 'urgent', 'empathetic']

export default function Rewrite() {
  const [text, setText] = React.useState('')
  const [language, setLanguage] = React.useState('English')
  const [targetTone, setTargetTone] = React.useState('conversational')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')
  const [output, setOutput] = React.useState('')

  async function onSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setOutput('')
    try {
      const res = await api.rewrite({ text, target_tone: targetTone, language })
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
        <span className="eyebrow">02 · Rewrite</span>
        <h1>Rewrite in a different tone</h1>
        <p>Keep the facts, change the voice — same language, new register.</p>
      </header>
      <ApiKeyBanner />
      <form className="card form" onSubmit={onSubmit}>
        <label className="field">
          <span>Text</span>
          <textarea required rows={8} value={text} onChange={(e) => setText(e.target.value)}
            placeholder="Paste the text you want rewritten…" />
        </label>
        <div className="field-row">
          <label className="field">
            <span>Language</span>
            <input value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="English" />
          </label>
          <label className="field">
            <span>Target tone</span>
            <select value={targetTone} onChange={(e) => setTargetTone(e.target.value)}>
              {TONES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
        </div>
        <button className="btn btn--primary" type="submit" disabled={loading}>
          {loading ? 'Rewriting…' : 'Rewrite'}
        </button>
        {error && <div className="error">{error}</div>}
      </form>
      {output && <div className="card result"><pre className="result__body">{output}</pre></div>}
    </div>
  )
}
