import React from 'react'
import { Link } from 'react-router-dom'
import { getApiKey } from '../api.js'

export default function ApiKeyBanner() {
  const [hasKey, setHasKey] = React.useState(!!getApiKey())

  React.useEffect(() => {
    const onFocus = () => setHasKey(!!getApiKey())
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [])

  if (hasKey) return null
  return (
    <div className="banner">
      No Groq API key set yet — generation, rewriting, translation, adaptation, and
      fact-checking need one. <Link to="/settings">Add your key in Settings →</Link>
    </div>
  )
}
