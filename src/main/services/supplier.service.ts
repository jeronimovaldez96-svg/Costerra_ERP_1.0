// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Supplier Service
// ────────────────────────────────────────────────────────

import * as repo from '../repositories/supplier.repository'
import type {
  Supplier,
  SupplierInsert,
  SupplierWithHistory,
  PaginatedResult,
  ListParams,
  LoosePartial
} from '../../shared/types'

export function listSuppliers(params: ListParams): PaginatedResult<Supplier> {
  const page = params.page ?? 1
  const pageSize = params.pageSize ?? 50
  const search = params.search ?? ''
  return repo.listSuppliers(page, pageSize, search, params.sortBy, params.sortDir)
}

export function getSupplier(id: number): SupplierWithHistory | null {
  const supplier = repo.getSupplier(id)
  return supplier
}

export function createSupplier(data: SupplierInsert): Supplier {
  return repo.createSupplier(data)
}

export function updateSupplier(id: number, data: LoosePartial<SupplierInsert>): Supplier {
  return repo.updateSupplier(id, data)
}
