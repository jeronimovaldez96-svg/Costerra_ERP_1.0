// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Inventory Repository
// Handles FIFO Inventory Batches and Availability aggregation
// ────────────────────────────────────────────────────────

import { eq, sql } from 'drizzle-orm'
import { getDb, type DbTransaction } from '../database/client'
import { inventoryBatches } from '../../shared/schema'
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
export function getInventorySummary(
  search = '',
  sortBy?: string,
  sortDir?: 'asc' | 'desc'
): InventorySummary[] {
  const db = getDb()

  let whereClause = ''
  if (search.trim().length > 0) {
    const term = `%${search}%`
    // Manual where clause for raw query
    whereClause = `
      WHERE p.name LIKE '${term}'
      OR p.skuNumber LIKE '${term}'
      OR p.productGroup LIKE '${term}'
    `
  }

  let orderClause = 'ORDER BY p.name ASC'
  if (sortBy !== undefined && sortBy !== '') {
    const dir = sortDir === 'desc' ? 'DESC' : 'ASC'
    if (sortBy === 'productName') orderClause = `ORDER BY p.name ${dir}`
    else if (sortBy === 'skuNumber') orderClause = `ORDER BY p.skuNumber ${dir}`
    else if (sortBy === 'availableUnits') orderClause = `ORDER BY availableUnits ${dir}`
    else if (sortBy === 'reservedUnits') orderClause = `ORDER BY reservedUnits ${dir}`
    else if (sortBy === 'avgUnitCost') orderClause = `ORDER BY avgUnitCost ${dir}`
    else if (sortBy === 'totalStockValue') orderClause = `ORDER BY totalStockValue ${dir}`
  }

  const query = sql.raw(`
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
    ${whereClause}
    GROUP BY p.id
    ${orderClause}
  `)

  const rows = db.all(query)
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
 * Reconciles inventory reservations for a product.
 * positive quantityDelta: reserves stock (Draft -> Sent)
 * negative quantityDelta: releases stock (Sent -> Rejected/Expired)
 */
export function modifyReservations(tx: DbTransaction, productId: number, quantityDelta: number) {
  if (quantityDelta === 0) return

  // Need to increase reservations (e.g. quote sent)
  if (quantityDelta > 0) {
    let pending = quantityDelta
    
    // Ordered ASC (FIFO for reservations)
    const query = sql`
      SELECT id, remainingQty, reservedQty
      FROM InventoryBatch
      WHERE productId = ${productId} AND remainingQty > reservedQty
      ORDER BY receivedAt ASC;
    `
    const batches = tx.all(query) as unknown as { id: number, remainingQty: number, reservedQty: number }[]

    for (const batch of batches) {
      if (pending <= 0) break

      const availableInBatch = batch.remainingQty - batch.reservedQty
      const toTake = Math.min(pending, availableInBatch)

      tx.run(sql`
        UPDATE InventoryBatch
        SET reservedQty = reservedQty + ${toTake}
        WHERE id = ${batch.id}
      `)
      pending -= toTake
    }

    if (pending > 0) {
      throw new Error(`Insufficient available stock for Product ${productId.toString()}. Failed to reserve ${pending.toString()} units.`)
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
    const reservedBatches = tx.all(query) as unknown as { id: number, reservedQty: number }[]

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
      throw new Error(`Integrity Exception: Attempted to release more reservations than currently held for Product ${productId.toString()}.`)
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
  const batches = tx.all(query) as unknown as { id: number, remainingQty: number, unitCost: number }[]

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
    throw new Error(`Insufficient physical stock for Product ${productId.toString()}. Short by ${pending.toString()} units.`)
  }

  // Blended weighted-average cost across consumed batches
  return totalCost / quantity
}
