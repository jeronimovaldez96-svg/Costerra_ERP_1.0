// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Quote Schema (Drizzle ORM)
// Quote lifecycle: DRAFT → SENT → SOLD | REJECTED | NOT_SOLD
// Tax is applied at the sale/quote level via TaxProfile.
// Versioning: automatic snapshot on DRAFT → SENT.
// ────────────────────────────────────────────────────────

import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { salesLeads } from './sales-lead'
import { products } from './product'
import { taxProfiles } from './tax'

/**
 * Quote — A pricing proposal attached to a SalesLead.
 * Tax is applied at the quote level via a TaxProfile reference.
 */
export const quotes = sqliteTable(
  'Quote',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    quoteNumber: text('quoteNumber').notNull().unique(),
    salesLeadId: integer('salesLeadId')
      .notNull()
      .references(() => salesLeads.id),
    status: text('status').notNull().default('DRAFT'),
    notes: text('notes').notNull().default(''),
    taxProfileId: integer('taxProfileId').references(() => taxProfiles.id),
    taxAmount: real('taxAmount').notNull().default(0),
    createdAt: text('createdAt')
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text('updatedAt')
      .notNull()
      .default(sql`(datetime('now'))`)
  },
  (table) => [
    index('Quote_salesLeadId_idx').on(table.salesLeadId),
    index('Quote_status_idx').on(table.status)
  ]
)

/**
 * QuoteLineItem — Individual product line within a Quote.
 * Price overrides do NOT modify the master Product data.
 */
export const quoteLineItems = sqliteTable(
  'QuoteLineItem',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    quoteId: integer('quoteId')
      .notNull()
      .references(() => quotes.id, { onDelete: 'cascade' }),
    productId: integer('productId')
      .notNull()
      .references(() => products.id),
    quantity: integer('quantity').notNull(),
    unitPrice: real('unitPrice').notNull(),
    unitCost: real('unitCost').notNull(),
    lineTotal: real('lineTotal').notNull()
  },
  (table) => [
    index('QuoteLineItem_quoteId_idx').on(table.quoteId),
    index('QuoteLineItem_productId_idx').on(table.productId)
  ]
)

/**
 * QuoteVersion — Automatic snapshot created on DRAFT → SENT transition.
 * Stores the complete state of the quote at that point in time as JSON.
 */
export const quoteVersions = sqliteTable(
  'QuoteVersion',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    quoteId: integer('quoteId')
      .notNull()
      .references(() => quotes.id),
    versionNumber: integer('versionNumber').notNull(),
    snapshot: text('snapshot').notNull(),
    createdAt: text('createdAt')
      .notNull()
      .default(sql`(datetime('now'))`)
  },
  (table) => [index('QuoteVersion_quoteId_idx').on(table.quoteId)]
)
