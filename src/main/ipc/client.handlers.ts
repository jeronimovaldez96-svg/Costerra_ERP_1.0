// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Client IPC Handlers
// ────────────────────────────────────────────────────────

import { z } from 'zod'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { registerRoute } from './router'
import * as clientService from '../services/client.service'
import {
  paginationSchema,
  clientCreateSchema,
  updatePayloadSchema,
  clientUpdateSchema
} from '../../shared/validation'

const updateClientPayloadSchema = updatePayloadSchema(clientUpdateSchema)

export function registerClientHandlers(): void {
  registerRoute(
    IPC_CHANNELS.CLIENT_LIST,
    { schema: paginationSchema },
    async (params) => {
      return clientService.listClients(params)
    }
  )

  registerRoute(
    IPC_CHANNELS.CLIENT_GET,
    { schema: z.number().int().min(1) },
    async (id) => {
      return clientService.getClient(id)
    }
  )

  registerRoute(
    IPC_CHANNELS.CLIENT_CREATE,
    { schema: clientCreateSchema },
    async (payload) => {
      return clientService.createClient(payload)
    }
  )

  registerRoute(
    IPC_CHANNELS.CLIENT_UPDATE,
    { schema: updateClientPayloadSchema },
    async (payload) => {
      return clientService.updateClient(payload.id, payload.data)
    }
  )
}
