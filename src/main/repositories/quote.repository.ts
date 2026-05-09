// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Quote Repository
// Handles Quotes, LineItems, and Versioning.
// ────────────────────────────────────────────────────────

import { getDb, type DbTransaction } from '../database/client'
import { quotes, quoteLineItems, quoteVersions } from '../../shared/schema/quote'
import { salesLeads } from '../../shared/schema/sales-lead'
import { clients } from '../../shared/schema/client'
import { products } from '../../shared/schema/product'
import { taxProfiles, taxProfileComponents } from '../../shared/schema/tax'
import { eq, desc, asc, sql, type AnyColumn, like } from 'drizzle-orm'
import { generateId } from '../utils/id-generator'
import type { ListParams } from '../../shared/types'

// ─── Create ──────────────────────────────────────────────

export function createQuote(
  data: { salesLeadId: number; taxProfileId?: number | null | undefined; notes?: string | undefined },
  lineItems: { productId: number; quantity: number }[]
) {
  const db = getDb()
  const quoteNumber = generateId('QUOTE')

  return db.transaction((tx) => {
    const quote = tx.insert(quotes).values({
      quoteNumber,
      salesLeadId: data.salesLeadId,
      taxProfileId: data.taxProfileId ?? null,
      notes: data.notes ?? '',
      status: 'DRAFT'
    }).returning().get()

    // Insert line items with product price lookups
    for (const item of lineItems) {
      const product = tx.select().from(products).where(eq(products.id, item.productId)).get()
      if (product === undefined) throw new Error(`Product ${item.productId.toString()} not found`)

      const lineTotal = item.quantity * product.defaultUnitPrice

      tx.insert(quoteLineItems).values({
        quoteId: quote.id,
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: product.defaultUnitPrice,
        unitCost: product.defaultUnitCost,
        lineTotal
      }).run()
    }

    return getQuoteById(tx, quote.id)
  })
}

// ─── Read ────────────────────────────────────────────────

function getQuoteById(txOrDb: DbTransaction | ReturnType<typeof getDb>, id: number) {
  const quote = txOrDb.select().from(quotes).where(eq(quotes.id, id)).get()
  if (quote === undefined) throw new Error(`Quote ${id.toString()} not found`)

  const items = txOrDb.select().from(quoteLineItems).where(eq(quoteLineItems.quoteId, id)).all()
  const enrichedItems = items.map((item) => {
    const product = txOrDb.select().from(products).where(eq(products.id, item.productId)).get()
    if (product === undefined) throw new Error(`Product ${item.productId.toString()} missing for Quote item ${item.id.toString()}`)
    return { ...item, product }
  })

  let taxProfile = null
  if (quote.taxProfileId !== null) {
    const profile = txOrDb.select().from(taxProfiles).where(eq(taxProfiles.id, quote.taxProfileId)).get()
    if (profile) {
      const components = txOrDb.select().from(taxProfileComponents).where(eq(taxProfileComponents.taxProfileId, profile.id)).all()
      taxProfile = { ...profile, components }
    }
  }

  return {
    ...quote,
    lineItems: enrichedItems,
    taxProfile
  }
}

export function getQuote(id: number) {
  const db = getDb()
  return getQuoteById(db, id)
}

export interface FlatQuoteRow {
  id: number
  quoteNumber: string
  salesLeadId: number
  taxProfileId: number | null
  notes: string
  status: string
  createdAt: string
  updatedAt: string
  leadNumber: string | null
  clientName: string | null
  clientSurname: string | null
}

export function listQuotes(params: ListParams) {
  const db = getDb()
  const { page = 1, pageSize = 50, search = '', sortBy, sortDir } = params
  const offset = (page - 1) * pageSize

  const baseSelect = db.select({
    id: quotes.id,
    quoteNumber: quotes.quoteNumber,
    salesLeadId: quotes.salesLeadId,
    taxProfileId: quotes.taxProfileId,
    notes: quotes.notes,
    status: quotes.status,
    createdAt: quotes.createdAt,
    updatedAt: quotes.updatedAt,
    leadNumber: salesLeads.leadNumber,
    clientName: clients.name,
    clientSurname: clients.surname
  })
  .from(quotes)
  .leftJoin(salesLeads, eq(quotes.salesLeadId, salesLeads.id))
  .leftJoin(clients, eq(salesLeads.clientId, clients.id))

  let orderClause = desc(quotes.id)
  if (sortBy !== undefined && sortBy !== '') {
    if (sortBy === 'clientName') {
      orderClause = sortDir === 'asc' ? asc(clients.name) : desc(clients.name)
    } else {
      const column = (quotes as any)[sortBy]
      if (column !== undefined && column !== null) {
        orderClause = sortDir === 'asc' ? asc(column as AnyColumn) : desc(column as AnyColumn)
      }
    }
  }

  const countQuery = db.select({ count: sql<number>`count(*)` }).from(quotes)

  let items: (FlatQuoteRow & { salesLead: { leadNumber: string | null; client: { name: string | null; surname: string | null } } })[] = []
  let total = 0

  if (search.trim().length > 0) {
    const term = `%${search}%`
    const filteredQuery = baseSelect.where(like(quotes.quoteNumber, term)).orderBy(orderClause).limit(pageSize).offset(offset)
    const filteredCount = db.select({ count: sql<number>`count(*)` }).from(quotes).where(like(quotes.quoteNumber, term))
    
    const rows = filteredQuery.all() as FlatQuoteRow[]
    items = rows.map((row) => ({
      ...row,
      salesLead: {
        leadNumber: row.leadNumber,
        client: {
          name: row.clientName,
          surname: row.clientSurname
        }
      }
    }))
    const totalRes = filteredCount.get()
    total = totalRes?.count ?? 0
  } else {
    const rows = baseSelect.orderBy(orderClause).limit(pageSize).offset(offset).all() as FlatQuoteRow[]
    items = rows.map((row) => ({
      ...row,
      salesLead: {
        leadNumber: row.leadNumber,
        client: {
          name: row.clientName,
          surname: row.clientSurname
        }
      }
    }))
    const totalRes = countQuery.get()
    total = totalRes?.count ?? 0
  }

  return { items, total, page, pageSize }
}

// ─── Update (DRAFT only) ────────────────────────────────

export function updateQuote(
  id: number,
  data: { taxProfileId?: number | null | undefined; notes?: string | undefined },
  lineItems?: { productId: number; quantity: number }[]
) {
  const db = getDb()

  return db.transaction((tx) => {
    const old = tx.select().from(quotes).where(eq(quotes.id, id)).get()
    if (old === undefined) throw new Error(`Quote ${id.toString()} not found`)
    if (old.status !== 'DRAFT') throw new Error(`Cannot modify Quote ${id.toString()} because it is ${old.status}`)

    // Update quote metadata
    const updateData: Record<string, unknown> = { updatedAt: sql`(datetime('now'))` }
    if (data.taxProfileId !== undefined) updateData['taxProfileId'] = data.taxProfileId
    if (data.notes !== undefined) updateData['notes'] = data.notes

    tx.update(quotes).set(updateData).where(eq(quotes.id, id)).run()

    // Replace line items if provided
    if (lineItems !== undefined) {
      tx.delete(quoteLineItems).where(eq(quoteLineItems.quoteId, id)).run()
      for (const item of lineItems) {
        const product = tx.select().from(products).where(eq(products.id, item.productId)).get()
        if (product === undefined) throw new Error(`Product ${item.productId.toString()} not found`)

        tx.insert(quoteLineItems).values({
          quoteId: id,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: product.defaultUnitPrice,
          unitCost: product.defaultUnitCost,
          lineTotal: item.quantity * product.defaultUnitPrice
        }).run()
      }
    }

    return getQuoteById(tx, id)
  })
}

// ─── Status Transitions ─────────────────────────────────

/**
 * Transitions a Quote status. This is the low-level DB update only.
 * Side effects (inventory reservation, versioning) are handled by the service layer.
 */
export function transitionQuoteStatus(tx: DbTransaction, id: number, nextStatus: string) {
  const validTransitions: Record<string, string[]> = {
    DRAFT: ['SENT', 'NOT_SOLD'],
    SENT: ['REJECTED', 'SOLD', 'NOT_SOLD']
  }

  const quote = tx.select().from(quotes).where(eq(quotes.id, id)).get()
  if (quote === undefined) throw new Error(`Quote ${id.toString()} not found`)

  const allowed = validTransitions[quote.status] ?? []
  if (!allowed.includes(nextStatus)) {
    throw new Error(`Cannot transition Quote ${id.toString()} from ${quote.status} to ${nextStatus}`)
  }

  tx.update(quotes).set({
    status: nextStatus,
    updatedAt: sql`(datetime('now'))`
  }).where(eq(quotes.id, id)).run()

  const updated = tx.select().from(quotes).where(eq(quotes.id, id)).get()
  if (updated === undefined) throw new Error(`Failed to map Quote ${id.toString()} status transition`)
  return updated
}

// ─── Versioning ──────────────────────────────────────────

/**
 * Creates an immutable snapshot of the quote state at transition time.
 */
export function createQuoteVersion(tx: DbTransaction, quoteId: number) {
  // Determine next version number
  const existingVersions = tx.select({ count: sql<number>`count(*)` })
    .from(quoteVersions)
    .where(eq(quoteVersions.quoteId, quoteId))
    .get()
  const nextVersion = (existingVersions?.count ?? 0) + 1

  // Take the full snapshot
  const quote = tx.select().from(quotes).where(eq(quotes.id, quoteId)).get()
  const items = tx.select().from(quoteLineItems).where(eq(quoteLineItems.quoteId, quoteId)).all()

  const snapshot = JSON.stringify({ quote, lineItems: items })

  tx.insert(quoteVersions).values({
    quoteId,
    versionNumber: nextVersion,
    snapshot
  }).run()

  return nextVersion
}

/**
 * Returns all snapshot versions for a given quote.
 */
export function getQuoteVersions(quoteId: number) {
  const db = getDb()
  return db.select().from(quoteVersions).where(eq(quoteVersions.quoteId, quoteId)).all()
}

/**
 * Get line items for a quote (used by sale execution).
 */
export function getQuoteLineItems(tx: DbTransaction, quoteId: number) {
  return tx.select().from(quoteLineItems).where(eq(quoteLineItems.quoteId, quoteId)).all()
}
