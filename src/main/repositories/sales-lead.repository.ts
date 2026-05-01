// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Sales Lead Repository
// ────────────────────────────────────────────────────────

import { getDb } from '../database/client'
import { salesLeads } from '../../shared/schema/sales-lead'
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

  let query = db.select().from(salesLeads).orderBy(desc(salesLeads.id))
  let countQuery = db.select({ count: sql<number>`count(*)` }).from(salesLeads)

  if (search.trim().length > 0) {
    const term = `%${search}%`
    query = db.select().from(salesLeads).where(like(salesLeads.name, term)).orderBy(desc(salesLeads.id)) as any
    countQuery = db.select({ count: sql<number>`count(*)` }).from(salesLeads).where(like(salesLeads.name, term)) as any
  }

  const items = query.limit(pageSize).offset(offset).all()
  const totalRes = countQuery.get()
  const total = totalRes ? Number(totalRes.count) : 0

  return { items, total, page, pageSize }
}



// Low-level helper mapped for the transaction cascades internally used by Sales
export function modifySalesLeadStatus(tx: DbTransaction, id: number, nextStatus: 'IN_PROGRESS' | 'SOLD' | 'NOT_SOLD' | 'CLOSED') {
  const old = tx.select().from(salesLeads).where(eq(salesLeads.id, id)).get()
  if (!old) throw new Error(`Lead ${id} missing`)

  tx.update(salesLeads).set({
    status: nextStatus,
    updatedAt: sql`(datetime('now'))`
  }).where(eq(salesLeads.id, id)).run()
}
