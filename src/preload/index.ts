// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Preload Script (Context Bridge)
// Exposes a strictly typed API to the Renderer process.
// This is the ONLY surface area between Main and Renderer.
// ────────────────────────────────────────────────────────

import { contextBridge, ipcRenderer } from 'electron'
import type { IpcChannel } from '../shared/ipc-channels'

/**
 * The API exposed to the renderer via `window.api`.
 * Each method invokes a typed IPC channel and returns a Promise.
 */
const api = {
  /**
   * Generic invoke — sends to Main and returns the result.
   * All renderer hooks should use this as the transport layer.
   */
  invoke: <T = unknown>(channel: IpcChannel, ...args: unknown[]): Promise<T> => {
    return ipcRenderer.invoke(channel, ...args) as Promise<T>
  },

  /**
   * Send event to Main process without waiting for a response.
   */
  send: (channel: string, ...args: unknown[]): void => {
    ipcRenderer.send(channel, ...args)
  },

  /**
   * Listen for events pushed from Main to Renderer.
   * Used for backup progress, update status, etc.
   */
  on: (channel: string, callback: (...args: unknown[]) => void): (() => void) => {
    const listener = (_event: Electron.IpcRendererEvent, ...args: unknown[]): void => {
      callback(...args)
    }
    ipcRenderer.on(channel, listener)

    // Return cleanup function
    return () => {
      ipcRenderer.removeListener(channel, listener)
    }
  }
} as const

// Expose the API on `window.api` with full type safety
contextBridge.exposeInMainWorld('api', api)

// ─── Type Augmentation ───────────────────────────────
export type ElectronAPI = typeof api
