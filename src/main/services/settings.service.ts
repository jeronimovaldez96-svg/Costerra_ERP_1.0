// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Settings Service
// Manages persistent application configurations.
// ────────────────────────────────────────────────────────

import { getDb } from '../database/client'
import { systemSettings } from '../../shared/schema/settings'
import { eq } from 'drizzle-orm'

/**
 * Retrieves a setting value by key.
 * Returns the provided defaultValue if the key does not exist.
 */
export function getSetting(key: string, defaultValue: string): string {
  const db = getDb()
  const result = db.select().from(systemSettings).where(eq(systemSettings.key, key)).get()
  return result ? result.value : defaultValue
}

/**
 * Updates or creates a setting.
 */
export function setSetting(key: string, value: string): void {
  const db = getDb()
  const existing = db.select().from(systemSettings).where(eq(systemSettings.key, key)).get()

  if (existing) {
    db.update(systemSettings)
      .set({ value })
      .where(eq(systemSettings.key, key))
      .run()
  } else {
    db.insert(systemSettings)
      .values({ key, value })
      .run()
  }
}

/**
 * Specialized helper for numeric settings.
 */
export function getNumericSetting(key: string, defaultValue: number): number {
  const value = getSetting(key, defaultValue.toString())
  const parsed = parseInt(value, 10)
  return isNaN(parsed) ? defaultValue : parsed
}
