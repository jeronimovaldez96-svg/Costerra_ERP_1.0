// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Renderer Entry Point
// ────────────────────────────────────────────────────────

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import './styles/globals.css'

const rootElement = document.getElementById('root')

if (rootElement === null) {
  throw new Error('Root element not found. Cannot mount React application.')
}

createRoot(rootElement).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>
)
