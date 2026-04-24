import { expect, test, describe, beforeAll } from 'vitest'
import { createPurchaseOrder, getPurchaseOrder, updatePurchaseOrder, transitionPurchaseOrder, listPurchaseOrders } from '../src/main/services/purchase-order.service'
import { createProduct } from '../src/main/services/product.service'
import { createSupplier } from '../src/main/services/supplier.service'
import { getInventorySummary, listInventoryBatchesByProduct } from '../src/main/services/inventory.service'

describe('Procurement Pipeline (PO + Inventory)', () => {
  test('PO Lifecycle End-to-End', async () => {
    // 1. Setup base entities
    const s = await createSupplier({
      name: 'Test Supplier',
      contactName: 'John',
      email: 'john@example.com',
      phone: '1234',
      notes: ''
    })
    const supplierId = s.id

    const p1 = await createProduct({
      name: 'Widget A',
      productGroup: 'Widgets',
      productFamily: 'Standard',
      color: 'Red',
      defaultUnitCost: 10,
      defaultUnitPrice: 20
    })
    const productId1 = p1.id

    const p2 = await createProduct({
      name: 'Widget B',
      productGroup: 'Widgets',
      productFamily: 'Standard',
      color: 'Blue',
      defaultUnitCost: 15,
      defaultUnitPrice: 25
    })
    const productId2 = p2.id

    // 2. Creates a Purchase Order in DRAFT
    const po = await createPurchaseOrder(
      { supplierId, description: 'Initial Draft PO' },
      [
        { productId: productId1, quantity: 100, unitCost: 10 },
        { productId: productId2, quantity: 50, unitCost: 15 }
      ]
    )
    expect(po.poNumber).toMatch(/^PO-\d+$/)
    expect(po.status).toBe('DRAFT')
    const poId = po.id

    // 3. Fetches a Purchase Order with line items
    const fetched = await getPurchaseOrder(poId)
    expect(fetched.supplier.name).toBe('Test Supplier')
    expect(fetched.items.length).toBe(2)

    // 4. Updates Purchase Order items cleanly while DRAFT
    const updated = await updatePurchaseOrder(
      poId,
      { description: 'Updated Draft' },
      [
        { productId: productId1, quantity: 200, unitCost: 9.5 }
      ]
    )
    expect(updated.description).toBe('Updated Draft')
    
    const reFetched = await getPurchaseOrder(poId)
    expect(reFetched.items.length).toBe(1)
    expect(reFetched.items[0].quantity).toBe(200)

    // 5. Blocks transition to IN_TRANSIT if empty line items
    const emptyPo = await createPurchaseOrder({ supplierId, description: 'Empty' }, [])
    await expect(transitionPurchaseOrder(emptyPo.id, 'IN_TRANSIT'))
      .rejects.toThrow('must contain at least one line item')

    // 6. Blocks invalid status transitions
    await expect(transitionPurchaseOrder(poId, 'DELIVERED'))
      .rejects.toThrow(/Cannot transition PO/)

    // 7. Transitions PO to IN_TRANSIT
    const transitioning = await transitionPurchaseOrder(poId, 'IN_TRANSIT')
    expect(transitioning.status).toBe('IN_TRANSIT')

    // 8. Blocks modification of PO in IN_TRANSIT state
    await expect(updatePurchaseOrder(poId, { description: 'Hacked' }))
      .rejects.toThrow(/Cannot modify Purchase Order/)

    // 9. Transitions PO to DELIVERED and triggers Inventory Batches
    const delivered = await transitionPurchaseOrder(poId, 'DELIVERED')
    expect(delivered.status).toBe('DELIVERED')
    
    const summary = await getInventorySummary()
    const widgetA = summary.find(s => s.productId === productId1)
    
    expect(widgetA).toBeDefined()
    expect(widgetA?.totalUnits).toBe(200)
    expect(widgetA?.availableUnits).toBe(200)
    expect(widgetA?.totalStockValue).toBe(200 * 9.5)

    const batches = await listInventoryBatchesByProduct(productId1)
    expect(batches.length).toBe(1)
    expect(batches[0].initialQty).toBe(200)

    // 10. List POs paginated mapping
    const list = await listPurchaseOrders({ page: 1, pageSize: 10 })
    expect(list.total).toBe(2)

    // 11. List POs with search string
    const searchList = await listPurchaseOrders({ page: 1, pageSize: 10, search: 'Empty' })
    expect(searchList.total).toBe(1)

    // 12. Block backwards transition
    await expect(transitionPurchaseOrder(poId, 'IN_TRANSIT'))
      .rejects.toThrow(/Cannot transition PO/)
  })
})
