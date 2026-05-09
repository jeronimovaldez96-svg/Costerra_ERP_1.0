// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Supplier Repository
// Drizzle queries for the Supplier entity.
// ────────────────────────────────────────────────────────

import { eq, desc, asc, like, or, sql, getTableColumns } from 'drizzle-orm'
import { getDb } from '../database/client'
import { suppliers, supplierHistory } from '../../shared/schema'
import type { Supplier, SupplierInsert, SupplierWithHistory, PaginatedResult, LoosePartial } from '../../shared/types'
import { logEntityChanges } from './audit.repository'

export function listSuppliers(
  page: number,
  pageSize: number,
  search: string,
  sortBy?: string,
  sortDir?: 'asc' | 'desc'
): PaginatedResult<Supplier> {
  const db = getDb()
  const offset = (page - 1) * pageSize

  let whereClause = undefined
  if (search.trim().length > 0) {
    const term = `%${search}%`
    whereClause = or(like(suppliers.name, term), like(suppliers.contactName, term), like(suppliers.email, term))
  }

  let orderClause = desc(suppliers.createdAt)
  if (sortBy !== undefined && sortBy !== '') {
    const columns = getTableColumns(suppliers)
    const column = columns[sortBy as keyof typeof columns]
    if (column !== undefined) {
      orderClause = sortDir === 'asc' ? asc(column) : desc(column)
    }
  }

  const totalRes = db.select({ count: sql<number>`count(*)` }).from(suppliers).where(whereClause).get()
  const items = db
    .select()
    .from(suppliers)
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

export function getSupplier(id: number): SupplierWithHistory | null {
  const db = getDb()
  const supplier = db.select().from(suppliers).where(eq(suppliers.id, id)).get()

  if (supplier === undefined) return null

  const history = db
    .select()
    .from(supplierHistory)
    .where(eq(supplierHistory.supplierId, id))
    .orderBy(desc(supplierHistory.changedAt))
    .all()

  return {
    ...supplier,
    history
  }
}

export function createSupplier(data: SupplierInsert): Supplier {
  const db = getDb()
  const created = db.insert(suppliers).values(data).returning().get()
  return created
}

export function updateSupplier(id: number, data: LoosePartial<SupplierInsert>): Supplier {
  const db = getDb()

  return db.transaction((tx) => {
    const old = tx.select().from(suppliers).where(eq(suppliers.id, id)).get()
    if (old === undefined) throw new Error(`Supplier with ID ${id.toString()} not found`)

    logEntityChanges(tx, 'supplier', id, old, { ...old, ...data })

    const updated = tx
      .update(suppliers)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(suppliers.id, id))
      .returning()
      .get()

    return updated
  })
}
