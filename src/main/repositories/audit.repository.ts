// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Audit Repository
// Generic append-only history tracking for core entities.
// ────────────────────────────────────────────────────────

import { productHistory, supplierHistory, clientHistory } from '../../shared/schema'
import type { getDb } from '../database/client'

// Extract the transaction type directly from our DB client signature
export type DbTransaction = Parameters<Parameters<ReturnType<typeof getDb>['transaction']>[0]>[0]

export type EntityType = 'product' | 'supplier' | 'client'

/**
 * Compares old and new states and inserts the differences into the corresponding history table.
 * To be called within a database transaction.
 */
export function logEntityChanges<T extends Record<string, unknown>>(
  tx: DbTransaction,
  entityType: EntityType,
  entityId: number,
  oldState: T,
  newState: T
): void {
  const changes = []

  for (const key of Object.keys(newState)) {
    if (key === 'updatedAt' || key === 'createdAt') continue

    const oldVal = oldState[key]
    const newVal = newState[key]

    const oldStr = oldVal !== null && oldVal !== undefined ? (typeof oldVal === 'string' ? oldVal : typeof oldVal === 'number' || typeof oldVal === 'boolean' ? oldVal.toString() : JSON.stringify(oldVal)) : ''
    const newStr = newVal !== null && newVal !== undefined ? (typeof newVal === 'string' ? newVal : typeof newVal === 'number' || typeof newVal === 'boolean' ? newVal.toString() : JSON.stringify(newVal)) : ''

    if (oldStr !== newStr) {
      changes.push({
        fieldName: key,
        oldValue: oldStr,
        newValue: newStr
      })
    }
  }

  if (changes.length === 0) return

  const now = new Date().toISOString()

  switch (entityType) {
    case 'product':
      tx.insert(productHistory).values(
        changes.map((c) => ({ ...c, productId: entityId, changedAt: now }))
      ).run()
      break
    case 'supplier':
      tx.insert(supplierHistory).values(
        changes.map((c) => ({ ...c, supplierId: entityId, changedAt: now }))
      ).run()
      break
    case 'client':
      tx.insert(clientHistory).values(
        changes.map((c) => ({ ...c, clientId: entityId, changedAt: now }))
      ).run()
      break
  }
}
