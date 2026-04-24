// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Preload Type Declarations
// Augments the Window interface so `window.api` is typed.
// ────────────────────────────────────────────────────────

import type { ElectronAPI } from './index'

declare global {
  interface Window {
    api: ElectronAPI
  }
}
