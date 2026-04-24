// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Purchase Order Schema (Drizzle ORM)
// State machine: DRAFT → IN_TRANSIT → DELIVERED
// Line items are editable while PO is in DRAFT status.
// ────────────────────────────────────────────────────────

import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'
import { suppliers } from './supplier'
import { products } from './product'

/**
 * PurchaseOrder — Procurement document with state machine lifecycle.
 */
export const purchaseOrders = sqliteTable(
  'PurchaseOrder',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    poNumber: text('poNumber').notNull().unique(),
    supplierId: integer('supplierId')
      .notNull()
      .references(() => suppliers.id),
    description: text('description').notNull().default(''),
    status: text('status').notNull().default('DRAFT'),
    createdAt: text('createdAt')
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text('updatedAt')
      .notNull()
      .default(sql`(datetime('now'))`)
  },
  (table) => [
    index('PurchaseOrder_supplierId_idx').on(table.supplierId),
    index('PurchaseOrder_status_idx').on(table.status)
  ]
)

/**
 * PurchaseOrderItem — Line items within a PO.
 * Editable only while the parent PO is in DRAFT status.
 */
export const purchaseOrderItems = sqliteTable(
  'PurchaseOrderItem',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    purchaseOrderId: integer('purchaseOrderId')
      .notNull()
      .references(() => purchaseOrders.id),
    productId: integer('productId')
      .notNull()
      .references(() => products.id),
    quantity: integer('quantity').notNull(),
    unitCost: real('unitCost').notNull()
  },
  (table) => [
    index('PurchaseOrderItem_purchaseOrderId_idx').on(table.purchaseOrderId),
    index('PurchaseOrderItem_productId_idx').on(table.productId)
  ]
)
