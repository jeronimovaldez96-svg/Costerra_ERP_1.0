// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Return & Credit Note Schema (Drizzle ORM)
// Returns reverse FIFO deductions and generate credit notes.
// Refunds use the original transaction cost for accounting integrity.
// ────────────────────────────────────────────────────────

import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { sales, saleLineItems } from './sale'

/**
 * Return — A return request against a completed Sale.
 * Status machine: DRAFT → PROCESSED (terminal).
 * On PROCESSED: inventory is re-stocked, credit note generated.
 */
export const returns = sqliteTable(
  'Return',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    returnNumber: text('returnNumber').notNull().unique(),
    saleId: integer('saleId')
      .notNull()
      .references(() => sales.id),
    reason: text('reason').notNull().default(''),
    status: text('status').notNull().default('DRAFT'),
    totalRefund: real('totalRefund').notNull().default(0),
    createdAt: text('createdAt')
      .notNull()
      .default(sql`(datetime('now'))`),
    processedAt: text('processedAt')
  },
  (table) => [
    index('Return_saleId_idx').on(table.saleId),
    index('Return_status_idx').on(table.status)
  ]
)

/**
 * ReturnLineItem — Individual products being returned.
 * References the original SaleLineItem for cost traceability.
 * unitRefund = original blendedUnitCost from the sale (not current cost).
 */
export const returnLineItems = sqliteTable(
  'ReturnLineItem',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    returnId: integer('returnId')
      .notNull()
      .references(() => returns.id, { onDelete: 'cascade' }),
    saleLineItemId: integer('saleLineItemId')
      .notNull()
      .references(() => saleLineItems.id),
    quantity: integer('quantity').notNull(),
    unitRefund: real('unitRefund').notNull(),
    lineRefund: real('lineRefund').notNull()
  },
  (table) => [index('ReturnLineItem_returnId_idx').on(table.returnId)]
)

/**
 * CreditNote — Financial document generated when a Return is processed.
 * Immutable record for accounting audit trail.
 */
export const creditNotes = sqliteTable(
  'CreditNote',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    creditNoteNumber: text('creditNoteNumber').notNull().unique(),
    returnId: integer('returnId')
      .notNull()
      .unique()
      .references(() => returns.id),
    amount: real('amount').notNull(),
    issuedAt: text('issuedAt')
      .notNull()
      .default(sql`(datetime('now'))`)
  },
  (table) => [index('CreditNote_returnId_idx').on(table.returnId)]
)
