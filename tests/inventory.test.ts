import { expect, test, describe, beforeAll } from 'vitest'
import { createPurchaseOrder, transitionPurchaseOrder } from '../src/main/services/purchase-order.service'
import { createProduct } from '../src/main/services/product.service'
import { createSupplier } from '../src/main/services/supplier.service'
import { getInventorySummary, listInventoryBatchesByProduct, adjustInventoryReservation } from '../src/main/services/inventory.service'

describe('Inventory Reservation System', () => {
  test('FIFO Reservation Lifecycle', async () => {
    // 1. Setup Base Models
    const s = await createSupplier({
      name: 'Res Supplier',
      contactName: '',
      email: '',
      phone: '',
      notes: ''
    })
    const supplierId = s.id

    const p = await createProduct({
      name: 'Reservation Widget',
      productGroup: 'ResGroup',
      productFamily: 'ResFamily',
      color: 'Green',
      defaultUnitCost: 5,
      defaultUnitPrice: 10
    })
    const productId = p.id

    // Inject 2 separate batches via POs to test FIFO allocation
    const po1 = await createPurchaseOrder({ supplierId }, [{ productId, quantity: 50, unitCost: 5 }])
    await transitionPurchaseOrder(po1.id, 'IN_TRANSIT')
    await transitionPurchaseOrder(po1.id, 'DELIVERED')

    const po2 = await createPurchaseOrder({ supplierId }, [{ productId, quantity: 100, unitCost: 5 }])
    await transitionPurchaseOrder(po2.id, 'IN_TRANSIT')
    await transitionPurchaseOrder(po2.id, 'DELIVERED')

    // 2. Initial availability shows correctly
    let summary = await getInventorySummary()
    let widget = summary.find(s => s.productId === productId)
    
    expect(widget?.totalUnits).toBe(150)
    expect(widget?.availableUnits).toBe(150)
    expect(widget?.reservedUnits).toBe(0)

    // 3. Reserves stock strictly spanning oldest batches (FIFO)
    await adjustInventoryReservation(productId, 80)

    summary = await getInventorySummary()
    widget = summary.find(s => s.productId === productId)
    
    expect(widget?.totalUnits).toBe(150)
    expect(widget?.reservedUnits).toBe(80)
    expect(widget?.availableUnits).toBe(70) // 150 - 80

    let batches = await listInventoryBatchesByProduct(productId)
    // Map order by id ASC (id matches insertion order)
    expect(batches[0].reservedQty).toBe(50) // Oldest batch totally consumed
    expect(batches[1].reservedQty).toBe(30) // New batch partially consumed

    // 4. Blocks reserving more stock than available
    await expect(adjustInventoryReservation(productId, 100))
      .rejects.toThrow(/Insufficient available stock/)

    summary = await getInventorySummary()
    widget = summary.find(s => s.productId === productId)
    expect(widget?.reservedUnits).toBe(80)

    // 5. Releases stock releasing newest batches first (LIFO decrement)
    await adjustInventoryReservation(productId, -20)

    batches = await listInventoryBatchesByProduct(productId)
    expect(batches[0].reservedQty).toBe(50) // Still maxed
    expect(batches[1].reservedQty).toBe(10) // 30 - 20 = 10

    // 6. Prevents releasing unheld stock
    await expect(adjustInventoryReservation(productId, -100))
      .rejects.toThrow(/Integrity Exception/)
  })

  test('Physical stock underflow throws error during FIFO consumption', async () => {
    // We start with 0 stock for this new product
    const product4 = await createProduct({
      name: 'Underflow Widget', productGroup: 'PG', productFamily: 'PF',
      color: 'Blue', defaultUnitCost: 10, defaultUnitPrice: 25
    })

    const { getDb } = await import('../src/main/database/client')
    const { consumeStockFifo } = await import('../src/main/repositories/inventory.repository')
    const db = getDb()

    expect(() => {
      db.transaction((tx) => {
         consumeStockFifo(tx, product4.id, 50)
      })
    }).toThrow(/Insufficient physical stock/)
  })
})
