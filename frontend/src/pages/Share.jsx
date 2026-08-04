import React from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api.js'

export default function Share() {
  const { articleId } = useParams()
  const [article, setArticle] = React.useState(null)
  const [error, setError] = React.useState('')

  React.useEffect(() => {
    api.shareArticle(articleId).then(setArticle).catch((err) => setError(err.message))
  }, [articleId])

  if (error) {
    return (
      <div className="page">
        <div className="error">Couldn't load this article: {error}</div>
      </div>
    )
  }

  if (!article) {
    return <div className="page"><p className="muted">Loading…</p></div>
  }

  return (
    <div className="page">
      <header className="page__header">
        <span className="eyebrow">Shared article</span>
        <h1>{article.topic}</h1>
        <p>{article.language} · {article.tone} · shared {new Date(article.created_at).toLocaleDateString()}</p>
      </header>
      <div className="card result">
        <pre className="result__body">{article.content}</pre>
      </div>
      <p className="muted">This is a read-only view — you'd need your own account to edit or generate content.</p>
    </div>
  )
}
