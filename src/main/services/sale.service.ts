// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Sale Service
// ────────────────────────────────────────────────────────

import * as saleRepo from '../repositories/sale.repository'
import type { ListParams } from '../../shared/types'

export async function executeSale(quoteId: number) {
  return saleRepo.executeSale(quoteId)
}

export async function getSale(id: number) {
  return saleRepo.getSale(id)
}

export async function listSales(params: ListParams) {
   return saleRepo.listSales(params)
 }
