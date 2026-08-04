import React from 'react'
import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar.jsx'
import LanguageStrip from './components/LanguageStrip.jsx'
import Generate from './pages/Generate.jsx'
import Rewrite from './pages/Rewrite.jsx'
import Translate from './pages/Translate.jsx'
import Adapt from './pages/Adapt.jsx'
import FactCheck from './pages/FactCheck.jsx'
import SEO from './pages/SEO.jsx'
import Plagiarism from './pages/Plagiarism.jsx'
import RAG from './pages/RAG.jsx'
import ImageGen from './pages/ImageGen.jsx'
import History from './pages/History.jsx'
import Analytics from './pages/Analytics.jsx'
import Admin from './pages/Admin.jsx'
import Auth from './pages/Auth.jsx'
import Share from './pages/Share.jsx'
import Settings from './pages/Settings.jsx'

export default function App() {
  return (
    <Routes>
      {/* Public, no sidebar — a shared article link should feel standalone */}
      <Route path="/share/:articleId" element={<Share />} />

      <Route path="*" element={
        <div className="layout">
          <Sidebar />
          <div className="layout__main">
            <LanguageStrip />
            <div className="layout__content">
              <Routes>
                <Route path="/" element={<Generate />} />
                <Route path="/rewrite" element={<Rewrite />} />
                <Route path="/translate" element={<Translate />} />
                <Route path="/adapt" element={<Adapt />} />
                <Route path="/fact-check" element={<FactCheck />} />
                <Route path="/seo" element={<SEO />} />
                <Route path="/plagiarism" element={<Plagiarism />} />
                <Route path="/rag" element={<RAG />} />
                <Route path="/image" element={<ImageGen />} />
                <Route path="/history" element={<History />} />
                <Route path="/analytics" element={<Analytics />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/login" element={<Auth />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </div>
          </div>
        </div>
      } />
    </Routes>
  )
}
