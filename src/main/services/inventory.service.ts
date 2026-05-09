// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Inventory Service
// ────────────────────────────────────────────────────────

import * as invRepo from '../repositories/inventory.repository'
import { getDb } from '../database/client'
import type { InventoryBatch, InventorySummary, ListParams } from '../../shared/types'

export function getInventorySummary(params?: ListParams): InventorySummary[] {
  return invRepo.getInventorySummary(params?.search, params?.sortBy, params?.sortDir)
}

export function listInventoryBatchesByProduct(productId: number): InventoryBatch[] {
  return invRepo.listInventoryBatchesByProduct(productId)
}

/**
 * Adjusts inventory reservations for a product.
 * Primarily used by Quote/Sales pipelines automatically, exposed here for direct orchestration if needed.
 */
export function adjustInventoryReservation(productId: number, quantityDelta: number): void {
  const db = getDb()
  
  db.transaction((tx) => {
    invRepo.modifyReservations(tx, productId, quantityDelta)
  });
}
