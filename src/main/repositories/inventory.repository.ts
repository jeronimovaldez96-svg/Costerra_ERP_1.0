// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Inventory Repository
// Handles FIFO Inventory Batches and Availability aggregation
// ────────────────────────────────────────────────────────

import { eq, sql } from 'drizzle-orm'
import { getDb, type DbTransaction } from '../database/client'
import { inventoryBatches, products } from '../../shared/schema'
import type { InventoryBatch, InventorySummary } from '../../shared/types'

/**
 * Sweeps a completed PO line items and receives them strictly into the double-entry FIFO ledger.
 */
export function receivePurchaseOrderItems(tx: DbTransaction, items: { purchaseOrderItemId: number, productId: number, quantity: number, unitCost: number }[]): void {
  for (const item of items) {
    tx.insert(inventoryBatches).values({
      productId: item.productId,
      purchaseOrderItemId: item.purchaseOrderItemId,
      initialQty: item.quantity,
      remainingQty: item.quantity,
      unitCost: item.unitCost,
      isReturnBatch: false
    }).run()
  }
}

/**
 * Aggregates high-level inventory availability (remainingQty - reservedQty) uniquely grouped by Product.
 */
export function getInventorySummary(): InventorySummary[] {
  const db = getDb()

  const query = sql`
    SELECT 
      p.id AS productId,
      p.skuNumber,
      p.name AS productName,
      p.productGroup,
      p.productFamily,
      p.color,
      COALESCE(SUM(b.remainingQty), 0) AS totalUnits,
      COALESCE(SUM(b.reservedQty), 0) AS reservedUnits,
      COALESCE(SUM(b.remainingQty) - SUM(b.reservedQty), 0) AS availableUnits,
      CASE WHEN SUM(b.remainingQty) > 0 
        THEN SUM(b.remainingQty * b.unitCost) / SUM(b.remainingQty) 
        ELSE 0 
      END AS avgUnitCost,
      COALESCE(SUM(b.remainingQty * b.unitCost), 0) AS totalStockValue
    FROM Product p
    LEFT JOIN InventoryBatch b ON p.id = b.productId
    GROUP BY p.id
    ORDER BY p.name ASC;
  `

  const rows = db.all(query)
  // Typecast SQL output manually due to raw aggregate complexity. SQLite driver naturally uses integers and floats natively.
  return rows as InventorySummary[]
}

export function listInventoryBatchesByProduct(productId: number): InventoryBatch[] {
  const db = getDb()
  return db.select()
    .from(inventoryBatches)
    .where(eq(inventoryBatches.productId, productId))
    .all()
}

/**
 * Sweeps batches using strict oldest-first FIFO.
 * Alters reservedQty allowing soft locks on available stock.
 */
export function modifyReservations(tx: DbTransaction, productId: number, quantityDelta: number): void {
  if (quantityDelta === 0) return

  // Need to increment reservations
  if (quantityDelta > 0) {
    let pending = quantityDelta
    
    // Find batches that actually have available unreserved stock (remainingQty - reservedQty) > 0
    // Ordered by receivedAt ASC to maintain FIFO valuation.
    const query = sql`
      SELECT id, (remainingQty - reservedQty) AS available
      FROM InventoryBatch
      WHERE productId = ${productId} AND (remainingQty - reservedQty) > 0
      ORDER BY receivedAt ASC;
    `
    const availableBatches = tx.all(query) as { id: number, available: number }[]

    for (const batch of availableBatches) {
      if (pending <= 0) break
      
      const toTake = Math.min(pending, batch.available)
      tx.run(sql`
        UPDATE InventoryBatch
        SET reservedQty = reservedQty + ${toTake}
        WHERE id = ${batch.id}
      `)
      pending -= toTake
    }

    if (pending > 0) {
      throw new Error(`Insufficient available stock for Product ${productId}. Failed to reserve ${pending} units.`)
    }
  } 
  
  // Need to decrement reservations (e.g. quote expired / rejected / sold natively)
  if (quantityDelta < 0) {
    let pendingFree = Math.abs(quantityDelta)
    
    // Ordered DESC (LIFO for removals) so we free up the newest batches first and keep the oldest batches maximally reserved.
    const query = sql`
      SELECT id, reservedQty
      FROM InventoryBatch
      WHERE productId = ${productId} AND reservedQty > 0
      ORDER BY receivedAt DESC;
    `
    const reservedBatches = tx.all(query) as { id: number, reservedQty: number }[]

    for (const batch of reservedBatches) {
      if (pendingFree <= 0) break

      const toFree = Math.min(pendingFree, batch.reservedQty)
      tx.run(sql`
        UPDATE InventoryBatch
        SET reservedQty = reservedQty - ${toFree}
        WHERE id = ${batch.id}
      `)
      pendingFree -= toFree
    }

    if (pendingFree > 0) {
      throw new Error(`Integrity Exception: Attempted to release more reservations than currently held for Product ${productId}.`)
    }
  }
}

/**
 * Hard FIFO consumption — irreversibly decrements remainingQty from oldest batches.
 * Returns the blended weighted-average unit cost across all consumed sub-batches.
 * Used exclusively during atomic Sale execution.
 */
export function consumeStockFifo(tx: DbTransaction, productId: number, quantity: number): number {
  if (quantity <= 0) throw new Error('Consume quantity must be positive')

  let pending = quantity
  let totalCost = 0

  const query = sql`
    SELECT id, remainingQty, unitCost
    FROM InventoryBatch
    WHERE productId = ${productId} AND remainingQty > 0
    ORDER BY receivedAt ASC;
  `
  const batches = tx.all(query) as { id: number; remainingQty: number; unitCost: number }[]

  for (const batch of batches) {
    if (pending <= 0) break

    const toConsume = Math.min(pending, batch.remainingQty)
    totalCost += toConsume * batch.unitCost

    // Decrement remaining AND reduce reserved proportionally
    tx.run(sql`
      UPDATE InventoryBatch
      SET remainingQty = remainingQty - ${toConsume},
          reservedQty = MAX(0, reservedQty - ${toConsume})
      WHERE id = ${batch.id}
    `)

    pending -= toConsume
  }

  if (pending > 0) {
    throw new Error(`Insufficient physical stock for Product ${productId}. Short by ${pending} units.`)
  }

  // Blended weighted-average cost across consumed batches
  return totalCost / quantity
}
