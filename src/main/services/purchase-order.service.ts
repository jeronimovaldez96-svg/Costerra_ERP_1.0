// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Purchase Order Service
// Maps strict logic bounds to Drizzle queries.
// ────────────────────────────────────────────────────────

import * as poRepo from '../repositories/purchase-order.repository'
import * as invRepo from '../repositories/inventory.repository'
import { generateId } from '../utils/id-generator'
import { getDb } from '../database/client'
import type {
  PurchaseOrder,
  PurchaseOrderWithItems,
  PurchaseOrderInsert,
  PurchaseOrderItemInsert,
  PaginatedResult,
  ListParams,
  LoosePartial
} from '../../shared/types'

export async function listPurchaseOrders(params: ListParams): Promise<PaginatedResult<PurchaseOrder>> {
  return poRepo.listPurchaseOrders(params)
}

export async function getPurchaseOrder(id: number): Promise<PurchaseOrderWithItems> {
  const po = poRepo.getPurchaseOrder(id)
  if (!po) throw new Error(`Purchase Order ${id} not found`)
  return po
}

export async function createPurchaseOrder(
  data: LoosePartial<Omit<PurchaseOrderInsert, 'id' | 'poNumber' | 'status' | 'createdAt' | 'updatedAt'>>,
  items: Omit<PurchaseOrderItemInsert, 'id' | 'purchaseOrderId'>[]
): Promise<PurchaseOrder> {
  const poNumber = await generateId('PO')
  return poRepo.createPurchaseOrder({ ...data, poNumber }, items)
}

export async function updatePurchaseOrder(
  id: number,
  data: LoosePartial<PurchaseOrderInsert>,
  items?: Omit<PurchaseOrderItemInsert, 'id' | 'purchaseOrderId'>[]
): Promise<PurchaseOrder> {
  return poRepo.updatePurchaseOrder(id, data, items)
}

/**
 * Highly strict status transit. Moving from IN_TRANSIT to DELIVERED triggers inventory lifecycle atomically.
 */
import { purchaseOrderItems } from '../../shared/schema'
import { eq } from 'drizzle-orm'

export async function transitionPurchaseOrder(id: number, nextStatus: 'ORDERED' | 'IN_TRANSIT' | 'DELIVERED' | 'IN_INVENTORY'): Promise<PurchaseOrder> {
  const db = getDb()

  return db.transaction((tx) => {
    // 1. Advance the Status
    const po = poRepo.updatePOStatus(tx, id, nextStatus)

    // 2. State-Specific Validations & Side-Effects
    if (nextStatus === 'ORDERED') {
      const itemsQuery = tx.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, id)).all()
      if (itemsQuery.length === 0) {
        throw new Error('A Purchase Order must contain at least one line item to enter ORDERED')
      }
    }

    if (nextStatus === 'IN_INVENTORY') {
      // Push received line items cleanly into the double entry list
      const itemsQuery = tx.select().from(purchaseOrderItems).where(eq(purchaseOrderItems.purchaseOrderId, id)).all()
      
      const inventoryMapping = itemsQuery.map(m => ({
        purchaseOrderItemId: m.id,
        productId: m.productId,
        quantity: m.quantity,
        unitCost: m.unitCost
      }))

      invRepo.receivePurchaseOrderItems(tx, inventoryMapping)
    }

    return po
  })
}
