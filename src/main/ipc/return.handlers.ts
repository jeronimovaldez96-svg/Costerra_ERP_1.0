// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Return IPC Handlers
// ────────────────────────────────────────────────────────

import { z } from 'zod'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { registerRoute } from './router'
import * as returnService from '../services/return.service'
import { returnCreateSchema } from '../../shared/validation'

export function registerReturnHandlers(): void {
  registerRoute(
    IPC_CHANNELS.RETURN_CREATE,
    { schema: returnCreateSchema },
    async (payload) => returnService.createReturn(payload.saleId, payload.reason, payload.items)
  )

  registerRoute(
    IPC_CHANNELS.RETURN_PROCESS,
    { schema: z.object({ returnId: z.number().int().min(1) }) },
    async ({ returnId }) => returnService.processReturn(returnId)
  )

  registerRoute(
    IPC_CHANNELS.RETURN_GET,
    { schema: z.number().int().min(1) },
    async (id) => returnService.getReturnById(id)
  )
}
