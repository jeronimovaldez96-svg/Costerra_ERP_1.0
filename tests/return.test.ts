import { expect, test, describe } from 'vitest'
import { createPurchaseOrder, transitionPurchaseOrder } from '../src/main/services/purchase-order.service'
import { createProduct } from '../src/main/services/product.service'
import { createSupplier } from '../src/main/services/supplier.service'
import { createClient } from '../src/main/services/client.service'
import { createSalesLead } from '../src/main/services/sales-lead.service'
import { createQuote, transitionQuote } from '../src/main/services/quote.service'
import { executeSale, getSale } from '../src/main/services/sale.service'
import { getInventorySummary } from '../src/main/services/inventory.service'
import { createReturn, processReturn, getReturnById } from '../src/main/services/return.service'
import { getDb } from '../src/main/database/client'
import { inventoryBatches } from '../src/shared/schema'
import { eq, and } from 'drizzle-orm'

describe('Return & Credit Note Reversal System', () => {
  test('Complete Execution & Restocking flow', async () => {
    // 1. Setup Base Models
    const supplier = await createSupplier({ name: 'Ret Supplier' })
    const product = await createProduct({ name: 'Ret Widget', productGroup: 'A', productFamily: 'B', color: 'C', defaultUnitCost: 10, defaultUnitPrice: 20 })
    
    // Intake 100 widgets @ $10 each
    const po = await createPurchaseOrder({ supplierId: supplier.id }, [{ productId: product.id, quantity: 100, unitCost: 10 }])
    await transitionPurchaseOrder(po.id, 'IN_TRANSIT')
    await transitionPurchaseOrder(po.id, 'DELIVERED')

    // 2. Setup Client and Quote (positional args: clientId, name)
    const client = await createClient({ name: 'Bob', surname: 'Returns' })
    const lead = await createSalesLead(client.id, 'Lead 1')
    
    // Selling 30 items @ $20 = $600
    const quote = await createQuote({ salesLeadId: lead.id }, [{ productId: product.id, quantity: 30 }])
    await transitionQuote(quote.id, 'SENT')
    
    // Execute Sale
    const saleRaw = await executeSale(quote.id)
    const sale = await getSale(saleRaw.id)

    // Verify Inventory Post-Sale
    const sum1 = await getInventorySummary()
    const p1 = sum1.find(s => s.productId === product.id)
    expect(p1!.availableUnits).toBe(70) // 100 - 30 sold

    // 3. Initiate a Return for 15 items (Partial Return)
    const saleLineItem = sale.lineItems[0]

    const ret = await createReturn(sale.id, 'Customer changed mind', [
      { saleLineItemId: saleLineItem.id, quantityReturned: 15, restockDisposition: 'RESTOCK' }
    ])

    expect(ret.status).toBe('DRAFT')
    expect(ret.totalRefund).toBe(15 * 20) // 15 items @ $20 = $300 refund natively.

    // 4. Process Return (Restocks Inventory & Generates Credit Note)
    const processed = await processReturn(ret.id)
    expect(processed!.status).toBe('PROCESSED')

    // 5. Verify physical restocking logic via exact Return Batches
    const sum2 = await getInventorySummary()
    const p2 = sum2.find(s => s.productId === product.id)
    
    // 70 originally left + 15 refunded = 85 units physically resting on shelf.
    expect(p2!.availableUnits).toBe(85)
    
    // Validate the Credit Note exists
    const fullRet = await getReturnById(ret.id)
    expect(fullRet.creditNote).not.toBeNull()
    expect(fullRet.creditNote!.amount).toBe(300)

    // Validate the InventoryBatch explicitly marks it as decoupled from POs
    const db = getDb()
    const returnBatch = db.select().from(inventoryBatches)
      .where(and(
        eq(inventoryBatches.productId, product.id),
        eq(inventoryBatches.isReturnBatch, true)
      )).get()
    
    expect(returnBatch).toBeDefined()
    expect(returnBatch!.initialQty).toBe(15)
    expect(returnBatch!.unitCost).toBe(10) // Relies precisely on the execution historical blendedCost which was 10.

    // 7. Verify over-return is blocked
    await expect(createReturn(sale.id, 'Trying too many', [
      { saleLineItemId: saleLineItem.id, quantityReturned: 999, restockDisposition: 'RESTOCK' }
    ])).rejects.toThrow(/exceeds bounds/)

    // 8. Verify re-processing a completed return is blocked
    await expect(processReturn(ret.id)).rejects.toThrow(/DRAFT/)
  })
})
