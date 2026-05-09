// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Tax Service
// ────────────────────────────────────────────────────────

import * as taxRepo from '../repositories/tax.repository'
import type { TaxProfileWithComponents } from '../repositories/tax.repository'

interface PaginationParams {
  page?: number | undefined
  pageSize?: number | undefined
  search?: string | undefined
}

export function createTaxProfile(
  data: { name: string; description?: string | undefined },
  components: { name: string; rate: number }[]
): TaxProfileWithComponents {
  return taxRepo.createTaxProfile(data, components)
}

export function getTaxProfile(id: number): TaxProfileWithComponents {
  return taxRepo.getTaxProfile(id)
}

export function updateTaxProfile(
  id: number,
  data: { name?: string | undefined; description?: string | undefined; isActive?: boolean | undefined },
  components?: { name: string; rate: number }[]
): TaxProfileWithComponents {
  return taxRepo.updateTaxProfile(id, data, components)
}

export function listTaxProfiles(params: PaginationParams) {
  return taxRepo.listTaxProfiles(params)
}
