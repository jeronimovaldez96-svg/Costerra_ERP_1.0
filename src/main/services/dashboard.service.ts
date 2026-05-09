// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Dashboard Service
// ────────────────────────────────────────────────────────

import { getDb } from '../database/client'
import { sales } from '../../shared/schema/sale'
import { salesLeads } from '../../shared/schema/sales-lead'
import { inventoryBatches } from '../../shared/schema/inventory'
import { sql, eq } from 'drizzle-orm'

export async function getDashboardMetrics() {
  const db = getDb()

  // 1. Total Revenue
  const revenueRes = db.select({ total: sql<number>`SUM(${sales.totalRevenue})` }).from(sales).get()
  const totalRevenue = revenueRes?.total || 0

  // 2. Gross Margin (Total Profit / Total Revenue)
  const costRes = db.select({ total: sql<number>`SUM(${sales.totalCost})` }).from(sales).get()
  const totalCost = costRes?.total || 0
  const grossMargin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0

  // 3. Total Cost of Stock Value (inventoryBatches.remainingQty * inventoryBatches.unitCost)
  const stockRes = db.select({ total: sql<number>`SUM(${inventoryBatches.remainingQty} * ${inventoryBatches.unitCost})` }).from(inventoryBatches).get()
  const totalStockValue = stockRes?.total || 0

  // 4. Total Active Leads (status = 'IN_PROGRESS')
  const leadsRes = db.select({ total: sql<number>`COUNT(*)` }).from(salesLeads).where(eq(salesLeads.status, 'IN_PROGRESS')).get()
  const totalActiveLeads = leadsRes?.total || 0

  return {
    totalRevenue,
    grossMargin,
    totalStockValue,
    totalActiveLeads
  }
}
