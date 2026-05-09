// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Inventory Service
// ────────────────────────────────────────────────────────

import * as invRepo from '../repositories/inventory.repository'
import type { InventoryBatch, InventorySummary, ListParams } from '../../shared/types'

export async function getInventorySummary(params?: ListParams): Promise<InventorySummary[]> {
  return invRepo.getInventorySummary(params?.search, params?.sortBy, params?.sortDir)
}

export async function listInventoryBatchesByProduct(productId: number): Promise<InventoryBatch[]> {
  return invRepo.listInventoryBatchesByProduct(productId)
}

/**
 * Adjusts inventory reservations for a product.
 * Primarily used by Quote/Sales pipelines automatically, exposed here for direct orchestration if needed.
 */
export async function adjustInventoryReservation(productId: number, quantityDelta: number): Promise<void> {
  const db = (await import('../database/client')).getDb()
  
  return db.transaction((tx) => {
    invRepo.modifyReservations(tx, productId, quantityDelta)
  })
}
