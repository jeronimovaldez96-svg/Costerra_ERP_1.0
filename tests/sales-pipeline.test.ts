import { expect, test, describe } from 'vitest'
import { createProduct } from '../src/main/services/product.service'
import { createSupplier } from '../src/main/services/supplier.service'
import { createClient } from '../src/main/services/client.service'
import { createPurchaseOrder, transitionPurchaseOrder } from '../src/main/services/purchase-order.service'
import { createTaxProfile } from '../src/main/services/tax.service'
import { createSalesLead, getSalesLead, updateSalesLeadStatus, listSalesLeads } from '../src/main/services/sales-lead.service'
import { createQuote, getQuote, transitionQuote, getQuoteVersions, updateQuote, listQuotes } from '../src/main/services/quote.service'
import { executeSale, getSale, listSales } from '../src/main/services/sale.service'
import { getInventorySummary } from '../src/main/services/inventory.service'

describe('Sales Pipeline End-to-End', () => {
  test('Complete Lead → Quote → Sale Lifecycle', () => {
    // ═══════════════════════════════════════════════════
    // SETUP: Products, Supplier, Client, Inventory, Tax
    // ═══════════════════════════════════════════════════

    const supplier = createSupplier({
      name: 'Pipeline Supplier', contactName: '', email: '', phone: '', notes: ''
    })

    const productA = createProduct({
      name: 'Pipeline Widget A', productGroup: 'PG', productFamily: 'PF',
      color: 'Red', defaultUnitCost: 10, defaultUnitPrice: 25
    })

    const productB = createProduct({
      name: 'Pipeline Widget B', productGroup: 'PG', productFamily: 'PF',
      color: 'Blue', defaultUnitCost: 8, defaultUnitPrice: 20
    })

    // Stock inventory via PO → DELIVERED
    const po = createPurchaseOrder(
      { supplierId: supplier.id },
      [
        { productId: productA.id, quantity: 100, unitCost: 10 },
        { productId: productB.id, quantity: 50, unitCost: 8 }
      ]
    )
    transitionPurchaseOrder(po.id, 'ORDERED')
    transitionPurchaseOrder(po.id, 'IN_TRANSIT')
    transitionPurchaseOrder(po.id, 'DELIVERED')
    transitionPurchaseOrder(po.id, 'IN_INVENTORY')

    // Create tax profile: 8.875% (NY Metro)
    const taxProfile = createTaxProfile(
      { name: 'Test Tax', description: 'Test' },
      [
        { name: 'State', rate: 4.0 },
        { name: 'City', rate: 4.875 }
      ]
    )

    // Create client
    const client = createClient({
      name: 'John', surname: 'Doe', address: '', city: '', zipCode: '', phone: '', notes: ''
    })

    // ═══════════════════════════════════════════════════
    // 1. CREATE SALES LEAD
    // ═══════════════════════════════════════════════════
    const lead = createSalesLead(client.id, 'Big Office Deal')
    expect(lead.leadNumber).toMatch(/^LEAD-\d+$/)
    expect(lead.status).toBe('IN_PROGRESS')

    // ═══════════════════════════════════════════════════
    // 2. CREATE QUOTE (DRAFT)
    // ═══════════════════════════════════════════════════
    const quote = createQuote(
      { salesLeadId: lead.id, taxProfileId: taxProfile.id, notes: 'First proposal' },
      [
        { productId: productA.id, quantity: 10 },
        { productId: productB.id, quantity: 5 }
      ]
    )
    expect(quote.status).toBe('DRAFT')
    expect(quote.lineItems.length).toBe(2)
    // Line totals use default product prices
    expect(quote.lineItems[0]!.unitPrice).toBe(25) // productA price
    expect(quote.lineItems[0]!.lineTotal).toBe(250) // 10 * 25

    // ═══════════════════════════════════════════════════
    // 3. TRANSITION QUOTE TO SENT (reserves inventory + version snapshot)
    // ═══════════════════════════════════════════════════
    transitionQuote(quote.id, 'SENT')

    // Verify version was created
    const versions = getQuoteVersions(quote.id)
    expect(versions.length).toBe(1)
    expect(versions[0]!.versionNumber).toBe(1)

    // Verify inventory got reserved
    const summaryAfterSent = getInventorySummary()
    const widgetAAfterSent = summaryAfterSent.find(s => s.productId === productA.id)
    expect(widgetAAfterSent?.reservedUnits).toBe(10)
    expect(widgetAAfterSent?.availableUnits).toBe(90) // 100 - 10

    const widgetBAfterSent = summaryAfterSent.find(s => s.productId === productB.id)
    expect(widgetBAfterSent?.reservedUnits).toBe(5)
    expect(widgetBAfterSent?.availableUnits).toBe(45) // 50 - 5

    // ═══════════════════════════════════════════════════
    // 4. CREATE A SECOND (COMPETING) QUOTE
    // ═══════════════════════════════════════════════════
    const quote2 = createQuote(
      { salesLeadId: lead.id, notes: 'Alternative proposal' },
      [{ productId: productA.id, quantity: 5 }]
    )
    transitionQuote(quote2.id, 'SENT')

    // Total A reserved: 10 + 5 = 15
    const summaryAfter2 = getInventorySummary()
    const widgetAAfter2 = summaryAfter2.find(s => s.productId === productA.id)
    expect(widgetAAfter2?.reservedUnits).toBe(15)

    // ═══════════════════════════════════════════════════
    // 5. EXECUTE SALE FROM QUOTE 1
    // ═══════════════════════════════════════════════════
    const sale = executeSale(quote.id)

    expect(sale.saleNumber).toMatch(/^SALE-\d+$/)
    expect(sale.totalRevenue).toBe(350) // (10*25) + (5*20)
    expect(sale.totalCost).toBe(140) // (10*10) + (5*8)

    // Tax = 8.875% of 350 = 31.0625
    expect(sale.taxAmount).toBeCloseTo(31.0625, 2)

    // Profit = revenue - cost - tax
    expect(sale.profitAmount).toBeCloseTo(350 - 140 - 31.0625, 2)

    // ═══════════════════════════════════════════════════
    // 6. VERIFY CASCADES
    // ═══════════════════════════════════════════════════

    // Quote 1 should now be SOLD
    const soldQuote = getQuote(quote.id)
    expect(soldQuote.status).toBe('SOLD')

    // Quote 2 (sibling) should be NOT_SOLD
    const rejectedSibling = getQuote(quote2.id)
    expect(rejectedSibling.status).toBe('NOT_SOLD')

    // Lead should STILL be IN_PROGRESS (per user request: manual status update)
    const leadAfterSale = getSalesLead(lead.id)
    expect(leadAfterSale.status).toBe('IN_PROGRESS')

    // Manually update lead to CLOSED_SALE
    updateSalesLeadStatus(lead.id, 'CLOSED_SALE')
    const soldLead = getSalesLead(lead.id)
    expect(soldLead.status).toBe('CLOSED_SALE')

    // ═══════════════════════════════════════════════════
    // 7. VERIFY INVENTORY AFTER SALE
    // ═══════════════════════════════════════════════════
    const finalSummary = getInventorySummary()

    const finalA = finalSummary.find(s => s.productId === productA.id)
    // Started with 100. Sold 10. Reserved 15 but quote2 was NOT_SOLD.
    // FIFO consumed 10 from remainingQty. reservedQty reduced by consumeStockFifo.
    // quote2 was in SENT (reserved 5), but cascaded to NOT_SOLD — 
    // the sale does NOT explicitly release quote2's reservations here;
    // that happens naturally because consumeStockFifo reduces reservedQty with MAX(0, reserved - consumed).
    expect(finalA?.totalUnits).toBe(90) // 100 - 10 consumed

    const finalB = finalSummary.find(s => s.productId === productB.id)
    expect(finalB?.totalUnits).toBe(45) // 50 - 5 consumed

    // ═══════════════════════════════════════════════════
    // 8. VERIFY SALE DETAILS
    // ═══════════════════════════════════════════════════
    const saleDetails = getSale(sale.id)
    expect(saleDetails.lineItems.length).toBe(2)
    expect(saleDetails.lineItems[0]!.blendedUnitCost).toBe(10) // Single batch, so blended = raw
    expect(saleDetails.lineItems[1]!.blendedUnitCost).toBe(8)

    // ═══════════════════════════════════════════════════
    // 9. BLOCK DUPLICATE SALE
    // ═══════════════════════════════════════════════════
    expect(() => executeSale(quote.id))
      .toThrow(/must be SENT/)
  })

  test('Quote rejection releases inventory reservations', () => {
    // Setup
    const supplier = createSupplier({
      name: 'Rej Supplier', contactName: '', email: '', phone: '', notes: ''
    })
    const product = createProduct({
      name: 'Rej Widget', productGroup: 'X', productFamily: 'X',
      color: 'X', defaultUnitCost: 5, defaultUnitPrice: 15
    })
    const po = createPurchaseOrder(
      { supplierId: supplier.id },
      [{ productId: product.id, quantity: 40, unitCost: 5 }]
    )
    transitionPurchaseOrder(po.id, 'ORDERED')
    transitionPurchaseOrder(po.id, 'IN_TRANSIT')
    transitionPurchaseOrder(po.id, 'DELIVERED')
    transitionPurchaseOrder(po.id, 'IN_INVENTORY')

    const client = createClient({
      name: 'Jane', surname: 'Smith', address: '', city: '', zipCode: '', phone: '', notes: ''
    })
    const lead = createSalesLead(client.id, 'Rejected Deal')

    // Create and send a quote
    const quote = createQuote(
      { salesLeadId: lead.id },
      [{ productId: product.id, quantity: 20 }]
    )
    transitionQuote(quote.id, 'SENT')

    // Verify reserved
    let summary = getInventorySummary()
    let widget = summary.find(s => s.productId === product.id)
    expect(widget?.reservedUnits).toBe(20)

    // Reject the quote — should release reservations
    transitionQuote(quote.id, 'REJECTED')

    summary = getInventorySummary()
    widget = summary.find(s => s.productId === product.id)
    expect(widget?.reservedUnits).toBe(0)
    expect(widget?.availableUnits).toBe(40) // Fully available again
  })

  test('Pagination, Updates, and List Endpoints', () => {
    // Generate some clients and products
    const client1 = createClient({ name: 'List', surname: 'One', address: '', city: '', zipCode: '', phone: '', notes: '' })
    const supplier = createSupplier({ name: 'List Sup', contactName: '', email: '', phone: '', notes: '' })
    const productList = createProduct({
      name: 'List Widget', productGroup: 'PG', productFamily: 'PF',
      color: 'Green', defaultUnitCost: 10, defaultUnitPrice: 25
    })
    
    const po = createPurchaseOrder({ supplierId: supplier.id }, [{ productId: productList.id, quantity: 50, unitCost: 10 }])
    transitionPurchaseOrder(po.id, 'ORDERED')
    transitionPurchaseOrder(po.id, 'IN_TRANSIT')
    transitionPurchaseOrder(po.id, 'DELIVERED')
    transitionPurchaseOrder(po.id, 'IN_INVENTORY')

    // Create Leads
    const lead1 = createSalesLead(client1.id, 'Alpha')
    const lead2 = createSalesLead(client1.id, 'Beta')

    const leads = getSalesLead(lead1.id)
    expect(leads.name).toBe('Alpha')

    // Attach dummy quotes to lead1 to hit the cascade coverage blocks
    const cascadeQuoteDraft = createQuote({ salesLeadId: lead1.id }, [{ productId: productList.id, quantity: 1 }])
    const cascadeQuoteSent = createQuote({ salesLeadId: lead1.id }, [{ productId: productList.id, quantity: 1 }])
    transitionQuote(cascadeQuoteSent.id, 'SENT')

    // Close the lead, triggering the unravel cascades for both drafted and sent child Quotes
    const updatedLead = updateSalesLeadStatus(lead1.id, 'CLOSED_NO_SALE')
    expect(updatedLead.status).toBe('CLOSED_NO_SALE')
    
    // Verify cascades triggered correctly
    const draftedResult = getQuote(cascadeQuoteDraft.id)
    const sentResult = getQuote(cascadeQuoteSent.id)
    expect(draftedResult.status).toBe('NOT_SOLD')
    expect(sentResult.status).toBe('NOT_SOLD')

    const leadList = listSalesLeads({ search: 'Beta' })
    expect(leadList.total).toBe(1)
    expect(leadList.items[0]!.name).toBe('Beta')

    // Create quotes and update them
    const quote1 = createQuote(
      { salesLeadId: lead2.id, notes: 'Quote A' },
      [{ productId: productList.id, quantity: 10 }]
    )
    
    const updatedQuote = updateQuote(quote1.id, { notes: 'Updated Notes' }, [{ productId: productList.id, quantity: 20 }])
    expect(updatedQuote.notes).toBe('Updated Notes')
    expect(updatedQuote.lineItems[0]!.quantity).toBe(20)

    const quoteList = listQuotes({ search: quote1.quoteNumber })
    expect(quoteList.total).toBe(1)
    expect(quoteList.items[0]!.notes).toBe('Updated Notes')

    // Sales list (just verify the endpoint returns)
    const salesList = listSales({ page: 1 })
    expect(salesList.page).toBe(1)
  })

  test('Invalid Quote Transitions', () => {
    // Generate a quote
    const client = createClient({ name: 'Invalid', surname: 'Test', address: '', city: '', zipCode: '', phone: '', notes: '' })
    const product = createProduct({
      name: 'Transition Widget', productGroup: 'PG', productFamily: 'PF',
      color: 'Red', defaultUnitCost: 10, defaultUnitPrice: 25
    })
    const lead = createSalesLead(client.id, 'Alpha')
    const quote = createQuote(
      { salesLeadId: lead.id, notes: 'Quote A' },
      [{ productId: product.id, quantity: 10 }] 
    )

    // Cannot transition from DRAFT to SOLD directly
    expect(() => transitionQuote(quote.id, 'SOLD' as any)).toThrow(/Cannot transition Quote/)
  })
})

