import React from 'react'
import { api } from '../api.js'
import ApiKeyBanner from '../components/ApiKeyBanner.jsx'
import VoiceInputButton from '../components/VoiceInputButton.jsx'
import { useAuth } from '../auth.jsx'

const LANGUAGES = ['English', 'Hindi', 'Spanish', 'Mandarin', 'Arabic', 'French', 'Japanese', 'Russian', 'Portuguese', 'German']
const TONES = ['informative', 'conversational', 'persuasive', 'formal', 'playful', 'authoritative']

export default function Generate() {
  const { user } = useAuth()
  const [topic, setTopic] = React.useState('')
  const [language, setLanguage] = React.useState('English')
  const [tone, setTone] = React.useState('informative')
  const [length, setLength] = React.useState(600)
  const [useRag, setUseRag] = React.useState(false)
  const [template, setTemplate] = React.useState('')
  const [templates, setTemplates] = React.useState([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')
  const [result, setResult] = React.useState(null)
  const [recent, setRecent] = React.useState([])
  const [exporting, setExporting] = React.useState('')

  React.useEffect(() => {
    api.listArticles().then((res) => setRecent(res.articles || [])).catch(() => {})
    api.templates().then((res) => setTemplates(res.templates || [])).catch(() => {})
  }, [])

  async function onSubmit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    setResult(null)
    try {
      const res = await api.generate({
        topic, language, tone, length_words: Number(length), use_rag: useRag,
        template: template || null,
      })
      setResult(res)
      api.listArticles().then((r) => setRecent(r.articles || [])).catch(() => {})
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function onExport(format) {
    if (!result) return
    setExporting(format)
    try {
      const payload = { title: result.title_guess || topic, content: result.content }
      if (format === 'pdf') await api.exportPdf(payload)
      if (format === 'docx') await api.exportDocx(payload)
      if (format === 'markdown') await api.exportMarkdown(payload)
    } catch (err) {
      setError(err.message)
    } finally {
      setExporting('')
    }
  }

  return (
    <div className="page">
      <header className="page__header">
        <span className="eyebrow">01 · Generate</span>
        <h1>Write a new article</h1>
        <p>Pick a topic, a language, and a tone — get a full draft, natively written, not translated.</p>
      </header>

      <ApiKeyBanner />

      <form className="card form" onSubmit={onSubmit}>
        <label className="field">
          <span>Topic</span>
          <div className="input-with-mic">
            <input
              required
              placeholder="e.g. How solar microgrids are changing rural electrification"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
            />
            <VoiceInputButton onResult={(text) => setTopic((prev) => (prev ? prev + ' ' : '') + text)} />
          </div>
        </label>

        <div className="field-row">
          <label className="field">
            <span>Language</span>
            <select value={language} onChange={(e) => setLanguage(e.target.value)}>
              {LANGUAGES.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Tone</span>
            <select value={tone} onChange={(e) => setTone(e.target.value)}>
              {TONES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Length (words)</span>
            <input type="number" min="100" max="3000" step="50" value={length}
              onChange={(e) => setLength(e.target.value)} />
          </label>
        </div>

        <label className="field">
          <span>Format template (optional)</span>
          <select value={template} onChange={(e) => setTemplate(e.target.value)}>
            <option value="">Standard article</option>
            {templates.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </label>

        <label className="checkbox">
          <input type="checkbox" checked={useRag} onChange={(e) => setUseRag(e.target.checked)} />
          <span>Ground with my knowledge base (RAG)</span>
        </label>

        <button className="btn btn--primary" type="submit" disabled={loading}>
          {loading ? 'Writing…' : 'Generate article'}
        </button>
        {error && <div className="error">{error}</div>}
        {!user && (
          <p className="muted">
            Not logged in — this generation won't be saved to a history you can edit later.{' '}
            <a href="/login">Log in</a> to keep it.
          </p>
        )}
      </form>

      {result && (
        <div className="card result">
          <div className="result__meta">
            <span>{result.language}</span><span>·</span><span>{result.tone}</span>
            <span>·</span><span>{result.word_count} words</span>
          </div>
          <pre className="result__body">{result.content}</pre>
          <div className="field-row" style={{ marginTop: 16 }}>
            <button className="btn btn--ghost" onClick={() => onExport('pdf')} disabled={!!exporting}>
              {exporting === 'pdf' ? 'Exporting…' : 'Export PDF'}
            </button>
            <button className="btn btn--ghost" onClick={() => onExport('docx')} disabled={!!exporting}>
              {exporting === 'docx' ? 'Exporting…' : 'Export DOCX'}
            </button>
            <button className="btn btn--ghost" onClick={() => onExport('markdown')} disabled={!!exporting}>
              {exporting === 'markdown' ? 'Exporting…' : 'Export Markdown'}
            </button>
          </div>
        </div>
      )}

      {recent.length > 0 && (
        <div className="card">
          <h3>Recent articles</h3>
          <ul className="check-list">
            {recent.map((a) => (
              <li key={a._id}>
                <strong>{a.topic}</strong> — {a.language}, {a.tone}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
