// ────────────────────────────────────────────────────────
// Costerra ERP v2 — System IPC Handlers
// Backup, Restore, Reset, Export
// ────────────────────────────────────────────────────────

import { z } from 'zod'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { registerRoute } from './router'
import * as backupService from '../services/backup.service'
import * as exportService from '../services/export.service'

const exportEntitySchema = z.enum([
  'products', 'suppliers', 'clients', 'purchase-orders',
  'sales-leads', 'quotes', 'sales'
])

export function registerSystemHandlers(): void {
  // ─── Backup ──────────────────────────────────────────
  registerRoute(
    IPC_CHANNELS.BACKUP_CREATE,
    { schema: z.object({ isAutomatic: z.boolean().optional().default(false) }) },
    async ({ isAutomatic }) => backupService.createBackup(isAutomatic)
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
}
