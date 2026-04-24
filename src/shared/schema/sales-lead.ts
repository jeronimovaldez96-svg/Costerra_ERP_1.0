// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Sales Lead Schema (Drizzle ORM)
// Lead lifecycle: IN_PROGRESS → SOLD | NOT_SOLD | CLOSED
// ────────────────────────────────────────────────────────

import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { clients } from './client'

/**
 * SalesLead — Entry point in the sales pipeline.
 * A lead is created under a client and produces one or more Quotes.
 */
export const salesLeads = sqliteTable(
  'SalesLead',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    leadNumber: text('leadNumber').notNull().unique(),
    clientId: integer('clientId')
      .notNull()
      .references(() => clients.id),
    name: text('name').notNull(),
    status: text('status').notNull().default('IN_PROGRESS'),
    createdAt: text('createdAt')
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text('updatedAt')
      .notNull()
      .default(sql`(datetime('now'))`)
  },
  (table) => [
    index('SalesLead_clientId_idx').on(table.clientId),
    index('SalesLead_status_idx').on(table.status)
  ]
)
