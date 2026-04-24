// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Supplier Schema (Drizzle ORM)
// ────────────────────────────────────────────────────────

import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

/**
 * Supplier — Vendor entity for purchase orders.
 */
export const suppliers = sqliteTable('Supplier', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  contactName: text('contactName').notNull().default(''),
  phone: text('phone').notNull().default(''),
  email: text('email').notNull().default(''),
  notes: text('notes').notNull().default(''),
  createdAt: text('createdAt')
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text('updatedAt')
    .notNull()
    .default(sql`(datetime('now'))`)
})

/**
 * SupplierHistory — Append-only audit log for supplier changes.
 */
export const supplierHistory = sqliteTable(
  'SupplierHistory',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    supplierId: integer('supplierId')
      .notNull()
      .references(() => suppliers.id),
    fieldName: text('fieldName').notNull(),
    oldValue: text('oldValue').notNull(),
    newValue: text('newValue').notNull(),
    changedAt: text('changedAt')
      .notNull()
      .default(sql`(datetime('now'))`)
  },
  (table) => [index('SupplierHistory_supplierId_idx').on(table.supplierId)]
)
