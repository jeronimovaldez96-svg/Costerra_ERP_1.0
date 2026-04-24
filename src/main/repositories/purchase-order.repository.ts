// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Purchase Order Repository
// Handles atomic DB insertions for POs and locking logic.
// ────────────────────────────────────────────────────────

import { eq, desc, sql } from 'drizzle-orm'
import { getDb } from '../database/client'
import { purchaseOrders, purchaseOrderItems, products, suppliers } from '../../shared/schema'
import type { 
  PurchaseOrder, 
  PurchaseOrderWithItems, 
  PurchaseOrderInsert, 
  PurchaseOrderItemInsert,
  PaginatedResult 
} from '../../shared/types'

type DbTransaction = Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0]

export function listPurchaseOrders(
  page: number,
  pageSize: number,
  search: string
): PaginatedResult<PurchaseOrder> {
  const db = getDb()
  const offset = (page - 1) * pageSize

  // Simplified where logic since SQLite `like` allows text filtering
  let whereClause = undefined
  if (search.trim().length > 0) {
    const term = `%${search}%`
    whereClause = sql`${purchaseOrders.poNumber} LIKE ${term} OR ${purchaseOrders.description} LIKE ${term}`
  }

  const totalRes = db.select({ count: sql<number>`count(*)` }).from(purchaseOrders).where(whereClause).get()
  const items = db
    .select()
    .from(purchaseOrders)
    .where(whereClause)
    .orderBy(desc(purchaseOrders.createdAt))
    .limit(pageSize)
    .offset(offset)
    .all()

  return {
    items,
    total: totalRes?.count ?? 0,
    page,
    pageSize,
    totalPages: Math.ceil((totalRes?.count ?? 0) / pageSize)
  }
}

export function getPurchaseOrder(id: number): PurchaseOrderWithItems | null {
  const db = getDb()

  const po = db.select().from(purchaseOrders).where(eq(purchaseOrders.id, id)).get()
  if (!po) return null

  const supplier = db.select().from(suppliers).where(eq(suppliers.id, po.supplierId)).get()
  if (!supplier) throw new Error(`Supplier ${po.supplierId} missing for PO ${id}`)

  const rawItems = db.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, id)).all()
  
  const items = rawItems.map(item => {
    const product = db.select().from(products).where(eq(products.id, item.productId)).get()
    if (!product) throw new Error(`Product ${item.productId} missing for PO item ${item.id}`)
    return { ...item, product }
  })

  return {
    ...po,
    supplier,
    items
  }
}

export function createPurchaseOrder(
  poData: Omit<PurchaseOrderInsert, 'id'>, 
  itemsData: Omit<PurchaseOrderItemInsert, 'id' | 'purchaseOrderId'>[]
): PurchaseOrder {
  const db = getDb()

  return db.transaction((tx) => {
    const po = tx.insert(purchaseOrders).values(poData).returning().get()
    if (!po) throw new Error('Failed to create purchase order')

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
  poData: Partial<PurchaseOrderInsert>,
  itemsData?: Omit<PurchaseOrderItemInsert, 'id' | 'purchaseOrderId'>[]
): PurchaseOrder {
  const db = getDb()

  return db.transaction((tx) => {
    const old = tx.select().from(purchaseOrders).where(eq(purchaseOrders.id, id)).get()
    if (!old) throw new Error(`Purchase Order ${id} not found`)
    if (old.status !== 'DRAFT') throw new Error(`Cannot modify Purchase Order ${id} because it is in status ${old.status}`)

    const updated = tx.update(purchaseOrders)
      .set({ ...poData, updatedAt: sql`(datetime('now'))` })
      .where(eq(purchaseOrders.id, id))
      .returning()
      .get()
    
    if (!updated) throw new Error(`Failed to update PO ${id}`)

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

export function updatePOStatus(tx: DbTransaction, id: number, nextStatus: 'IN_TRANSIT' | 'DELIVERED'): PurchaseOrder {
  const old = tx.select().from(purchaseOrders).where(eq(purchaseOrders.id, id)).get()
  if (!old) throw new Error(`Purchase Order ${id} not found`)

  // Strict valid transitions
  if (nextStatus === 'IN_TRANSIT' && old.status !== 'DRAFT') {
    throw new Error(`Cannot transition PO ${id} to 'IN_TRANSIT' from '${old.status}'`)
  }
  if (nextStatus === 'DELIVERED' && old.status !== 'IN_TRANSIT') {
    throw new Error(`Cannot transition PO ${id} to 'DELIVERED' from '${old.status}'`)
  }

  const updated = tx.update(purchaseOrders)
    .set({ status: nextStatus, updatedAt: sql`(datetime('now'))` })
    .where(eq(purchaseOrders.id, id))
    .returning()
    .get()
    
  if (!updated) throw new Error(`Failed to map PO ${id} status transition`)
  return updated
}
