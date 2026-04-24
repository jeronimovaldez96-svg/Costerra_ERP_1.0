// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Backup Schema (Drizzle ORM)
// ────────────────────────────────────────────────────────

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

/**
 * BackupLog — Records every backup operation for audit trail.
 */
export const backupLogs = sqliteTable('BackupLog', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  filename: text('filename').notNull(),
  filePath: text('filePath').notNull(),
  sizeBytes: integer('sizeBytes').notNull(),
  isAutomatic: integer('isAutomatic', { mode: 'boolean' }).notNull().default(false),
  createdAt: text('createdAt')
    .notNull()
    .default(sql`(datetime('now'))`)
})
