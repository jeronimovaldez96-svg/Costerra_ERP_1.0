// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Quote Service
// Orchestrates Quote transitions with versioning.
// ────────────────────────────────────────────────────────

import { getDb } from '../database/client'
import * as quoteRepo from '../repositories/quote.repository'
import type { ListParams } from '../../shared/types'

export function createQuote(
  data: { salesLeadId: number; taxProfileId?: number | null | undefined; notes?: string | undefined },
  lineItems: { productId: number; quantity: number }[]
) {
  return quoteRepo.createQuote(data, lineItems)
}

export function getQuote(id: number) {
  return quoteRepo.getQuote(id)
}

export function listQuotes(params: ListParams) {
  return quoteRepo.listQuotes(params)
}

export function updateQuote(
  id: number,
  data: { taxProfileId?: number | null | undefined; notes?: string | undefined },
  lineItems?: { productId: number; quantity: number }[]
) {
  return quoteRepo.updateQuote(id, data, lineItems)
}

export function getQuoteVersions(quoteId: number) {
  return quoteRepo.getQuoteVersions(quoteId)
}

import { quoteLineItems } from '../../shared/schema'
import { eq } from 'drizzle-orm'
import * as invRepo from '../repositories/inventory.repository'

/**
 * Transitions a Quote status with side effects:
 * - DRAFT → SENT: Creates version snapshot and reserves inventory
 * - SENT → REJECTED: Releases inventory reservations
 */
export function transitionQuote(id: number, nextStatus: 'SENT' | 'REJECTED' | 'SOLD' | 'NOT_SOLD') {
  const db = getDb()

  return db.transaction((tx) => {
    const oldQuote = quoteRepo.getQuote(id)

    if (nextStatus === 'SENT') {
      // 1. Create version snapshot
      quoteRepo.createQuoteVersion(tx, id)

      // 2. Reserve Inventory
      const items = tx.select().from(quoteLineItems).where(eq(quoteLineItems.quoteId, id)).all()
      for (const item of items) {
        invRepo.modifyReservations(tx, item.productId, item.quantity)
      }
    }

    if (nextStatus === 'REJECTED' || nextStatus === 'NOT_SOLD') {
      // Release Inventory
      if (oldQuote.status === 'SENT') {
        const items = tx.select().from(quoteLineItems).where(eq(quoteLineItems.quoteId, id)).all()
        for (const item of items) {
          invRepo.modifyReservations(tx, item.productId, -item.quantity)
        }
      }
    }

    // Perform the actual status transition
    const updated = quoteRepo.transitionQuoteStatus(tx, id, nextStatus)
    return updated
  })
}
