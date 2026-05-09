// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Tax Repository
// ────────────────────────────────────────────────────────

import { getDb } from '../database/client'
import { taxProfiles, taxProfileComponents } from '../../shared/schema/tax'
import { eq, like, desc, sql } from 'drizzle-orm'

interface PaginationParams {
  page?: number | undefined
  pageSize?: number | undefined
  search?: string | undefined
}

export type TaxProfileWithComponents = typeof taxProfiles.$inferSelect & {
  components: (typeof taxProfileComponents.$inferSelect)[]
}

/**
 * Creates a global Tax Profile alongside its nested structural components natively.
 */
export async function createTaxProfile(
  data: { name: string; description?: string | undefined },
  components: { name: string; rate: number }[]
): Promise<TaxProfileWithComponents> {
  const db = getDb()

  return db.transaction((tx) => {
    const profileInsert = tx.insert(taxProfiles).values({
      name: data.name,
      description: data.description || ''
    }).returning().get()

    if (!profileInsert) throw new Error('Failed to instantiate Tax Profile internally.')

    const componentsToInsert = components.map(c => ({
      taxProfileId: profileInsert.id,
      name: c.name,
      rate: c.rate,
      type: 'PERCENTAGE'
    }))

    tx.insert(taxProfileComponents).values(componentsToInsert).run()

    const insertedComponents = tx.select().from(taxProfileComponents).where(eq(taxProfileComponents.taxProfileId, profileInsert.id)).all()

    return {
      ...profileInsert,
      components: insertedComponents
    }
  })
}

/**
 * Retrieves a Tax Profile globally including sub-components.
 */
export async function getTaxProfile(id: number): Promise<TaxProfileWithComponents> {
  const db = getDb()
  
  const profile = db.select().from(taxProfiles).where(eq(taxProfiles.id, id)).get()
  if (!profile) throw new Error(`Tax Profile ${id} completely missing.`)

  const components = db.select().from(taxProfileComponents).where(eq(taxProfileComponents.taxProfileId, id)).all()
  
  return { ...profile, components }
}

/**
 * Modifies Tax Rules securely. Replaces all components structurally instead of patching arrays loosely.
 */
export async function updateTaxProfile(
  id: number,
  data: { name?: string | undefined; description?: string | undefined; isActive?: boolean | undefined },
  components?: { name: string; rate: number }[]
): Promise<TaxProfileWithComponents> {
  const db = getDb()

  return db.transaction((tx) => {
    // 1. Update Core Metadata
    if (Object.keys(data).length > 0) {
      tx.update(taxProfiles).set({
        ...data,
        updatedAt: sql`(datetime('now'))`
      }).where(eq(taxProfiles.id, id)).run()
    }

    // 2. Wipe & Replace Components
    if (components !== undefined) {
      tx.delete(taxProfileComponents).where(eq(taxProfileComponents.taxProfileId, id)).run()
      
      if (components.length > 0) {
        const componentsToInsert = components.map(c => ({
          taxProfileId: id,
          name: c.name,
          rate: c.rate,
          type: 'PERCENTAGE'
        }))
        tx.insert(taxProfileComponents).values(componentsToInsert).run()
      }
    }

    // 3. Return reconstructed abstraction
    const profile = tx.select().from(taxProfiles).where(eq(taxProfiles.id, id)).get()
    if (!profile) throw new Error(`Integrity Exception: Tax Profile ${id} failed retrieval.`)
      
    const finalComponents = tx.select().from(taxProfileComponents).where(eq(taxProfileComponents.taxProfileId, id)).all()
    
    return { ...profile, components: finalComponents }
  })
}

/**
 * List profiles spanning aggregations globally.
 */
export async function listTaxProfiles(params: PaginationParams) {
  const db = getDb()
  const { page = 1, pageSize = 50, search = '' } = params
  const offset = (page - 1) * pageSize

  let query = db.select().from(taxProfiles).orderBy(desc(taxProfiles.id))
  let countQuery = db.select({ count: sql<number>`count(*)` }).from(taxProfiles)

  if (search.trim().length > 0) {
    const term = `%${search}%`
    query = db.select().from(taxProfiles).where(like(taxProfiles.name, term)).orderBy(desc(taxProfiles.id)) as any
    countQuery = db.select({ count: sql<number>`count(*)` }).from(taxProfiles).where(like(taxProfiles.name, term)) as any
  }

  const items = query.limit(pageSize).offset(offset).all()
  const totalRes = countQuery.get()
  const total = totalRes ? Number(totalRes.count) : 0

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize)
  }
}
