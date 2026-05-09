// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Sales Lead Repository
// ────────────────────────────────────────────────────────

import { getDb } from '../database/client'
import { salesLeads } from '../../shared/schema/sales-lead'
import { clients } from '../../shared/schema/client'
import { quotes } from '../../shared/schema/quote'
import { eq, desc, like, sql } from 'drizzle-orm'
import { generateId } from '../utils/id-generator'
import type { DbTransaction } from '../database/client'

export async function createSalesLead(clientId: number, name: string) {
  const db = getDb()
  const leadNumber = await generateId('LEAD')

  return db.transaction((tx) => {
    const lead = tx.insert(salesLeads).values({
      clientId,
      name,
      leadNumber,
      status: 'IN_PROGRESS'
    }).returning().get()

    if (!lead) throw new Error('Failed to create Sales Lead')
    return lead
  })
}

export async function getSalesLead(id: number) {
  const db = getDb()
  const lead = db.select().from(salesLeads).where(eq(salesLeads.id, id)).get()
  if (!lead) throw new Error(`Sales Lead ${id} not found`)
  return lead
}

export async function listSalesLeads(params: { page?: number; pageSize?: number; search?: string }) {
  const db = getDb()
  const { page = 1, pageSize = 50, search = '' } = params
  const offset = (page - 1) * pageSize

  const baseSelect = db.select({
    id: salesLeads.id,
    leadNumber: salesLeads.leadNumber,
    clientId: salesLeads.clientId,
    name: salesLeads.name,
    status: salesLeads.status,
    createdAt: salesLeads.createdAt,
    updatedAt: salesLeads.updatedAt,
    client: {
      name: clients.name,
      surname: clients.surname
    }
  })
  .from(salesLeads)
  .leftJoin(clients, eq(salesLeads.clientId, clients.id))

  let query = baseSelect.orderBy(desc(salesLeads.id))
  let countQuery = db.select({ count: sql<number>`count(*)` }).from(salesLeads)

  if (search.trim().length > 0) {
    const term = `%${search}%`
    query = baseSelect.where(like(salesLeads.name, term)).orderBy(desc(salesLeads.id))
    countQuery = db.select({ count: sql<number>`count(*)` }).from(salesLeads).where(like(salesLeads.name, term))
  }

  const items = query.limit(pageSize).offset(offset).all()
  const totalRes = countQuery.get()
  const total = totalRes ? Number(totalRes.count) : 0

  return { items, total, page, pageSize }
}



// Low-level helper mapped for the transaction cascades internally used by Sales
export function modifySalesLeadStatus(tx: DbTransaction, id: number, nextStatus: 'IN_PROGRESS' | 'CLOSED_SALE' | 'CLOSED_NO_SALE') {
  const old = tx.select().from(salesLeads).where(eq(salesLeads.id, id)).get()
  if (!old) throw new Error(`Lead ${id} missing`)

  tx.update(salesLeads).set({
    status: nextStatus,
    updatedAt: sql`(datetime('now'))`
  }).where(eq(salesLeads.id, id)).run()
}

/**
 * Returns a full lead detail including client info and all associated quotes.
 * Used by the ViewLeadModal to show the complete pipeline for a lead.
 */
export async function getSalesLeadDetail(id: number) {
  const db = getDb()

  const lead = db.select().from(salesLeads).where(eq(salesLeads.id, id)).get()
  if (!lead) throw new Error(`Sales Lead ${id} not found`)

  const client = db.select().from(clients).where(eq(clients.id, lead.clientId)).get()

  const leadQuotes = db.select().from(quotes).where(eq(quotes.salesLeadId, id)).orderBy(desc(quotes.id)).all()

  return {
    ...lead,
    client: client ?? null,
    quotes: leadQuotes
  }
}
