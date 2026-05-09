// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Return Service
// Reverses finalized Sale Ledgers.
// ────────────────────────────────────────────────────────

import * as returnRepo from '../repositories/return.repository'

export function createReturn(
  saleId: number,
  reason: string,
  items: { saleLineItemId: number, quantityReturned: number, restockDisposition?: 'RESTOCK' | 'DEFECTIVE' | undefined }[]
) {
  return returnRepo.createReturn(saleId, reason, items)
}

export function processReturn(returnId: number) {
  return returnRepo.processReturn(returnId)
}

export function getReturnById(id: number) {
  return returnRepo.getReturnById(id)
}
