// ────────────────────────────────────────────────────────
// Costerra ERP v2 — System IPC Handlers
// Backup, Restore, Reset, Export
// ────────────────────────────────────────────────────────

import { z } from 'zod'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { registerRoute } from './router'
import { dialog, BrowserWindow } from 'electron'
import * as backupService from '../services/backup.service'
import * as exportService from '../services/export.service'
import * as settingsService from '../services/settings.service'

const exportEntitySchema = z.enum([
  'products', 'suppliers', 'clients', 'purchase-orders',
  'sales-leads', 'quotes', 'sales'
])

export function registerSystemHandlers(): void {
  // ─── Backup ──────────────────────────────────────────
  registerRoute(
    IPC_CHANNELS.BACKUP_CREATE,
    { schema: z.object({ isAutomatic: z.boolean().optional().default(false), filePath: z.string().optional() }) },
    async ({ isAutomatic, filePath }) => backupService.createBackup(isAutomatic, filePath)
  )

  registerRoute(
    IPC_CHANNELS.BACKUP_RESTORE,
    { schema: z.object({ backupFilePath: z.string().min(1) }) },
    async ({ backupFilePath }) => {
      await backupService.restoreBackup(backupFilePath)
      return { success: true }
    }
  )

  registerRoute(
    IPC_CHANNELS.BACKUP_LIST,
    { schema: z.object({}).optional() },
    async () => backupService.listBackups()
  )

  // ─── Database Reset ──────────────────────────────────
  registerRoute(
    IPC_CHANNELS.DATABASE_RESET,
    { schema: z.object({ confirmed: z.literal(true) }) },
    async () => backupService.resetDatabase()
  )

  // ─── XLSX Export ─────────────────────────────────────
  registerRoute(
    IPC_CHANNELS.EXPORT_XLSX,
    { schema: z.object({ entity: exportEntitySchema }) },
    async ({ entity }) => {
      const filePath = await exportService.exportToXlsx(entity)
      return { filePath }
    }
  )

  // ─── File & Directory Selection ──────────────────────
  registerRoute(
    IPC_CHANNELS.SYSTEM_SELECT_FILE,
    { schema: z.object({ title: z.string().optional(), filters: z.array(z.object({ name: z.string(), extensions: z.array(z.string()) })).optional() }).optional() },
    async (options) => {
      const window = BrowserWindow.getFocusedWindow()
      if (!window) return null

      const result = await dialog.showOpenDialog(window, {
        title: options?.title || 'Select File',
        properties: ['openFile'],
        filters: options?.filters || [{ name: 'Database Files', extensions: ['db'] }]
      })

      return result.canceled ? null : result.filePaths[0]
    }
  )

  registerRoute(
    IPC_CHANNELS.SYSTEM_SELECT_DIRECTORY,
    { schema: z.object({ title: z.string().optional() }).optional() },
    async (options) => {
      const window = BrowserWindow.getFocusedWindow()
      if (!window) return null

      const result = await dialog.showOpenDialog(window, {
        title: options?.title || 'Select Directory',
        properties: ['openDirectory', 'createDirectory']
      })

      return result.canceled ? null : result.filePaths[0]
    }
  )

  registerRoute(
    IPC_CHANNELS.SYSTEM_SAVE_DIALOG,
    { schema: z.object({ title: z.string().optional(), defaultPath: z.string().optional(), filters: z.array(z.object({ name: z.string(), extensions: z.array(z.string()) })).optional() }).optional() },
    async (options) => {
      const window = BrowserWindow.getFocusedWindow()
      if (!window) return null

      const result = await dialog.showSaveDialog(window, {
        title: options?.title || 'Save File',
        filters: options?.filters || [{ name: 'Database Files', extensions: ['db'] }],
        ...(options?.defaultPath ? { defaultPath: options.defaultPath } : {})
      })

      return result.canceled ? null : result.filePath
    }
  )

  // ─── Settings ───────────────────────────────────────
  registerRoute(
    IPC_CHANNELS.SETTINGS_GET,
    { schema: z.object({ key: z.string(), defaultValue: z.string() }) },
    async ({ key, defaultValue }) => settingsService.getSetting(key, defaultValue)
  )

  registerRoute(
    IPC_CHANNELS.SETTINGS_UPDATE,
    { schema: z.object({ key: z.string(), value: z.string() }) },
    async ({ key, value }) => settingsService.setSetting(key, value)
  )
}
