// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Tax Service
// ────────────────────────────────────────────────────────

import * as taxRepo from '../repositories/tax.repository'
import type { TaxProfileWithComponents } from '../repositories/tax.repository'

type PaginationParams = {
  page?: number
  pageSize?: number
  search?: string
}

export async function createTaxProfile(
  data: { name: string; description?: string },
  components: { name: string; rate: number }[]
): Promise<TaxProfileWithComponents> {
  return taxRepo.createTaxProfile(data, components)
}

export async function getTaxProfile(id: number): Promise<TaxProfileWithComponents> {
  return taxRepo.getTaxProfile(id)
}

export async function updateTaxProfile(
  id: number,
  data: { name?: string; description?: string; isActive?: boolean },
  components?: { name: string; rate: number }[]
): Promise<TaxProfileWithComponents> {
  return taxRepo.updateTaxProfile(id, data, components)
}

export async function listTaxProfiles(params: PaginationParams) {
  return taxRepo.listTaxProfiles(params)
}
