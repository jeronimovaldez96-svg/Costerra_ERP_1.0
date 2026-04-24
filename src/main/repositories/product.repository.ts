// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Product Repository
// Drizzle queries for the Product entity.
// ────────────────────────────────────────────────────────

import { eq, desc, like, or, sql } from 'drizzle-orm'
import { getDb } from '../database/client'
import { products, productHistory } from '../../shared/schema'
import type { Product, ProductInsert, ProductWithHistory, PaginatedResult } from '../../shared/types'
import { logEntityChanges } from './audit.repository'

export async function listProducts(
  page: number,
  pageSize: number,
  search: string
): Promise<PaginatedResult<Product>> {
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

  // Execute count and data queries in parallel
  const [totalRes, items] = await Promise.all([
    db
      .select({ count: sql<number>`count(*)` })
      .from(products)
      .where(whereClause),
    db
      .select()
      .from(products)
      .where(whereClause)
      .orderBy(desc(products.createdAt))
      .limit(pageSize)
      .offset(offset)
  ])

  const total = totalRes[0]?.count ?? 0

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  }
}

export async function getProduct(id: number): Promise<ProductWithHistory | null> {
  const db = getDb()
  const [product] = await db.select().from(products).where(eq(products.id, id))

  if (product === undefined) return null

  const history = await db
    .select()
    .from(productHistory)
    .where(eq(productHistory.productId, id))
    .orderBy(desc(productHistory.changedAt))

  return {
    ...product,
    history
  }
}

export async function createProduct(data: ProductInsert): Promise<Product> {
  const db = getDb()
  const [created] = await db.insert(products).values(data).returning()
  if (created === undefined) throw new Error('Failed to create product')
  return created
}

export async function updateProduct(id: number, data: Partial<ProductInsert>): Promise<Product> {
  const db = getDb()

  return db.transaction((tx) => {
    const old = tx.select().from(products).where(eq(products.id, id)).get()
    if (old === undefined) throw new Error(`Product with ID ${id} not found`)

    logEntityChanges(tx, 'product', id, old, { ...old, ...data })

    const updated = tx
      .update(products)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(products.id, id))
      .returning()
      .get()

    if (updated === undefined) throw new Error(`Failed to update product ${id}`)
    return updated
  })
}

export async function toggleProductActive(id: number): Promise<Product> {
  const db = getDb()

  return db.transaction((tx) => {
    const old = tx.select().from(products).where(eq(products.id, id)).get()
    if (old === undefined) throw new Error(`Product with ID ${id} not found`)

    const nextState = !old.isActive
    logEntityChanges(tx, 'product', id, old, { ...old, isActive: nextState })

    const updated = tx
      .update(products)
      .set({ isActive: nextState, updatedAt: new Date().toISOString() })
      .where(eq(products.id, id))
      .returning()
      .get()

    if (updated === undefined) throw new Error(`Failed to toggle product ${id}`)
    return updated
  })
}
