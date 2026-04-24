// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Schema Barrel Export
// THE SINGLE SOURCE OF TRUTH for the entire database.
// Drizzle infers all TypeScript types from these tables.
// ────────────────────────────────────────────────────────

export { products, productHistory } from './product'
export { suppliers, supplierHistory } from './supplier'
export { purchaseOrders, purchaseOrderItems } from './purchase-order'
export { inventoryBatches } from './inventory'
export { clients, clientHistory } from './client'
export { salesLeads } from './sales-lead'
export { quotes, quoteLineItems, quoteVersions } from './quote'
export { taxProfiles, taxProfileComponents } from './tax'
export { sales, saleLineItems } from './sale'
export { returns, returnLineItems, creditNotes } from './return'
export { backupLogs } from './backup'
