// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Sales Lead Service
// ────────────────────────────────────────────────────────

import { getDb } from '../database/client'
import * as leadRepo from '../repositories/sales-lead.repository'
import * as quoteRepo from '../repositories/quote.repository'
import { modifyReservations } from '../repositories/inventory.repository'
import { quotes, quoteLineItems } from '../../shared/schema/quote'
import { salesLeads } from '../../shared/schema/sales-lead'
import { eq } from 'drizzle-orm'

export async function createSalesLead(clientId: number, name: string) {
  return leadRepo.createSalesLead(clientId, name)
}

export async function getSalesLead(id: number) {
  return leadRepo.getSalesLead(id)
}

export async function listSalesLeads(params: { page?: number; pageSize?: number; search?: string }) {
  return leadRepo.listSalesLeads(params)
}

export async function updateSalesLeadStatus(id: number, status: 'IN_PROGRESS' | 'SOLD' | 'NOT_SOLD' | 'CLOSED') {
  const db = getDb()

  return db.transaction((tx) => {
    leadRepo.modifySalesLeadStatus(tx, id, status)

    if (status === 'NOT_SOLD' || status === 'CLOSED') {
      const activeQuotes = tx.select().from(quotes).where(eq(quotes.salesLeadId, id)).all()
      for (const q of activeQuotes) {
        if (q.status === 'SENT') {
           const items = tx.select().from(quoteLineItems).where(eq(quoteLineItems.quoteId, q.id)).all()
           for (const item of items) {
             modifyReservations(tx, item.productId, -item.quantity)
           }
        }
        if (q.status === 'DRAFT' || q.status === 'SENT') {
           quoteRepo.transitionQuoteStatus(tx, q.id, 'NOT_SOLD')
        }
      }
    }
    
    return tx.select().from(salesLeads).where(eq(salesLeads.id, id)).get()!
  })
}
