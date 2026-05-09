import { expect, test, describe } from 'vitest'
import { createPurchaseOrder, getPurchaseOrder, updatePurchaseOrder, transitionPurchaseOrder, listPurchaseOrders } from '../src/main/services/purchase-order.service'
import { createProduct } from '../src/main/services/product.service'
import { createSupplier } from '../src/main/services/supplier.service'
import { getInventorySummary, listInventoryBatchesByProduct } from '../src/main/services/inventory.service'

describe('Procurement Pipeline (PO + Inventory)', () => {
  test('PO Lifecycle End-to-End', () => {
    // 1. Setup base entities
    const s = createSupplier({
      name: 'Test Supplier',
      contactName: 'John',
      email: 'john@example.com',
      phone: '1234',
      notes: ''
    })
    const supplierId = s.id

    const p1 = createProduct({
      name: 'Widget A',
      productGroup: 'Widgets',
      productFamily: 'Standard',
      color: 'Red',
      defaultUnitCost: 10,
      defaultUnitPrice: 20
    })
    const productId1 = p1.id

    const p2 = createProduct({
      name: 'Widget B',
      productGroup: 'Widgets',
      productFamily: 'Standard',
      color: 'Blue',
      defaultUnitCost: 15,
      defaultUnitPrice: 25
    })
    const productId2 = p2.id

    // 2. Creates a Purchase Order in DRAFT
    const po = createPurchaseOrder(
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
    const fetched = getPurchaseOrder(poId)
    expect(fetched.supplier.name).toBe('Test Supplier')
    expect(fetched.items.length).toBe(2)

    // 4. Updates Purchase Order items cleanly while DRAFT
    const updated = updatePurchaseOrder(
      poId,
      { description: 'Updated Draft' },
      [
        { productId: productId1, quantity: 200, unitCost: 9.5 }
      ]
    )
    expect(updated.description).toBe('Updated Draft')
    
    const reFetched = getPurchaseOrder(poId)
    expect(reFetched.items.length).toBe(1)
    expect(reFetched.items[0]!.quantity).toBe(200)

    // 5. Blocks transition to ORDERED if empty line items
    const emptyPo = createPurchaseOrder({ supplierId, description: 'Empty' }, [])
    expect(() => transitionPurchaseOrder(emptyPo.id, 'ORDERED'))
      .toThrow('must contain at least one line item')

    // 6. Blocks invalid status transitions
    expect(() => transitionPurchaseOrder(poId, 'DELIVERED'))
      .toThrow(/Cannot transition PO/)

    // 7. Transitions PO to IN_TRANSIT (DRAFT -> ORDERED -> IN_TRANSIT)
    transitionPurchaseOrder(poId, 'ORDERED')
    const transitioning = transitionPurchaseOrder(poId, 'IN_TRANSIT')
    expect(transitioning.status).toBe('IN_TRANSIT')

    // 8. Blocks modification of PO in IN_TRANSIT state
    expect(() => updatePurchaseOrder(poId, { description: 'Hacked' }))
      .toThrow(/Cannot modify Purchase Order/)

    // 9. Transitions PO to DELIVERED and triggers Inventory Batches
    const delivered = transitionPurchaseOrder(poId, 'DELIVERED')
    expect(delivered.status).toBe('DELIVERED')
    
    // In our simplified system, DELIVERED status transitions directly into IN_INVENTORY batches
    // Wait, let's check transitionPurchaseOrder logic.
    // Actually, transitionPurchaseOrder(id, 'IN_INVENTORY') is what triggers batches.
    transitionPurchaseOrder(poId, 'IN_INVENTORY')
    
    const summary = getInventorySummary()
    const widgetA = summary.find(s => s.productId === productId1)
    
    expect(widgetA).toBeDefined()
    expect(widgetA?.totalUnits).toBe(200)
    expect(widgetA?.availableUnits).toBe(200)
    expect(widgetA?.totalStockValue).toBe(200 * 9.5)

    const batches = listInventoryBatchesByProduct(productId1)
    expect(batches.length).toBe(1)
    expect(batches[0]!.initialQty).toBe(200)

    // 10. List POs paginated mapping
    const list = listPurchaseOrders({ page: 1, pageSize: 10 })
    expect(list.total).toBe(2)

    // 11. List POs with search string
    const searchList = listPurchaseOrders({ page: 1, pageSize: 10, search: 'Empty' })
    expect(searchList.total).toBe(1)

    // 12. Block backwards transition
    expect(() => transitionPurchaseOrder(poId, 'IN_TRANSIT'))
      .toThrow(/Cannot transition PO/)
  })
})
