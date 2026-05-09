// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Product Repository
// Drizzle queries for the Product entity.
// ────────────────────────────────────────────────────────

import { eq, desc, asc, like, or, sql, getTableColumns } from 'drizzle-orm'
import { getDb } from '../database/client'
import { products, productHistory } from '../../shared/schema'
import type { Product, ProductInsert, ProductWithHistory, PaginatedResult, LoosePartial } from '../../shared/types'
import { logEntityChanges } from './audit.repository'

export function listProducts(
  page: number,
  pageSize: number,
  search: string,
  sortBy?: string,
  sortDir?: 'asc' | 'desc'
): PaginatedResult<Product> {
  const db = getDb()
  const offset = (page - 1) * pageSize

  // Build where clause
  let whereClause = undefined
  if (search.trim().length > 0) {
    const term = `%${search}%`
    whereClause = or(
      like(products.name, term),
      like(products.skuNumber, term),
      like(products.productGroup, term),
      like(products.productFamily, term)
    )
  }

  // Build order by clause
  let orderClause = desc(products.createdAt)
  if (sortBy !== undefined && sortBy !== '') {
    const columns = getTableColumns(products)
    const column = columns[sortBy as keyof typeof columns]
    if (column !== undefined) {
      orderClause = sortDir === 'asc' ? asc(column) : desc(column)
    }
  }

  // Execute count and data queries
  const totalRes = db
    .select({ count: sql<number>`count(*)` })
    .from(products)
    .where(whereClause)
    .get()
  const items = db
    .select()
    .from(products)
    .where(whereClause)
    .orderBy(orderClause)
    .limit(pageSize)
    .offset(offset)
    .all()

  const total = totalRes?.count ?? 0

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  }
}

export function getProduct(id: number): ProductWithHistory | null {
  const db = getDb()
  const product = db.select().from(products).where(eq(products.id, id)).get()

  if (product === undefined) return null

  const history = db
    .select()
    .from(productHistory)
    .where(eq(productHistory.productId, id))
    .orderBy(desc(productHistory.changedAt))
    .all()

  return {
    ...product,
    history
  }
}

export function createProduct(data: ProductInsert): Product {
  const db = getDb()
  const created = db.insert(products).values(data).returning().get()
  return created
}

export function updateProduct(id: number, data: LoosePartial<ProductInsert>): Product {
  const db = getDb()

  return db.transaction((tx) => {
    const old = tx.select().from(products).where(eq(products.id, id)).get()
    if (old === undefined) throw new Error(`Product with ID ${id.toString()} not found`)

    logEntityChanges(tx, 'product', id, old, { ...old, ...data })

    const updated = tx
      .update(products)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(products.id, id))
      .returning()
      .get()

    return updated
  })
}

export function toggleProductActive(id: number): Product {
  const db = getDb()

  return db.transaction((tx) => {
    const old = tx.select().from(products).where(eq(products.id, id)).get()
    if (old === undefined) throw new Error(`Product with ID ${id.toString()} not found`)

    const nextState = !old.isActive
    logEntityChanges(tx, 'product', id, old, { ...old, isActive: nextState })

    const updated = tx
      .update(products)
      .set({ isActive: nextState, updatedAt: new Date().toISOString() })
      .where(eq(products.id, id))
      .returning()
      .get()

    return updated
  })
}
