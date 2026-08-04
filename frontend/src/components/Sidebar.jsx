import React from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../auth.jsx'

const NAV = [
  { to: '/', label: 'Generate', code: '生成' },
  { to: '/rewrite', label: 'Rewrite tone', code: 'रीराइट' },
  { to: '/translate', label: 'Translate', code: 'ترجمة' },
  { to: '/adapt', label: 'Cultural adapt', code: 'адапт' },
  { to: '/fact-check', label: 'Fact check', code: '確認' },
  { to: '/seo', label: 'SEO score', code: 'SEO' },
  { to: '/plagiarism', label: 'Originality', code: '独創' },
  { to: '/rag', label: 'Knowledge base', code: 'RAG' },
  { to: '/image', label: 'Image generation', code: '画像' },
  { to: '/history', label: 'Content history', code: 'History' },
  { to: '/analytics', label: 'Analytics', code: 'Stats' },
  { to: '/settings', label: 'Settings', code: '⚙' },
]

export default function Sidebar() {
  const { user, logout } = useAuth()

  return (
    <aside className="sidebar">
      <div className="sidebar__brand">
        <span className="sidebar__mark">P</span>
        <div>
          <div className="sidebar__title">Polyglot</div>
          <div className="sidebar__subtitle">Content Generator</div>
        </div>
      </div>

      <div className="sidebar__account">
        {user ? (
          <>
            <div className="sidebar__account-email">{user.email}</div>
            <button className="sidebar__account-action" onClick={logout}>Log out</button>
          </>
        ) : (
          <NavLink to="/login" className="sidebar__account-action">Log in / Register</NavLink>
        )}
      </div>

      <nav className="sidebar__nav">
        {NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) => 'sidebar__link' + (isActive ? ' is-active' : '')}
          >
            <span className="sidebar__link-label">{item.label}</span>
            <span className="sidebar__link-code">{item.code}</span>
          </NavLink>
        ))}
        {user?.role === 'admin' && (
          <NavLink to="/admin" className={({ isActive }) => 'sidebar__link' + (isActive ? ' is-active' : '')}>
            <span className="sidebar__link-label">Admin</span>
            <span className="sidebar__link-code">Admin</span>
          </NavLink>
        )}
      </nav>
      <div className="sidebar__footer">Powered by Groq · scikit-learn · React</div>
    </aside>
  )
}
