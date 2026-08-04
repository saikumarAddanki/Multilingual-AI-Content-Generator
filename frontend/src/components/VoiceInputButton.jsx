import React from 'react'

const SpeechRecognition = typeof window !== 'undefined'
  ? (window.SpeechRecognition || window.webkitSpeechRecognition)
  : null

// Speech-to-text for prompt fields. Runs entirely in the browser (Chrome/
// Edge support this natively) — no backend involved, no audio ever leaves
// the device. Silently renders nothing if the browser doesn't support it
// (e.g. Firefox, Safari on some versions) rather than showing a broken button.
export default function VoiceInputButton({ onResult, lang = 'en-US' }) {
  const [listening, setListening] = React.useState(false)
  const recognitionRef = React.useRef(null)

  if (!SpeechRecognition) return null

  function toggle() {
    if (listening) {
      recognitionRef.current?.stop()
      return
    }
    const recognition = new SpeechRecognition()
    recognition.lang = lang
    recognition.interimResults = false
    recognition.maxAlternatives = 1
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript
      onResult(transcript)
    }
    recognition.onend = () => setListening(false)
    recognition.onerror = () => setListening(false)
    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }

  return (
    <button
      type="button"
      className={'mic-btn' + (listening ? ' is-listening' : '')}
      onClick={toggle}
      title={listening ? 'Stop listening' : 'Speak instead of typing'}
      aria-label="Voice input"
    >
      {listening ? '● Listening…' : '🎤'}
    </button>
  )
}
