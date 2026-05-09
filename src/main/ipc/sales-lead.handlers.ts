// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Sales Lead IPC Handlers
// ────────────────────────────────────────────────────────

import { z } from 'zod'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { registerRoute } from './router'
import * as leadService from '../services/sales-lead.service'
import { paginationSchema, salesLeadCreateSchema, salesLeadUpdateSchema, updatePayloadSchema } from '../../shared/validation'

const updateLeadPayloadSchema = updatePayloadSchema(salesLeadUpdateSchema)

export function registerSalesLeadHandlers(): void {
  registerRoute(
    IPC_CHANNELS.LEAD_LIST,
    { schema: paginationSchema },
    (params) => leadService.listSalesLeads(params)
  )

  registerRoute(
    IPC_CHANNELS.LEAD_GET,
    { schema: z.number().int().min(1) },
    (id) => leadService.getSalesLead(id)
  )

  registerRoute(
    IPC_CHANNELS.LEAD_DETAIL,
    { schema: z.number().int().min(1) },
    (id) => leadService.getSalesLeadDetail(id)
  )

  registerRoute(
    IPC_CHANNELS.LEAD_CREATE,
    { schema: salesLeadCreateSchema },
    (payload) => leadService.createSalesLead(payload.clientId, payload.name)
  )

  registerRoute(
    IPC_CHANNELS.LEAD_UPDATE_STATUS,
    { schema: updateLeadPayloadSchema },
    (payload) => {
      if (payload.data.status !== undefined) {
        return leadService.updateSalesLeadStatus(payload.id, payload.data.status)
      }
      return leadService.getSalesLead(payload.id)
    }
  )
}
