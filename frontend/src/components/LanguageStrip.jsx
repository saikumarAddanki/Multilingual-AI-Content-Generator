import React from 'react'

// The signature element: a strip of the same idea — "Generate content" —
// rendered in scripts from languages the tool actually supports. Not a
// decorative globe icon; it's literally what the product outputs.
const SNIPPETS = [
  { lang: 'English', text: 'Generate content' },
  { lang: 'Hindi', text: 'सामग्री बनाएं' },
  { lang: 'Mandarin', text: '生成内容' },
  { lang: 'Arabic', text: 'إنشاء محتوى' },
  { lang: 'Spanish', text: 'Generar contenido' },
  { lang: 'Japanese', text: 'コンテンツを生成' },
  { lang: 'Russian', text: 'Создать контент' },
  { lang: 'Tamil', text: 'உள்ளடக்கத்தை உருவாக்கு' },
  { lang: 'French', text: 'Générer du contenu' },
  { lang: 'Korean', text: '콘텐츠 생성' },
]

export default function LanguageStrip() {
  const loop = [...SNIPPETS, ...SNIPPETS]
  return (
    <div className="lang-strip" aria-hidden="true">
      <div className="lang-strip__track">
        {loop.map((s, i) => (
          <span className="lang-strip__item" key={i}>
            {s.text}
            <em>{s.lang}</em>
          </span>
        ))}
      </div>
    </div>
  )
}
