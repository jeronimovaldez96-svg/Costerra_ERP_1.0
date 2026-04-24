// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Client Schema (Drizzle ORM)
// ────────────────────────────────────────────────────────

import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

/**
 * Client — Customer entity for the CRM pipeline.
 */
export const clients = sqliteTable('Client', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  clientNumber: text('clientNumber').notNull().unique(),
  name: text('name').notNull(),
  surname: text('surname').notNull(),
  address: text('address').notNull().default(''),
  city: text('city').notNull().default(''),
  zipCode: text('zipCode').notNull().default(''),
  phone: text('phone').notNull().default(''),
  notes: text('notes').notNull().default(''),
  createdAt: text('createdAt')
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text('updatedAt')
    .notNull()
    .default(sql`(datetime('now'))`)
})

/**
 * ClientHistory — Append-only audit log for client changes.
 */
export const clientHistory = sqliteTable(
  'ClientHistory',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    clientId: integer('clientId')
      .notNull()
      .references(() => clients.id),
    fieldName: text('fieldName').notNull(),
    oldValue: text('oldValue').notNull(),
    newValue: text('newValue').notNull(),
    changedAt: text('changedAt')
      .notNull()
      .default(sql`(datetime('now'))`)
  },
  (table) => [index('ClientHistory_clientId_idx').on(table.clientId)]
)
