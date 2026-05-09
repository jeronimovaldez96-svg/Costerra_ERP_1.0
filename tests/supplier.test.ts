import { describe, it, expect } from 'vitest'
import {
  listSuppliers,
  getSupplier,
  createSupplier,
  updateSupplier
} from '../src/main/services/supplier.service'

describe('Supplier Service', () => {
  it('creates and retrieves a supplier', () => {
    const supplier = createSupplier({
      name: 'Acme Corp',
      contactName: 'John Doe',
      phone: '555-1234',
      email: 'john@acme.com',
      notes: 'Test supplier'
    })

    expect(supplier.id).toBeGreaterThan(0)
    expect(supplier.name).toBe('Acme Corp')

    const fetched = getSupplier(supplier.id)
    expect(fetched!.name).toBe('Acme Corp')
    expect(fetched!.history).toHaveLength(0)
  })

  it('records audit history on supplier update', () => {
    const supplier = createSupplier({
      name: 'Globex',
      contactName: 'Hank'
    })

    updateSupplier(supplier.id, { contactName: 'Scorpio', phone: '555-9999' })

    const fetched = getSupplier(supplier.id)
    expect(fetched!.contactName).toBe('Scorpio')
    // One log for contactName, one for phone
    expect(fetched!.history.length).toBeGreaterThanOrEqual(1)
    expect(fetched!.history.some((h) => h.fieldName === 'contactName' && h.newValue === 'Scorpio')).toBe(true)
  })

  it('supports fuzzy search across supplier fields', () => {
    createSupplier({ name: 'Stark Industries', contactName: 'Tony' })
    createSupplier({ name: 'Wayne Enterprises', contactName: 'Bruce' })

    const res1 = listSuppliers({ page: 1, pageSize: 5, search: 'Stark' })
    expect(res1.items).toHaveLength(1)
    expect(res1.items[0]?.name).toBe('Stark Industries')

    const res2 = listSuppliers({ page: 1, pageSize: 5, search: 'Bruce' })
    expect(res2.items).toHaveLength(1)
    expect(res2.items[0]?.name).toBe('Wayne Enterprises')
  })

  it('throws errors when supplier is not found', () => {
    expect(getSupplier(999)).toBeNull()
    expect(() => updateSupplier(999, { name: 'Oops' })).toThrow('Supplier with ID 999 not found')
  })
})
