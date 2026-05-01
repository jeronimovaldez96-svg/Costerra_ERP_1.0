// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Quote Service
// Orchestrates Quote transitions with inventory reservation
// side effects and automatic versioning.
// ────────────────────────────────────────────────────────

import { getDb } from '../database/client'
import * as quoteRepo from '../repositories/quote.repository'
import { modifyReservations } from '../repositories/inventory.repository'
import { quoteLineItems } from '../../shared/schema/quote'
import { eq } from 'drizzle-orm'

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
 * - DRAFT → SENT: Creates version snapshot + reserves inventory
 * - SENT → REJECTED: Releases inventory reservations
 */
export async function transitionQuote(id: number, nextStatus: 'SENT' | 'REJECTED') {
  const db = getDb()

  return db.transaction((tx) => {
    if (nextStatus === 'SENT') {
      // 1. Create version snapshot BEFORE transitioning
      quoteRepo.createQuoteVersion(tx, id)

      // 2. Reserve inventory for all line items
      const items = tx.select().from(quoteLineItems).where(eq(quoteLineItems.quoteId, id)).all()
      for (const item of items) {
        modifyReservations(tx, item.productId, item.quantity)
      }
    }

    if (nextStatus === 'REJECTED') {
      // Release all inventory reservations
      const items = tx.select().from(quoteLineItems).where(eq(quoteLineItems.quoteId, id)).all()
      for (const item of items) {
        modifyReservations(tx, item.productId, -item.quantity)
      }
    }

    // 3. Perform the actual status transition
    const updated = quoteRepo.transitionQuoteStatus(tx, id, nextStatus)
    return updated
  })
}
