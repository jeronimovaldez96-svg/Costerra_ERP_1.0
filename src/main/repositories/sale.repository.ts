// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Sale Repository
// Atomic sale execution with FIFO cost resolution.
// ────────────────────────────────────────────────────────

import { getDb } from '../database/client'
import { sales, saleLineItems } from '../../shared/schema/sale'
import { quotes } from '../../shared/schema/quote'
import { salesLeads } from '../../shared/schema/sales-lead'
import { clients } from '../../shared/schema/client'
import { taxProfileComponents } from '../../shared/schema/tax'
import { products } from '../../shared/schema/product'
import { eq, desc, asc, like, sql } from 'drizzle-orm'
import type { ListParams } from '../../shared/types'
import { generateId } from '../utils/id-generator'
import { getQuoteLineItems, transitionQuoteStatus } from './quote.repository'
import { consumeStockFifo } from './inventory.repository'

/**
 * Executes a Sale from a SENT Quote atomically.
 * This is the most critical transaction in the entire system:
 * 1. Validates Quote is in SENT status
 * 2. Transitions Quote to SOLD
 * 3. Transitions sibling Quotes to NOT_SOLD
 * 4. Transitions Lead to SOLD
 * 5. Consumes inventory via FIFO (hard decrement)
 * 6. Calculates blended costs, revenue, tax, profit
 * 7. Creates immutable Sale + SaleLineItems records
 */
export async function executeSale(quoteId: number) {
  const db = getDb()
  const saleNumber = await generateId('SALE')

  return db.transaction((tx) => {
    // 1. Validate Quote
    const quote = tx.select().from(quotes).where(eq(quotes.id, quoteId)).get()
    if (!quote) throw new Error(`Quote ${quoteId} not found`)
    if (quote.status !== 'SENT') throw new Error(`Quote ${quoteId} must be SENT to execute a sale (current: ${quote.status})`)

    const lineItems = getQuoteLineItems(tx, quoteId)
    if (lineItems.length === 0) throw new Error('Quote has no line items')

    // 2. Calculate tax rate from profile
    let effectiveTaxRate = 0
    if (quote.taxProfileId) {
      const components = tx.select().from(taxProfileComponents)
        .where(eq(taxProfileComponents.taxProfileId, quote.taxProfileId!)).all()
      effectiveTaxRate = components.reduce((sum, c) => sum + c.rate, 0) / 100 // Convert % to decimal
    }

    // 3. Execute FIFO consumption and build sale line items
    let totalRevenue = 0
    let totalCost = 0
    const saleLines: Array<{
      productId: number
      quantity: number
      unitPrice: number
      blendedUnitCost: number
      lineRevenue: number
      lineCost: number
      lineProfit: number
    }> = []

    for (const item of lineItems) {
      // FIFO consume — returns the blended cost across consumed batches
      const blendedUnitCost = consumeStockFifo(tx, item.productId, item.quantity)

      const lineRevenue = item.quantity * item.unitPrice
      const lineCost = item.quantity * blendedUnitCost
      const lineProfit = lineRevenue - lineCost

      totalRevenue += lineRevenue
      totalCost += lineCost

      saleLines.push({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        blendedUnitCost,
        lineRevenue,
        lineCost,
        lineProfit
      })
    }

    // 4. Calculate tax and profit
    const taxAmount = totalRevenue * effectiveTaxRate
    const profitAmount = totalRevenue - totalCost - taxAmount
    const profitMargin = totalRevenue > 0 ? (profitAmount / totalRevenue) * 100 : 0

    // 5. Create Sale record
    const sale = tx.insert(sales).values({
      saleNumber,
      quoteId,
      totalRevenue,
      taxProfileId: quote.taxProfileId,
      taxAmount,
      totalCost,
      profitAmount,
      profitMargin
    }).returning().get()

    if (!sale) throw new Error('Failed to create Sale record')

    // 6. Create SaleLineItems
    for (const line of saleLines) {
      tx.insert(saleLineItems).values({
        saleId: sale.id,
        ...line
      }).run()
    }

    // 7. Transition the Quote to SOLD
    transitionQuoteStatus(tx, quoteId, 'SOLD')

    // 8. Cascade: transition sibling quotes to NOT_SOLD
    const siblingQuotes = tx.select().from(quotes)
      .where(eq(quotes.salesLeadId, quote.salesLeadId)).all()

    for (const sibling of siblingQuotes) {
      if (sibling.id !== quoteId && (sibling.status === 'DRAFT' || sibling.status === 'SENT')) {
        transitionQuoteStatus(tx, sibling.id, 'NOT_SOLD')
      }
    }

    // 9. Update tax amount on the quote record for reference
    tx.update(quotes).set({ taxAmount }).where(eq(quotes.id, quoteId)).run()

    return sale
  })
}

export async function getSale(id: number) {
  const db = getDb()
  const sale = db.select().from(sales).where(eq(sales.id, id)).get()
  if (!sale) throw new Error(`Sale ${id} not found`)

  const items = db.select().from(saleLineItems).where(eq(saleLineItems.saleId, id)).all()
  const enrichedItems = items.map((item) => {
    const product = db.select().from(products).where(eq(products.id, item.productId)).get()
    return { ...item, product: product! }
  })

  return { ...sale, lineItems: enrichedItems }
}

export async function listSales(params: ListParams) {
  const db = getDb()
  const { page = 1, pageSize = 50, search = '', sortBy, sortDir } = params
  const offset = (page - 1) * pageSize

  const baseSelect = db.select({
    id: sales.id,
    saleNumber: sales.saleNumber,
    quoteId: sales.quoteId,
    totalRevenue: sales.totalRevenue,
    taxAmount: sales.taxAmount,
    totalCost: sales.totalCost,
    profitAmount: sales.profitAmount,
    profitMargin: sales.profitMargin,
    saleDate: sales.saleDate,
    quoteNumber: quotes.quoteNumber,
    leadNumber: salesLeads.leadNumber,
    leadName: salesLeads.name,
    clientName: clients.name,
    clientSurname: clients.surname
  })
  .from(sales)
  .leftJoin(quotes, eq(sales.quoteId, quotes.id))
  .leftJoin(salesLeads, eq(quotes.salesLeadId, salesLeads.id))
  .leftJoin(clients, eq(salesLeads.clientId, clients.id))

  let orderClause: any = desc(sales.id)
  if (sortBy) {
    if (sortBy === 'clientName') {
      orderClause = sortDir === 'asc' ? asc(clients.name) : desc(clients.name)
    } else {
      const column = (sales as any)[sortBy]
      if (column) {
        orderClause = sortDir === 'asc' ? asc(column) : desc(column)
      }
    }
  }

  let query: any = baseSelect
  let countQuery: any = db.select({ count: sql<number>`count(*)` }).from(sales)

  if (search.trim().length > 0) {
    const term = `%${search}%`
    query = baseSelect.where(like(sales.saleNumber, term))
    countQuery = db.select({ count: sql<number>`count(*)` }).from(sales).where(like(sales.saleNumber, term))
  }
  
  query = query.orderBy(orderClause)

  const rows = query.limit(pageSize).offset(offset).all()
  const items = rows.map((row: any) => ({
    ...row,
    quote: {
      quoteNumber: row.quoteNumber,
      salesLead: {
        leadNumber: row.leadNumber,
        name: row.leadName,
        client: {
          name: row.clientName,
          surname: row.clientSurname
        }
      }
    }
  }))
  const totalRes = countQuery.get()
  const total = Number((totalRes as any)?.count ?? 0)

  return { items, total, page, pageSize }
}
