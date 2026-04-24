import { describe, it, expect, vi } from 'vitest'
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  toggleProductActive
} from '../src/main/services/product.service'
import * as fileManager from '../src/main/utils/file-manager'

vi.mock('../src/main/utils/file-manager', () => ({
  saveProductImage: vi.fn(() => 'products/test-image.png'),
  resolveImagePath: vi.fn(),
  deleteImage: vi.fn()
}))

describe('Product Service', () => {
  it('creates a new product and generates a SKU', async () => {
    const product = await createProduct({
      name: 'Test Product',
      productGroup: 'Electronics',
      productFamily: 'Audio',
      color: 'Black',
      defaultUnitCost: 100,
      defaultUnitPrice: 150
    })

    expect(product.id).toBeGreaterThan(0)
    expect(product.skuNumber).toMatch(/^SKU-000\d{2}$/)
    expect(product.name).toBe('Test Product')
  })

  it('updates a product and creates an audit log entry', async () => {
    const product = await createProduct({
      name: 'Old Name',
      productGroup: 'Grp',
      productFamily: 'Fam',
      color: 'Red',
      defaultUnitCost: 10,
      defaultUnitPrice: 20
    })

    const updated = await updateProduct(product.id, { name: 'New Name' })
    expect(updated.name).toBe('New Name')

    const fetched = await getProduct(product.id)
    expect(fetched.history).toHaveLength(1)
    expect(fetched.history[0]?.fieldName).toBe('name')
    expect(fetched.history[0]?.oldValue).toBe('Old Name')
    expect(fetched.history[0]?.newValue).toBe('New Name')
  })

  it('toggles product active status', async () => {
    const product = await createProduct({
      name: 'Toggle Me',
      productGroup: 'Grp',
      productFamily: 'Fam',
      color: 'Blue',
      defaultUnitCost: 1,
      defaultUnitPrice: 2
    })

    expect(product.isActive).toBe(true)

    const toggled = await toggleProductActive(product.id)
    expect(toggled.isActive).toBe(false)

    const fetched = await getProduct(product.id)
    expect(fetched.history.some((h) => h.fieldName === 'isActive')).toBe(true)
  })

  it('lists products with pagination and search', async () => {
    await createProduct({
      name: 'Alpha Product',
      productGroup: 'A',
      productFamily: 'F1',
      color: 'White',
      defaultUnitCost: 1,
      defaultUnitPrice: 2
    })
    
    await createProduct({
      name: 'Beta Item',
      productGroup: 'B',
      productFamily: 'F2',
      color: 'Black',
      defaultUnitCost: 1,
      defaultUnitPrice: 2
    })

    const result = await listProducts({ page: 1, pageSize: 10, search: 'Alpha' })
    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.name).toBe('Alpha Product')
    expect(result.total).toBe(1)
  })

  it('throws errors when product is not found', async () => {
    await expect(getProduct(999)).rejects.toThrow('Product with ID 999 not found')
    await expect(updateProduct(999, { name: 'Oops' })).rejects.toThrow('Product with ID 999 not found')
    await expect(toggleProductActive(999)).rejects.toThrow('Product with ID 999 not found')
  })

  it('handles image paths correctly', async () => {
    const product = await createProduct({
      name: 'Image Item',
      productGroup: 'G',
      productFamily: 'F',
      color: 'Red',
      defaultUnitCost: 1,
      defaultUnitPrice: 1
    }, '/path/to/source.png')

    expect(product.imagePath).toBe('products/test-image.png')
    expect(fileManager.saveProductImage).toHaveBeenCalledWith('/path/to/source.png')

    const updated = await updateProduct(product.id, { color: 'Blue' }, '/path/to/new.png')
    expect(updated.imagePath).toBe('products/test-image.png')
    expect(fileManager.deleteImage).toHaveBeenCalledWith('products/test-image.png')
  })
})
