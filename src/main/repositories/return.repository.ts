// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Return Repository
// Finalized sale unraveling ledger logic.
// ────────────────────────────────────────────────────────

import { getDb } from '../database/client'
import { returns, returnLineItems, creditNotes } from '../../shared/schema/return'
import { sales, saleLineItems } from '../../shared/schema/sale'
import { inventoryBatches } from '../../shared/schema/inventory'
import { eq } from 'drizzle-orm'
import { generateId } from '../utils/id-generator'

/**
 * Creates a DRAFT return document linked to an executing Sale.
 */
export async function createReturn(
  saleId: number,
  reason: string,
  items: { saleLineItemId: number, quantityReturned: number, restockDisposition?: 'RESTOCK' | 'DEFECTIVE' | undefined }[]
) {
  const db = getDb()
  const returnNumber = await generateId('RETURN')

  return db.transaction((tx) => {
    // 1. Verify the associated Sale exists
    const sale = tx.select().from(sales).where(eq(sales.id, saleId)).get()
    if (!sale) throw new Error('Sale not found.')

    // 2. Validate Line Items and calculate total literal refund based exactly on original sale prices.
    let totalRefund = 0
    const processedItems: Array<{
      saleLineItemId: number
      quantityReturned: number
      unitRefund: number
      lineRefund: number
      restockDisposition: 'RESTOCK' | 'DEFECTIVE'
    }> = []

    for (const item of items) {
      const saleLine = tx.select().from(saleLineItems).where(eq(saleLineItems.id, item.saleLineItemId)).get()
      if (!saleLine) throw new Error(`Sale Line Item ${item.saleLineItemId} not found.`)
      
      // Ensure we aren't returning more than was literally sold
      if (item.quantityReturned > saleLine.quantity) {
        throw new Error(`Cannot return cleanly: Quantity returned (${item.quantityReturned}) exceeds bounds of finalized sale magnitude (${saleLine.quantity}).`)
      }

      const unitRefund = saleLine.unitPrice
      const lineRefund = unitRefund * item.quantityReturned
      totalRefund += lineRefund

      processedItems.push({
        ...item,
        unitRefund,
        lineRefund,
        restockDisposition: item.restockDisposition ?? 'RESTOCK'
      })
    }

    // 3. Create the Return instance
    const ret = tx.insert(returns).values({
      returnNumber,
      saleId,
      reason,
      totalRefund,
      status: 'DRAFT'
    }).returning().get()

    if (!ret) throw new Error('Failed to create Return instance.')

    // 4. Create Return Line Items
    for (const item of processedItems) {
      tx.insert(returnLineItems).values({
        returnId: ret.id,
        saleLineItemId: item.saleLineItemId,
        quantity: item.quantityReturned,
        unitRefund: item.unitRefund,
        lineRefund: item.lineRefund,
        restockDisposition: item.restockDisposition
      }).run()
    }

    return ret
  })
}

/**
 * Transitions a Draft directly to Processed.
 * 1. Restores the exact physical inventory into independent "Return Batches".
 * 2. Deducts the `blendedUnitCost` logically keeping accurate cost metrics inherently.
 * 3. Immediately triggers Credit Note rendering synchronously.
 */
export async function processReturn(returnId: number) {
  const db = getDb()
  const creditNoteNumber = await generateId('CREDIT_NOTE')

  return db.transaction((tx) => {
    const ret = tx.select().from(returns).where(eq(returns.id, returnId)).get()
    if (!ret) throw new Error('Return not found.')
    if (ret.status !== 'DRAFT') throw new Error(`Return is cleanly blocked from sequence parsing: Needs 'DRAFT', currently '${ret.status}'`)

    const lineItems = tx.select().from(returnLineItems).where(eq(returnLineItems.returnId, returnId)).all()
    
    for (const item of lineItems) {
      // Fetch the exact historic structural Sale Line to get `blendedUnitCost`
      const saleLine = tx.select().from(saleLineItems).where(eq(saleLineItems.id, item.saleLineItemId)).get()!
      
      // Only physically restock items marked as RESTOCK — DEFECTIVE items are written off the ledger
      if (item.restockDisposition === 'RESTOCK') {
        tx.insert(inventoryBatches).values({
          productId: saleLine.productId,
          purchaseOrderItemId: null, // Bypassing PO cleanly
          returnLineItemId: item.id, // Linked cleanly to the return line
          initialQty: item.quantity,
          remainingQty: item.quantity,
          reservedQty: 0,
          unitCost: saleLine.blendedUnitCost, // Returning the EXACT blended cost to preserve FIFO integrity
          isReturnBatch: true
        }).run()
      }
    }

    // Spawn Credit Note reliably
    tx.insert(creditNotes).values({
      creditNoteNumber,
      returnId: ret.id,
      amount: ret.totalRefund
    }).run()

    // Elevate status locally
    const processedAt = new Date().toISOString()
    tx.update(returns)
      .set({ status: 'PROCESSED', processedAt })
      .where(eq(returns.id, returnId)).run()

    return tx.select().from(returns).where(eq(returns.id, returnId)).get()!
  })
}

export function getReturnById(id: number) {
  const db = getDb()
  const ret = db.select().from(returns).where(eq(returns.id, id)).get()
  if (!ret) throw new Error('Return not found.')

  const items = db.select().from(returnLineItems).where(eq(returnLineItems.returnId, id)).all()
  const cn = db.select().from(creditNotes).where(eq(creditNotes.returnId, id)).get() || null
  return { ...ret, lineItems: items, creditNote: cn }
}
