// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Sales Lead Repository
// ────────────────────────────────────────────────────────

import { getDb } from '../database/client'
import { salesLeads } from '../../shared/schema/sales-lead'
import { clients } from '../../shared/schema/client'
import { quotes } from '../../shared/schema/quote'
import { eq, desc, asc, like, sql, getTableColumns } from 'drizzle-orm'
import { generateId } from '../utils/id-generator'
import type { DbTransaction } from '../database/client'
import type { ListParams } from '../../shared/types'

export function createSalesLead(clientId: number, name: string) {
  const db = getDb()
  const leadNumber = generateId('LEAD')

  return db.transaction((tx) => {
    const lead = tx.insert(salesLeads).values({
      clientId,
      name,
      leadNumber,
      status: 'IN_PROGRESS'
    }).returning().get()

    return lead
  })
}

export function getSalesLead(id: number) {
  const db = getDb()
  const lead = db.select().from(salesLeads).where(eq(salesLeads.id, id)).get()
  if (lead === undefined) throw new Error(`Sales Lead ${id.toString()} not found`)
  return lead
}

export interface FlatSalesLeadRow {
  id: number
  leadNumber: string
  clientId: number
  name: string
  status: 'IN_PROGRESS' | 'CLOSED_SALE' | 'CLOSED_NO_SALE'
  createdAt: string
  updatedAt: string
  clientName: string | null
  clientSurname: string | null
}

export function listSalesLeads(params: ListParams) {
  const db = getDb()
  const { page = 1, pageSize = 50, search = '', sortBy, sortDir } = params
  const offset = (page - 1) * pageSize

  const baseSelect = db.select({
    id: salesLeads.id,
    leadNumber: salesLeads.leadNumber,
    clientId: salesLeads.clientId,
    name: salesLeads.name,
    status: salesLeads.status,
    createdAt: salesLeads.createdAt,
    updatedAt: salesLeads.updatedAt,
    clientName: clients.name,
    clientSurname: clients.surname
  })
  .from(salesLeads)
  .leftJoin(clients, eq(salesLeads.clientId, clients.id))

  let orderClause = desc(salesLeads.id)
  if (sortBy !== undefined && sortBy !== '') {
    if (sortBy === 'clientName') {
      orderClause = sortDir === 'asc' ? asc(clients.name) : desc(clients.name)
    } else {
      const columns = getTableColumns(salesLeads)
      const column = columns[sortBy as keyof typeof columns]
      if (column !== undefined) {
        orderClause = sortDir === 'asc' ? asc(column) : desc(column)
      }
    }
  }

  const countQuery = db.select({ count: sql<number>`count(*)` }).from(salesLeads)

  let items: (FlatSalesLeadRow & { client: { name: string | null; surname: string | null } })[] = []
  let total = 0

  if (search.trim().length > 0) {
    const term = `%${search}%`
    const filteredQuery = baseSelect.where(like(salesLeads.name, term)).orderBy(orderClause).limit(pageSize).offset(offset)
    const filteredCount = db.select({ count: sql<number>`count(*)` }).from(salesLeads).where(like(salesLeads.name, term))
    
    const rows = filteredQuery.all() as FlatSalesLeadRow[]
    items = rows.map((row) => ({
      ...row,
      client: {
        name: row.clientName,
        surname: row.clientSurname
      }
    }))
    const totalRes = filteredCount.get()
    total = totalRes?.count ?? 0
  } else {
    const rows = baseSelect.orderBy(orderClause).limit(pageSize).offset(offset).all() as FlatSalesLeadRow[]
    items = rows.map((row) => ({
      ...row,
      client: {
        name: row.clientName,
        surname: row.clientSurname
      }
    }))
    const totalRes = countQuery.get()
    total = totalRes?.count ?? 0
  }

  return { items, total, page, pageSize }
}



// Low-level helper mapped for the transaction cascades internally used by Sales
export function modifySalesLeadStatus(tx: DbTransaction, id: number, nextStatus: 'IN_PROGRESS' | 'CLOSED_SALE' | 'CLOSED_NO_SALE') {
  const old = tx.select().from(salesLeads).where(eq(salesLeads.id, id)).get()
  if (old === undefined) throw new Error(`Lead ${id.toString()} missing`)

  tx.update(salesLeads).set({
    status: nextStatus,
    updatedAt: sql`(datetime('now'))`
  }).where(eq(salesLeads.id, id)).run()
}

/**
 * Returns a full lead detail including client info and all associated quotes.
 * Used by the ViewLeadModal to show the complete pipeline for a lead.
 */
export function getSalesLeadDetail(id: number) {
  const db = getDb()

  const lead = db.select().from(salesLeads).where(eq(salesLeads.id, id)).get()
  if (lead === undefined) throw new Error(`Sales Lead ${id.toString()} not found`)

  const client = db.select().from(clients).where(eq(clients.id, lead.clientId)).get()

  const leadQuotes = db.select().from(quotes).where(eq(quotes.salesLeadId, id)).orderBy(desc(quotes.id)).all()

  return {
    ...lead,
    client: client ?? null,
    quotes: leadQuotes
  }
}
