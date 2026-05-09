// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Quote Service
// Orchestrates Quote transitions with versioning.
// ────────────────────────────────────────────────────────

import { getDb } from '../database/client'
import * as quoteRepo from '../repositories/quote.repository'

export async function createQuote(
  data: { salesLeadId: number; taxProfileId?: number | null; notes?: string },
  lineItems: { productId: number; quantity: number }[]
) {
  return quoteRepo.createQuote(data, lineItems)
}

export async function getQuote(id: number) {
  return quoteRepo.getQuote(id)
}

export async function listQuotes(params: { page?: number; pageSize?: number; search?: string }) {
  return quoteRepo.listQuotes(params)
}

export async function updateQuote(
  id: number,
  data: { taxProfileId?: number | null; notes?: string },
  lineItems?: { productId: number; quantity: number }[]
) {
  return quoteRepo.updateQuote(id, data, lineItems)
}

export async function getQuoteVersions(quoteId: number) {
  return quoteRepo.getQuoteVersions(quoteId)
}

/**
 * Transitions a Quote status with side effects:
 * - DRAFT → SENT: Creates version snapshot (no inventory reservation —
 *   quotes can be sent regardless of stock levels)
 * - SENT → REJECTED: Simple status update (no reservations to release)
 */
export async function transitionQuote(id: number, nextStatus: 'SENT' | 'REJECTED') {
  const db = getDb()

  return db.transaction((tx) => {
    if (nextStatus === 'SENT') {
      // Create version snapshot BEFORE transitioning
      quoteRepo.createQuoteVersion(tx, id)
    }

    // Perform the actual status transition
    const updated = quoteRepo.transitionQuoteStatus(tx, id, nextStatus)
    return updated
  })
}
