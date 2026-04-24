// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Inventory Schema (Drizzle ORM)
// FIFO double-entry ledger with working reservations.
// ────────────────────────────────────────────────────────

import { sqliteTable, text, integer, real, index } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { products } from './product'
import { purchaseOrderItems } from './purchase-order'

/**
 * InventoryBatch — Each batch represents a single inventory receipt.
 * FIFO deduction iterates batches oldest-first by receivedAt.
 *
 * Available stock = remainingQty - reservedQty
 * reservedQty is incremented when a Quote transitions to SENT,
 * and decremented on rejection/cancellation or converted on sale.
 *
 * isReturnBatch marks batches created from return re-stocking,
 * preserving FIFO integrity while tracking provenance.
 */
export const inventoryBatches = sqliteTable(
  'InventoryBatch',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    productId: integer('productId')
      .notNull()
      .references(() => products.id),
    purchaseOrderItemId: integer('purchaseOrderItemId')
      .notNull()
      .references(() => purchaseOrderItems.id),
    initialQty: integer('initialQty').notNull(),
    remainingQty: integer('remainingQty').notNull(),
    reservedQty: integer('reservedQty').notNull().default(0),
    unitCost: real('unitCost').notNull(),
    isReturnBatch: integer('isReturnBatch', { mode: 'boolean' }).notNull().default(false),
    receivedAt: text('receivedAt')
      .notNull()
      .default(sql`(datetime('now'))`)
  },
  (table) => [
    index('InventoryBatch_productId_receivedAt_idx').on(table.productId, table.receivedAt),
    index('InventoryBatch_purchaseOrderItemId_idx').on(table.purchaseOrderItemId)
  ]
)
