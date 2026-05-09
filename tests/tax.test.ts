import { expect, test, describe } from 'vitest'
import { createTaxProfile, updateTaxProfile, getTaxProfile, listTaxProfiles } from '../src/main/services/tax.service'

describe('Tax Engine System', () => {
  test('Tax Profile Lifecycle End-to-End', () => {
    // 1. Creates a Tax Profile spanning multiple components
    const profile = createTaxProfile(
      { name: 'NY Metro Rate', description: 'Metropolitan state + local' },
      [
        { name: 'State Tax', rate: 4.0 },   // 4%
        { name: 'City Tax', rate: 4.875 }, // 4.875%
      ]
    )

    expect(profile.name).toBe('NY Metro Rate')
    expect(profile.components.length).toBe(2)
    expect(profile.components[0]!.rate).toBe(4.0)
    expect(profile.components[1]!.rate).toBe(4.875)
    const globalProfileId = profile.id

    // 2. Calculates aggregated total structurally natively
    const fetchedProfile = getTaxProfile(globalProfileId)
    expect(fetchedProfile.components.reduce((sum, c) => sum + c.rate, 0)).toBe(8.875)

    // 3. Modifies structural properties overwriting outdated rules seamlessly
    const updated = updateTaxProfile(globalProfileId, { name: 'NY Metro Rate (Updated)' }, [
      { name: 'State Tax', rate: 4.0 },
      { name: 'City Tax', rate: 5.0 },
    ])
    
    expect(updated.name).toBe('NY Metro Rate (Updated)')
    expect(updated.components.length).toBe(2)
    expect(updated.components.find(c => c.name === 'City Tax')?.rate).toBe(5.0)

    const refetched = getTaxProfile(globalProfileId)
    expect(refetched.components.length).toBe(2)

    // 4. Updates metadata without mutating components
    const updatedMeta = updateTaxProfile(globalProfileId, { isActive: false })
    expect(updatedMeta.isActive).toBe(false)
    expect(updatedMeta.components.length).toBe(2)

    // 5. Blocks isolated duplicate names
    expect(() => 
      createTaxProfile({ name: 'NY Metro Rate (Updated)' }, [{ name: 'Tax', rate: 1 }])
    ).toThrow() 

    // 6. Paginates properly across dynamic strings
    const list = listTaxProfiles({ page: 1, pageSize: 10, search: 'Metro' })
    expect(list.total).toBe(1)

    const fullList = listTaxProfiles({ page: 1, pageSize: 10 })
    expect(fullList.total).toBe(1)
  })
})
