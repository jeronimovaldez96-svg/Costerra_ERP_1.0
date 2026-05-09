// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Sale IPC Handlers
// ────────────────────────────────────────────────────────

import { z } from 'zod'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { registerRoute } from './router'
import * as saleService from '../services/sale.service'
import { paginationSchema, saleExecuteSchema } from '../../shared/validation'

export function registerSaleHandlers(): void {
  registerRoute(
    IPC_CHANNELS.SALE_EXECUTE,
    { schema: saleExecuteSchema },
    (payload) => saleService.executeSale(payload.quoteId)
  )

  registerRoute(
    IPC_CHANNELS.SALE_LIST,
    { schema: paginationSchema },
    (params) => saleService.listSales(params)
  )

  registerRoute(
    IPC_CHANNELS.SALE_GET,
    { schema: z.number().int().min(1) },
    (id) => saleService.getSale(id)
  )
}
