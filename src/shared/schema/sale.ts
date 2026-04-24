// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Sale Schema (Drizzle ORM)
// Sales ledger with FIFO-blended cost tracking.
// ────────────────────────────────────────────────────────

import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { quotes } from './quote'
import { products } from './product'
import { taxProfiles } from './tax'

/**
 * Sale — A finalized transaction created from a Quote.
 * Records revenue, cost, tax, and profit at the point of sale.
 * Tax is applied at the sale level via TaxProfile snapshot.
 */
export const sales = sqliteTable(
  'Sale',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    saleNumber: text('saleNumber').notNull().unique(),
    quoteId: integer('quoteId')
      .notNull()
      .unique()
      .references(() => quotes.id),
    totalRevenue: real('totalRevenue').notNull(),
    taxProfileId: integer('taxProfileId').references(() => taxProfiles.id),
    taxAmount: real('taxAmount').notNull().default(0),
    totalCost: real('totalCost').notNull(),
    profitAmount: real('profitAmount').notNull(),
    profitMargin: real('profitMargin').notNull(),
    saleDate: text('saleDate')
      .notNull()
      .default(sql`(datetime('now'))`)
  },
  (table) => [index('Sale_saleDate_idx').on(table.saleDate)]
)

/**
 * SaleLineItem — Per-product breakdown within a Sale.
 * blendedUnitCost is the mathematically pure FIFO-weighted average.
 */
export const saleLineItems = sqliteTable(
  'SaleLineItem',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    saleId: integer('saleId')
      .notNull()
      .references(() => sales.id),
    productId: integer('productId')
      .notNull()
      .references(() => products.id),
    quantity: integer('quantity').notNull(),
    unitPrice: real('unitPrice').notNull(),
    blendedUnitCost: real('blendedUnitCost').notNull(),
    lineRevenue: real('lineRevenue').notNull(),
    lineCost: real('lineCost').notNull(),
    lineProfit: real('lineProfit').notNull()
  },
  (table) => [
    index('SaleLineItem_saleId_idx').on(table.saleId),
    index('SaleLineItem_productId_idx').on(table.productId)
  ]
)
