import { describe, it, expect } from 'vitest'
import {
  listClients,
  getClient,
  createClient,
  updateClient
} from '../src/main/services/client.service'

describe('Client Service', () => {
  it('creates a client and generates a clientNumber', async () => {
    const client = await createClient({
      name: 'Walter',
      surname: 'White',
      address: '308 Negra Arroyo Lane',
      city: 'Albuquerque',
      zipCode: '87104',
      phone: '555-1234',
      notes: 'VIP'
    })

    expect(client.id).toBeGreaterThan(0)
    expect(client.clientNumber).toMatch(/^CLI-000\d{2}$/)
    expect(client.name).toBe('Walter')
  })

  it('tracks field history on update', async () => {
    const client = await createClient({
      name: 'Jesse',
      surname: 'Pinkman'
    })

    await updateClient(client.id, { city: 'Anchorage' })

    const fetched = await getClient(client.id)
    expect(fetched.city).toBe('Anchorage')
    expect(fetched.history).toHaveLength(1)
    expect(fetched.history[0]?.fieldName).toBe('city')
    expect(fetched.history[0]?.oldValue).toBe('')
    expect(fetched.history[0]?.newValue).toBe('Anchorage')
  })

  it('searches dynamically across name and city', async () => {
    await createClient({ name: 'Saul', surname: 'Goodman', city: 'Omaha' })
    await createClient({ name: 'Gustavo', surname: 'Fring', city: 'Albuquerque' })

    const res1 = await listClients({ page: 1, pageSize: 10, search: 'Omaha' })
    expect(res1.total).toBe(1)
    expect(res1.items[0]?.name).toBe('Saul')

    const res2 = await listClients({ page: 1, pageSize: 10, search: 'Fring' })
    expect(res2.total).toBe(1)
    expect(res2.items[0]?.name).toBe('Gustavo')
  })

  it('throws errors when client is not found', async () => {
    await expect(getClient(999)).rejects.toThrow('Client with ID 999 not found')
    await expect(updateClient(999, { city: 'Oops' })).rejects.toThrow('Client with ID 999 not found')
  })
})
