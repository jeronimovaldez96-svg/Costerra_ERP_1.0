// ────────────────────────────────────────────────────────
// Costerra ERP v2 — IPC Handler Registry
// Aggregates and registers all module-specific IPC handlers.
// Called once during app startup in main/index.ts.
// ────────────────────────────────────────────────────────

import { registerProductHandlers } from './product.handlers'
import { registerSupplierHandlers } from './supplier.handlers'
import { registerClientHandlers } from './client.handlers'

import { registerPurchaseOrderHandlers } from './purchase-order.handlers'
import { registerInventoryHandlers } from './inventory.handlers'

/**
 * Registers all IPC handlers for every module.
 * Each module's handler file calls `registerRoute` for its channels.
 */
export function registerAllIpcHandlers(): void {
  registerProductHandlers()
  registerSupplierHandlers()
  registerClientHandlers()
  registerPurchaseOrderHandlers()
  registerInventoryHandlers()
  
  // Future handlers (to be added in subsequent phases):
  // registerSalesLeadHandlers()
  // registerQuoteHandlers()
  // ...
}
