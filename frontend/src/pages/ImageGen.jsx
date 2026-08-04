import React from 'react'
import { api } from '../api.js'

export default function ImageGen() {
  const [configured, setConfigured] = React.useState(null)
  const [prompt, setPrompt] = React.useState('')
  const [size, setSize] = React.useState('1024x1024')
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState('')
  const [imageUrl, setImageUrl] = React.useState('')

  React.useEffect(() => {
    api.imageStatus().then((res) => setConfigured(res.configured)).catch(() => setConfigured(false))
  }, [])

  async function onSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setImageUrl('')
    try {
      const res = await api.imageGenerate({ prompt, size })
      setImageUrl(res.url)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="page">
      <header className="page__header">
        <span className="eyebrow">Image generation</span>
        <h1>Generate an image</h1>
        <p>Uses a separate image API (Groq is text-only) — configured independently by whoever runs this backend.</p>
      </header>

      {configured === false && (
        <div className="banner">
          Image generation isn't configured on this server. It needs an
          <code> IMAGE_API_KEY</code> set in the backend environment (an OpenAI-compatible
          image endpoint, e.g. OpenAI's DALL-E) — ask whoever deployed this backend to add one.
        </div>
      )}

      {configured && (
        <form className="card form" onSubmit={onSubmit}>
          <label className="field">
            <span>Prompt</span>
            <textarea required rows={4} value={prompt} onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the image you want…" />
          </label>
          <label className="field">
            <span>Size</span>
            <select value={size} onChange={(e) => setSize(e.target.value)}>
              <option value="1024x1024">Square (1024×1024)</option>
              <option value="1792x1024">Landscape (1792×1024)</option>
              <option value="1024x1792">Portrait (1024×1792)</option>
            </select>
          </label>
          <button className="btn btn--primary" type="submit" disabled={loading}>
            {loading ? 'Generating…' : 'Generate image'}
          </button>
          {error && <div className="error">{error}</div>}
        </form>
      )}

      {imageUrl && (
        <div className="card">
          <img src={imageUrl} alt={prompt} style={{ width: '100%', borderRadius: 10 }} />
        </div>
      )}
    </div>
  )
}
