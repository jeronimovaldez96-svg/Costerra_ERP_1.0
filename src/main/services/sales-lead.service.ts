// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Sales Lead Service
// ────────────────────────────────────────────────────────

import { getDb } from '../database/client'
import * as leadRepo from '../repositories/sales-lead.repository'
import * as quoteRepo from '../repositories/quote.repository'
import { quotes } from '../../shared/schema/quote'
import { salesLeads } from '../../shared/schema/sales-lead'
import { eq } from 'drizzle-orm'
import type { ListParams } from '../../shared/types'

export function createSalesLead(clientId: number, name: string) {
  return leadRepo.createSalesLead(clientId, name)
}

export function getSalesLead(id: number) {
  return leadRepo.getSalesLead(id)
}

export function getSalesLeadDetail(id: number) {
  return leadRepo.getSalesLeadDetail(id)
}

export function listSalesLeads(params: ListParams) {
   return leadRepo.listSalesLeads(params)
 }

export function updateSalesLeadStatus(id: number, status: 'IN_PROGRESS' | 'CLOSED_SALE' | 'CLOSED_NO_SALE') {
  const db = getDb()

  return db.transaction((tx) => {
    leadRepo.modifySalesLeadStatus(tx, id, status)

    // When closing with no sale, cascade NOT_SOLD to any open quotes
    if (status === 'CLOSED_NO_SALE') {
      const activeQuotes = tx.select().from(quotes).where(eq(quotes.salesLeadId, id)).all()
      for (const q of activeQuotes) {
        if (q.status === 'DRAFT' || q.status === 'SENT') {
           quoteRepo.transitionQuoteStatus(tx, q.id, 'NOT_SOLD')
        }
      }
    }
    
    const updated = tx.select().from(salesLeads).where(eq(salesLeads.id, id)).get()
    if (updated === undefined) throw new Error(`Failed to update sales lead`)
    return updated
  })
}
