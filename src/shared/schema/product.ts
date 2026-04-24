// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Product Schema (Drizzle ORM)
// Defines Product and ProductHistory tables.
// ────────────────────────────────────────────────────────

import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

/**
 * Product — Core product catalog entity.
 * Supports product grouping, family classification, and soft-delete via isActive.
 */
export const products = sqliteTable(
  'Product',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    skuNumber: text('skuNumber').notNull().unique(),
    productGroup: text('productGroup').notNull(),
    productFamily: text('productFamily').notNull(),
    name: text('name').notNull(),
    color: text('color').notNull(),
    imagePath: text('imagePath'),
    defaultUnitCost: real('defaultUnitCost').notNull(),
    defaultUnitPrice: real('defaultUnitPrice').notNull(),
    isActive: integer('isActive', { mode: 'boolean' }).notNull().default(true),
    createdAt: text('createdAt')
      .notNull()
      .default(sql`(datetime('now'))`),
    updatedAt: text('updatedAt')
      .notNull()
      .default(sql`(datetime('now'))`)
  },
  (table) => [
    index('Product_isActive_idx').on(table.isActive),
    index('Product_productGroup_idx').on(table.productGroup),
    index('Product_productFamily_idx').on(table.productFamily)
  ]
)

/**
 * ProductHistory — Append-only audit log.
 * Records every field-level change on a Product with old/new values.
 */
export const productHistory = sqliteTable(
  'ProductHistory',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    productId: integer('productId')
      .notNull()
      .references(() => products.id),
    fieldName: text('fieldName').notNull(),
    oldValue: text('oldValue').notNull(),
    newValue: text('newValue').notNull(),
    changedAt: text('changedAt')
      .notNull()
      .default(sql`(datetime('now'))`)
  },
  (table) => [index('ProductHistory_productId_idx').on(table.productId)]
)
