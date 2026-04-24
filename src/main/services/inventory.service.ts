// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Inventory Service
// ────────────────────────────────────────────────────────

import * as invRepo from '../repositories/inventory.repository'
import type { InventoryBatch, InventorySummary } from '../../shared/types'

export async function getInventorySummary(): Promise<InventorySummary[]> {
  return invRepo.getInventorySummary()
}

export async function listInventoryBatchesByProduct(productId: number): Promise<InventoryBatch[]> {
  return invRepo.listInventoryBatchesByProduct(productId)
}
