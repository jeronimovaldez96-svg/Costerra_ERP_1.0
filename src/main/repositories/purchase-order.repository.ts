// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Purchase Order Repository
// Handles atomic DB insertions for POs and locking logic.
// ────────────────────────────────────────────────────────

import { eq, desc, asc, like, or, sql, type AnyColumn } from 'drizzle-orm'
import { getDb } from '../database/client'
import { purchaseOrders, purchaseOrderItems, products, suppliers } from '../../shared/schema'
import type { 
  PurchaseOrder, 
  PurchaseOrderWithItems, 
  PurchaseOrderInsert, 
  PurchaseOrderItemInsert,
  PaginatedResult,
  LoosePartial,
  ListParams
} from '../../shared/types'

type DbTransaction = Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0]

interface FlatPORow {
  id: number
  poNumber: string
  supplierId: number
  description: string
  status: string
  createdAt: string
  updatedAt: string
  supplierName: string | null
}

export function listPurchaseOrders(params: ListParams): PaginatedResult<PurchaseOrder> {
  const db = getDb()
  const { page = 1, pageSize = 50, search = '', sortBy, sortDir } = params
  const offset = (page - 1) * pageSize

  // Simplified where logic since SQLite `like` allows text filtering
  let whereClause = undefined
  if (search.trim().length > 0) {
    const s = `%${search}%`
    whereClause = or(
      like(purchaseOrders.poNumber, s),
      like(purchaseOrders.description, s),
      like(suppliers.name, s)
    )
  }

  let orderClause = desc(purchaseOrders.id)
  if (sortBy !== undefined && sortBy !== '') {
    const column = (purchaseOrders as any)[sortBy]
    if (column !== undefined && column !== null) {
      orderClause = sortDir === 'asc' ? asc(column as AnyColumn) : desc(column as AnyColumn)
    }
  }

  const totalRes = db.select({ count: sql<number>`count(*)` })
    .from(purchaseOrders)
    .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
    .where(whereClause)
    .get()
  const rows = db
    .select({
      id: purchaseOrders.id,
      poNumber: purchaseOrders.poNumber,
      supplierId: purchaseOrders.supplierId,
      description: purchaseOrders.description,
      status: purchaseOrders.status,
      createdAt: purchaseOrders.createdAt,
      updatedAt: purchaseOrders.updatedAt,
      supplierName: suppliers.name
    })
    .from(purchaseOrders)
    .leftJoin(suppliers, eq(purchaseOrders.supplierId, suppliers.id))
    .where(whereClause)
    .orderBy(orderClause)
    .limit(pageSize)
    .offset(offset)
    .all() as FlatPORow[]

  const total = totalRes?.count ?? 0
  const items = rows.map((row: FlatPORow) => ({
    ...row,
    supplier: {
      name: row.supplierName ?? ''
    }
  }))

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  }
}

export function getPurchaseOrder(id: number): PurchaseOrderWithItems | null {
  const db = getDb()

  const po = db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id)).get()
  if (!po) return null

  const supplier = db.select().from(suppliers).where(eq(suppliers.id, po.supplierId)).get()
  if (supplier === undefined) throw new Error(`Supplier ${po.supplierId.toString()} missing for PO ${id.toString()}`)

  const rawItems = db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, id)).all()
  
  const items = rawItems.map(item => {
    const product = db.select().from(products).where(eq(products.id, item.productId)).get()
    if (product === undefined) throw new Error(`Product ${item.productId.toString()} missing for PO item ${item.id.toString()}`)
    return { ...item, product }
  })

  return {
    ...po,
    supplier,
    items
  }
}

export function createPurchaseOrder(
  poData: LoosePartial<Omit<PurchaseOrderInsert, 'id'>>, 
  itemsData: Omit<PurchaseOrderItemInsert, 'id' | 'purchaseOrderId'>[]
): PurchaseOrder {
  const db = getDb()

  return db.transaction((tx) => {
    const po = tx.insert(purchaseOrders).values(poData as PurchaseOrderInsert).returning().get()
    if (itemsData.length > 0) {
      tx.insert(purchaseOrderItems).values(
        itemsData.map(item => ({ ...item, purchaseOrderId: po.id }))
      ).run()
    }

    return po
  })
}

export function updatePurchaseOrder(
  id: number,
  poData: LoosePartial<PurchaseOrderInsert>,
  itemsData?: Omit<PurchaseOrderItemInsert, 'id' | 'purchaseOrderId'>[]
): PurchaseOrder {
  const db = getDb()

  return db.transaction((tx) => {
    const old = tx.select().from(purchaseOrders).where(eq(purchaseOrders.id, id)).get()
    if (old === undefined) throw new Error(`Purchase Order ${id.toString()} not found`)
    if (old.status !== 'DRAFT') throw new Error(`Cannot modify Purchase Order ${id.toString()} because it is in status ${old.status}`)

    const updated = tx.update(purchaseOrders)
      .set({ ...poData, updatedAt: sql`(datetime('now'))` })
      .where(eq(purchaseOrders.id, id))
      .returning()
      .get()
    
    if (itemsData) {
      // Complete replacement of line items while in DRAFT
      tx.delete(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, id)).run()
      tx.insert(purchaseOrderItems).values(
        itemsData.map(item => ({ ...item, purchaseOrderId: id }))
      ).run()
    }

    return updated
  })
}

export function updatePOStatus(tx: DbTransaction, id: number, nextStatus: 'ORDERED' | 'IN_TRANSIT' | 'DELIVERED' | 'IN_INVENTORY'): PurchaseOrder {
  const old = tx.select().from(purchaseOrders).where(eq(purchaseOrders.id, id)).get()
  if (old === undefined) throw new Error(`Purchase Order ${id.toString()} not found`)

  // Strict valid transitions
  if (nextStatus === 'ORDERED' && old.status !== 'DRAFT') {
    throw new Error(`Cannot transition PO ${id.toString()} to 'ORDERED' from '${old.status}'`)
  }
  if (nextStatus === 'IN_TRANSIT' && old.status !== 'ORDERED') {
    throw new Error(`Cannot transition PO ${id.toString()} to 'IN_TRANSIT' from '${old.status}'`)
  }
  if (nextStatus === 'DELIVERED' && old.status !== 'IN_TRANSIT') {
    throw new Error(`Cannot transition PO ${id.toString()} to 'DELIVERED' from '${old.status}'`)
  }
  if (nextStatus === 'IN_INVENTORY' && old.status !== 'DELIVERED') {
    throw new Error(`Cannot transition PO ${id.toString()} to 'IN_INVENTORY' from '${old.status}'`)
  }

  const updated = tx.update(purchaseOrders)
    .set({ status: nextStatus, updatedAt: sql`(datetime('now'))` })
    .where(eq(purchaseOrders.id, id))
    .returning()
    .get()
    
  return updated
}
