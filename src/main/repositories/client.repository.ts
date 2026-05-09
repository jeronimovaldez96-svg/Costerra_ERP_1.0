// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Client Repository
// Drizzle queries for the Client entity.
// ────────────────────────────────────────────────────────

import { eq, desc, asc, like, or, sql, type AnyColumn } from 'drizzle-orm'
import { getDb } from '../database/client'
import { clients, clientHistory } from '../../shared/schema'
import type { Client, ClientInsert, ClientWithHistory, PaginatedResult, LoosePartial } from '../../shared/types'
import { logEntityChanges } from './audit.repository'
import { generateId } from '../utils/id-generator'

export function listClients(
  page: number,
  pageSize: number,
  search: string,
  sortBy?: string,
  sortDir?: 'asc' | 'desc'
): PaginatedResult<Client> {
  const db = getDb()
  const offset = (page - 1) * pageSize

  let whereClause = undefined
  if (search.trim().length > 0) {
    const term = `%${search}%`
    whereClause = or(
      like(clients.name, term),
      like(clients.surname, term),
      like(clients.clientNumber, term),
      like(clients.phone, term),
      like(clients.city, term),
      like(clients.email, term)
    )
  }

  let orderClause = desc(clients.createdAt)
  if (sortBy !== undefined && sortBy !== '') {
    const column = (clients as any)[sortBy]
    if (column !== undefined && column !== null) {
      orderClause = sortDir === 'asc' ? asc(column as AnyColumn) : desc(column as AnyColumn)
    }
  }

  const totalRes = db.select({ count: sql<number>`count(*)` }).from(clients).where(whereClause).get()
  const items = db
    .select()
    .from(clients)
    .where(whereClause)
    .orderBy(orderClause)
    .limit(pageSize)
    .offset(offset)
    .all()

  const total = totalRes?.count ?? 0

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  }
}

export function getClient(id: number): ClientWithHistory | null {
  const db = getDb()
  const client = db.select().from(clients).where(eq(clients.id, id)).get()

  if (client === undefined) return null

  const history = db
    .select()
    .from(clientHistory)
    .where(eq(clientHistory.clientId, id))
    .orderBy(desc(clientHistory.changedAt))
    .all()

  return {
    ...client,
    history
  }
}

export function createClient(data: Omit<ClientInsert, 'clientNumber'>): Client {
  const db = getDb()
  const clientNumber = generateId('CLIENT')
  const created = db.insert(clients).values({ ...data, clientNumber }).returning().get()
  return created
}

export function updateClient(id: number, data: LoosePartial<ClientInsert>): Client {
  const db = getDb()

  return db.transaction((tx) => {
    const old = tx.select().from(clients).where(eq(clients.id, id)).get()
    if (old === undefined) throw new Error(`Client with ID ${id.toString()} not found`)

    logEntityChanges(tx, 'client', id, old, { ...old, ...data })

    const updated = tx
      .update(clients)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(clients.id, id))
      .returning()
      .get()

    return updated
  })
}
