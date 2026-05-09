// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Purchase Order IPC Handlers
// ────────────────────────────────────────────────────────

import { z } from 'zod'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { registerRoute } from './router'
import * as poService from '../services/purchase-order.service'
import { 
  paginationSchema, 
  poCreateSchema, 
  poUpdateSchema, 
  poTransitionSchema,
  updatePayloadSchema 
} from '../../shared/validation'

const updatePoPayloadSchema = updatePayloadSchema(poUpdateSchema)
const transitionPoPayloadSchema = updatePayloadSchema(poTransitionSchema)

export function registerPurchaseOrderHandlers(): void {
  registerRoute(
    IPC_CHANNELS.PO_LIST,
    { schema: paginationSchema },
    (params) => {
      return poService.listPurchaseOrders(params)
    }
  )

  registerRoute(
    IPC_CHANNELS.PO_GET,
    { schema: z.number().int().min(1) },
    (id) => {
      return poService.getPurchaseOrder(id)
    }
  )

  registerRoute(
    IPC_CHANNELS.PO_CREATE,
    { schema: poCreateSchema },
    (payload) => {
      const { lineItems, ...poData } = payload
      return poService.createPurchaseOrder(poData, lineItems)
    }
  )

  registerRoute(
    IPC_CHANNELS.PO_UPDATE,
    { schema: updatePoPayloadSchema },
    (payload) => {
      const { lineItems, ...poData } = payload.data
      return poService.updatePurchaseOrder(payload.id, poData, lineItems)
    }
  )

  registerRoute(
    IPC_CHANNELS.PO_TRANSITION_STATUS,
    { schema: transitionPoPayloadSchema },
    (payload) => {
      return poService.transitionPurchaseOrder(payload.id, payload.data.status)
    }
  )
}
