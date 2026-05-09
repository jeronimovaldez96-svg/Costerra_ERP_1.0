// ────────────────────────────────────────────────────────
// Costerra ERP v2 — System Settings Schema
// Stores persistent application configurations.
// ────────────────────────────────────────────────────────

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

/**
 * SystemSettings — Generic key-value store for app configuration.
 */
export const systemSettings = sqliteTable('SystemSettings', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull().unique(),
  value: text('value').notNull()
})
