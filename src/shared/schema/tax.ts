// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Tax Schema (Drizzle ORM)
// Tax Profiles: reusable named configurations with
// multiple tax components (e.g., Sales Tax + VAT).
// Applied at the quote/sale level, not per line item.
// ────────────────────────────────────────────────────────

import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

/**
 * TaxProfile — A reusable tax configuration.
 * Examples: "New York (8.875%)", "EU Standard (21% VAT)".
 * Can contain multiple tax components via TaxProfileComponent.
 */
export const taxProfiles = sqliteTable('TaxProfile', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique(),
  description: text('description').notNull().default(''),
  isActive: integer('isActive', { mode: 'boolean' }).notNull().default(true),
  createdAt: text('createdAt')
    .notNull()
    .default(sql`(datetime('now'))`),
  updatedAt: text('updatedAt')
    .notNull()
    .default(sql`(datetime('now'))`)
})

/**
 * TaxProfileComponent — Individual tax component within a profile.
 * A profile can have multiple components (e.g., State Tax + City Tax).
 * The effective rate is SUM of all component rates.
 */
export const taxProfileComponents = sqliteTable(
  'TaxProfileComponent',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    taxProfileId: integer('taxProfileId')
      .notNull()
      .references(() => taxProfiles.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    rate: real('rate').notNull(),
    type: text('type').notNull().default('PERCENTAGE')
  },
  (table) => [index('TaxProfileComponent_taxProfileId_idx').on(table.taxProfileId)]
)
