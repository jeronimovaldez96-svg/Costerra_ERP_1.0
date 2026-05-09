// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Supplier Service
// ────────────────────────────────────────────────────────

import * as repo from '../repositories/supplier.repository'
import type {
  Supplier,
  SupplierInsert,
  SupplierWithHistory,
  PaginatedResult,
  ListParams
} from '../../shared/types'

export async function listSuppliers(params: ListParams): Promise<PaginatedResult<Supplier>> {
  const page = params.page ?? 1
  const pageSize = params.pageSize ?? 50
  const search = params.search ?? ''
  return repo.listSuppliers(page, pageSize, search, params.sortBy, params.sortDir)
}

export async function getSupplier(id: number): Promise<SupplierWithHistory> {
  const supplier = await repo.getSupplier(id)
  if (supplier === null) {
    throw new Error(`Supplier with ID ${id} not found`)
  }
  return supplier
}

export async function createSupplier(data: SupplierInsert): Promise<Supplier> {
  return repo.createSupplier(data)
}

export async function updateSupplier(id: number, data: Partial<SupplierInsert>): Promise<Supplier> {
  return repo.updateSupplier(id, data)
}
