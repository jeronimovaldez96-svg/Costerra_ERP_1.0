// ────────────────────────────────────────────────────────
// Costerra ERP v2 — ID Generator
// Generates sequential IDs (e.g. SKU-00001) using table counts.
// Safe for use since it's single-user offline SQLite.
// ────────────────────────────────────────────────────────

import { count } from 'drizzle-orm'
import { getDb } from '../database/client'
import { ID_PREFIXES } from '../../shared/constants'
import {
  products,
  purchaseOrders,
  clients,
  salesLeads,
  quotes,
  sales,
  returns,
  creditNotes
} from '../../shared/schema'

export type EntityType = keyof typeof ID_PREFIXES

const tableMap = {
  SKU: products,
  PO: purchaseOrders,
  CLIENT: clients,
  LEAD: salesLeads,
  QUOTE: quotes,
  SALE: sales,
  RETURN: returns,
  CREDIT_NOTE: creditNotes
} as const

/**
 * Generates the next sequential ID for a given entity type.
 * e.g., generateId('SKU') => 'SKU-00001'
 */
export function generateId(entity: EntityType): string {
  const db = getDb()
  const table = tableMap[entity]

  const result = db.select({ value: count() }).from(table).get()
  const currentCount = result?.value ?? 0

  const nextNumber = currentCount + 1
  const padded = String(nextNumber).padStart(5, '0')
  const prefix = ID_PREFIXES[entity]

  return `${prefix}-${padded}`
}
