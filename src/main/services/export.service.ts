// ────────────────────────────────────────────────────────
// Costerra ERP v2 — XLSX Export Service
// Exports any entity table to XLSX using the `xlsx` package.
// ────────────────────────────────────────────────────────

import * as XLSX from 'xlsx'
import { app, dialog } from 'electron'
import { join } from 'path'
import { writeFileSync } from 'fs'
import { getDb } from '../database/client'
import {
  products,
  suppliers,
  clients,
  purchaseOrders,
  salesLeads,
  quotes,
  sales
} from '../../shared/schema'
import { desc } from 'drizzle-orm'
import { logger } from '../utils/logger'

/** Supported entity types for export */
export type ExportEntity = 'products' | 'suppliers' | 'clients' | 'purchase-orders' | 'sales-leads' | 'quotes' | 'sales'

/**
 * Maps entity name to a Drizzle table and default sort column.
 */
function getTableForEntity(entity: ExportEntity) {
  const map = {
    'products': { table: products, sort: products.id },
    'suppliers': { table: suppliers, sort: suppliers.id },
    'clients': { table: clients, sort: clients.id },
    'purchase-orders': { table: purchaseOrders, sort: purchaseOrders.id },
    'sales-leads': { table: salesLeads, sort: salesLeads.id },
    'quotes': { table: quotes, sort: quotes.id },
    'sales': { table: sales, sort: sales.id }
  } as const

  return map[entity]
}

/**
 * Exports an entity's data to XLSX and triggers the Save dialog.
 * Returns the saved file path, or null if the user cancelled.
 */
export async function exportToXlsx(entity: ExportEntity): Promise<string | null> {
  const db = getDb()
  const { table, sort } = getTableForEntity(entity)

  // Fetch all rows sorted by ID descending
  const rows = db.select().from(table).orderBy(desc(sort)).all()

  if (rows.length === 0) {
    throw new Error(`No data to export for entity: ${entity}`)
  }

  // Convert to worksheet
  const worksheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, entity)

  // Generate buffer
  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer

  // Prompt user for save location
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const defaultName = `costerra_${entity}_${timestamp}.xlsx`

  const { canceled, filePath } = await dialog.showSaveDialog({
    title: `Export ${entity} to XLSX`,
    defaultPath: join(app.getPath('downloads'), defaultName),
    filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
  })

  if (canceled || !filePath) return null

  writeFileSync(filePath, buffer)
  logger.info(`XLSX export completed: ${filePath} (${rows.length.toString()} rows)`)

  return filePath
}
