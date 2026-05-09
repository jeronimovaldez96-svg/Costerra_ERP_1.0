// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Inventory IPC Handlers
// ────────────────────────────────────────────────────────

import { z } from 'zod'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { registerRoute } from './router'
import * as inventoryService from '../services/inventory.service'
import { paginationSchema } from '../../shared/validation'

export function registerInventoryHandlers(): void {
  registerRoute(
    IPC_CHANNELS.INVENTORY_SUMMARY,
    { schema: paginationSchema },
    async (params) => {
      return inventoryService.getInventorySummary(params)
    }
  )

  registerRoute(
    IPC_CHANNELS.INVENTORY_BATCHES,
    { schema: z.number().int().min(1) },
    async (productId) => {
      return inventoryService.listInventoryBatchesByProduct(productId)
    }
  )
}
