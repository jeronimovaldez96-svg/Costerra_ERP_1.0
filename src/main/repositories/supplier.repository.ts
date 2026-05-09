// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Supplier Repository
// Drizzle queries for the Supplier entity.
// ────────────────────────────────────────────────────────

import { eq, desc, asc, like, or, sql } from 'drizzle-orm'
import { getDb } from '../database/client'
import { suppliers, supplierHistory } from '../../shared/schema'
import type { Supplier, SupplierInsert, SupplierWithHistory, PaginatedResult } from '../../shared/types'
import { logEntityChanges } from './audit.repository'

export async function listSuppliers(
  page: number,
  pageSize: number,
  search: string,
  sortBy?: string,
  sortDir?: 'asc' | 'desc'
): Promise<PaginatedResult<Supplier>> {
  const db = getDb()
  const offset = (page - 1) * pageSize

  let whereClause = undefined
  if (search.trim().length > 0) {
    const term = `%${search}%`
    whereClause = or(like(suppliers.name, term), like(suppliers.contactName, term), like(suppliers.email, term))
  }

  let orderClause = desc(suppliers.createdAt)
  if (sortBy) {
    const column = (suppliers as any)[sortBy]
    if (column) {
      orderClause = sortDir === 'asc' ? asc(column) : desc(column)
    }
  }

  const [totalRes, items] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(suppliers).where(whereClause),
    db
      .select()
      .from(suppliers)
      .where(whereClause)
      .orderBy(orderClause)
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

export async function getSupplier(id: number): Promise<SupplierWithHistory | null> {
  const db = getDb()
  const [supplier] = await db.select().from(suppliers).where(eq(suppliers.id, id))

  if (supplier === undefined) return null

  const history = await db
    .select()
    .from(supplierHistory)
    .where(eq(supplierHistory.supplierId, id))
    .orderBy(desc(supplierHistory.changedAt))

  return {
    ...supplier,
    history
  }
}

export async function createSupplier(data: SupplierInsert): Promise<Supplier> {
  const db = getDb()
  const [created] = await db.insert(suppliers).values(data).returning()
  if (created === undefined) throw new Error('Failed to create supplier')
  return created
}

export async function updateSupplier(id: number, data: Partial<SupplierInsert>): Promise<Supplier> {
  const db = getDb()

  return db.transaction((tx) => {
    const old = tx.select().from(suppliers).where(eq(suppliers.id, id)).get()
    if (old === undefined) throw new Error(`Supplier with ID ${id} not found`)

    logEntityChanges(tx, 'supplier', id, old, { ...old, ...data })

    const updated = tx
      .update(suppliers)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(suppliers.id, id))
      .returning()
      .get()

    if (updated === undefined) throw new Error(`Failed to update supplier ${id}`)
    return updated
  })
}
