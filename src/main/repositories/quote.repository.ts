// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Quote Repository
// Handles Quotes, LineItems, and Versioning.
// ────────────────────────────────────────────────────────

import { getDb, type DbTransaction } from '../database/client'
import { quotes, quoteLineItems, quoteVersions } from '../../shared/schema/quote'
import { products } from '../../shared/schema/product'
import { taxProfiles, taxProfileComponents } from '../../shared/schema/tax'
import { eq, desc, like, sql } from 'drizzle-orm'
import { generateId } from '../utils/id-generator'

// ─── Create ──────────────────────────────────────────────

export async function createQuote(
  data: { salesLeadId: number; taxProfileId?: number | null; notes?: string },
  lineItems: { productId: number; quantity: number }[]
) {
  const db = getDb()
  const quoteNumber = await generateId('QUOTE')

  return db.transaction((tx) => {
    const quote = tx.insert(quotes).values({
      quoteNumber,
      salesLeadId: data.salesLeadId,
      taxProfileId: data.taxProfileId ?? null,
      notes: data.notes || '',
      status: 'DRAFT'
    }).returning().get()

    if (!quote) throw new Error('Failed to create Quote')

    // Insert line items with product price lookups
    for (const item of lineItems) {
      const product = tx.select().from(products).where(eq(products.id, item.productId)).get()
      if (!product) throw new Error(`Product ${item.productId} not found`)

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
  if (!quote) throw new Error(`Quote ${id} not found`)

  const items = txOrDb.select().from(quoteLineItems).where(eq(quoteLineItems.quoteId, id)).all()
  const enrichedItems = items.map((item) => {
    const product = txOrDb.select().from(products).where(eq(products.id, item.productId)).get()
    return { ...item, product: product! }
  })

  let taxProfile = null
  if (quote.taxProfileId) {
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

export async function getQuote(id: number) {
  const db = getDb()
  return getQuoteById(db, id)
}

export async function listQuotes(params: { page?: number; pageSize?: number; search?: string }) {
  const db = getDb()
  const { page = 1, pageSize = 50, search = '' } = params
  const offset = (page - 1) * pageSize

  let query = db.select().from(quotes).orderBy(desc(quotes.id))
  let countQuery = db.select({ count: sql<number>`count(*)` }).from(quotes)

  if (search.trim().length > 0) {
    const term = `%${search}%`
    query = db.select().from(quotes).where(like(quotes.quoteNumber, term)).orderBy(desc(quotes.id)) as any
    countQuery = db.select({ count: sql<number>`count(*)` }).from(quotes).where(like(quotes.quoteNumber, term)) as any
  }

  const items = query.limit(pageSize).offset(offset).all()
  const totalRes = countQuery.get()
  const total = totalRes ? Number(totalRes.count) : 0

  return { items, total, page, pageSize }
}

// ─── Update (DRAFT only) ────────────────────────────────

export async function updateQuote(
  id: number,
  data: { taxProfileId?: number | null; notes?: string },
  lineItems?: { productId: number; quantity: number }[]
) {
  const db = getDb()

  return db.transaction((tx) => {
    const old = tx.select().from(quotes).where(eq(quotes.id, id)).get()
    if (!old) throw new Error(`Quote ${id} not found`)
    if (old.status !== 'DRAFT') throw new Error(`Cannot modify Quote ${id} because it is ${old.status}`)

    // Update quote metadata
    const updateData: Record<string, unknown> = { updatedAt: sql`(datetime('now'))` }
    if (data.taxProfileId !== undefined) updateData.taxProfileId = data.taxProfileId
    if (data.notes !== undefined) updateData.notes = data.notes

    tx.update(quotes).set(updateData).where(eq(quotes.id, id)).run()

    // Replace line items if provided
    if (lineItems !== undefined) {
      tx.delete(quoteLineItems).where(eq(quoteLineItems.quoteId, id)).run()
      for (const item of lineItems) {
        const product = tx.select().from(products).where(eq(products.id, item.productId)).get()
        if (!product) throw new Error(`Product ${item.productId} not found`)

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
  if (!quote) throw new Error(`Quote ${id} not found`)

  const allowed = validTransitions[quote.status] || []
  if (!allowed.includes(nextStatus)) {
    throw new Error(`Cannot transition Quote ${id} from ${quote.status} to ${nextStatus}`)
  }

  tx.update(quotes).set({
    status: nextStatus,
    updatedAt: sql`(datetime('now'))`
  }).where(eq(quotes.id, id)).run()

  return tx.select().from(quotes).where(eq(quotes.id, id)).get()!
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
export async function getQuoteVersions(quoteId: number) {
  const db = getDb()
  return db.select().from(quoteVersions).where(eq(quoteVersions.quoteId, quoteId)).all()
}

/**
 * Get line items for a quote (used by sale execution).
 */
export function getQuoteLineItems(tx: DbTransaction, quoteId: number) {
  return tx.select().from(quoteLineItems).where(eq(quoteLineItems.quoteId, quoteId)).all()
}
