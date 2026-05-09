// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Tax IPC Handlers
// ────────────────────────────────────────────────────────

import { z } from 'zod'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { registerRoute } from './router'
import * as taxService from '../services/tax.service'
import { 
  paginationSchema, 
  taxProfileCreateSchema, 
  taxProfileUpdateSchema, 
  updatePayloadSchema 
} from '../../shared/validation'

const updateTaxPayloadSchema = updatePayloadSchema(taxProfileUpdateSchema)

export function registerTaxHandlers(): void {
  registerRoute(
    IPC_CHANNELS.TAX_PROFILE_LIST,
    { schema: paginationSchema },
    (params) => {
      return taxService.listTaxProfiles(params)
    }
  )

  registerRoute(
    IPC_CHANNELS.TAX_PROFILE_GET,
    { schema: z.number().int().min(1) },
    (id) => {
      return taxService.getTaxProfile(id)
    }
  )

  registerRoute(
    IPC_CHANNELS.TAX_PROFILE_CREATE,
    { schema: taxProfileCreateSchema },
    (payload) => {
      const { components, ...metadata } = payload
      return taxService.createTaxProfile(metadata, components)
    }
  )

  registerRoute(
    IPC_CHANNELS.TAX_PROFILE_UPDATE,
    { schema: updateTaxPayloadSchema },
    (payload) => {
      const { components, ...metadata } = payload.data
      return taxService.updateTaxProfile(payload.id, metadata, components)
    }
  )
}
