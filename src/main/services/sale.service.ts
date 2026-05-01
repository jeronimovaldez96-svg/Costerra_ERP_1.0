// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Sale Service
// ────────────────────────────────────────────────────────

import * as saleRepo from '../repositories/sale.repository'

export async function executeSale(quoteId: number) {
  return saleRepo.executeSale(quoteId)
}

export async function getSale(id: number) {
  return saleRepo.getSale(id)
}

export async function listSales(params: { page?: number; pageSize?: number }) {
  return saleRepo.listSales(params)
}
