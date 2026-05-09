// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Client Repository
// Drizzle queries for the Client entity.
// ────────────────────────────────────────────────────────

import { eq, desc, asc, like, or, sql } from 'drizzle-orm'
import { getDb } from '../database/client'
import { clients, clientHistory } from '../../shared/schema'
import type { Client, ClientInsert, ClientWithHistory, PaginatedResult, LoosePartial } from '../../shared/types'
import { logEntityChanges } from './audit.repository'
import { generateId } from '../utils/id-generator'

export async function listClients(
  page: number,
  pageSize: number,
  search: string,
  sortBy?: string,
  sortDir?: 'asc' | 'desc'
): Promise<PaginatedResult<Client>> {
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
  if (sortBy) {
    const column = (clients as any)[sortBy]
    if (column) {
      orderClause = sortDir === 'asc' ? asc(column) : desc(column)
    }
  }

  const [totalRes, items] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(clients).where(whereClause),
    db
      .select()
      .from(clients)
      .where(whereClause)
      .orderBy(orderClause)
      .limit(pageSize)
      .offset(offset)
  ])

  const total = totalRes[0]?.count ?? 0

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  }
}

export async function getClient(id: number): Promise<ClientWithHistory | null> {
  const db = getDb()
  const [client] = await db.select().from(clients).where(eq(clients.id, id))

  if (client === undefined) return null

  const history = await db
    .select()
    .from(clientHistory)
    .where(eq(clientHistory.clientId, id))
    .orderBy(desc(clientHistory.changedAt))

  return {
    ...client,
    history
  }
}

export async function createClient(data: Omit<ClientInsert, 'clientNumber'>): Promise<Client> {
  const db = getDb()
  const clientNumber = await generateId('CLIENT')
  const [created] = await db.insert(clients).values({ ...data, clientNumber }).returning()
  if (created === undefined) throw new Error('Failed to create client')
  return created
}

export async function updateClient(id: number, data: LoosePartial<ClientInsert>): Promise<Client> {
  const db = getDb()

  return db.transaction((tx) => {
    const old = tx.select().from(clients).where(eq(clients.id, id)).get()
    if (old === undefined) throw new Error(`Client with ID ${id} not found`)

    logEntityChanges(tx, 'client', id, old, { ...old, ...data })

    const updated = tx
      .update(clients)
      .set({ ...data, updatedAt: new Date().toISOString() })
      .where(eq(clients.id, id))
      .returning()
      .get()

    if (updated === undefined) throw new Error(`Failed to update client ${id}`)
    return updated
  })
}
