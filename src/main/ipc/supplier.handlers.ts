// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Supplier IPC Handlers
// ────────────────────────────────────────────────────────

import { z } from 'zod'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { registerRoute } from './router'
import * as supplierService from '../services/supplier.service'
import {
  paginationSchema,
  supplierCreateSchema,
  updatePayloadSchema,
  supplierUpdateSchema
} from '../../shared/validation'

const updateSupplierPayloadSchema = updatePayloadSchema(supplierUpdateSchema)

export function registerSupplierHandlers(): void {
  registerRoute(
    IPC_CHANNELS.SUPPLIER_LIST,
    { schema: paginationSchema },
    async (params) => {
      return supplierService.listSuppliers(params)
    }
  )

  registerRoute(
    IPC_CHANNELS.SUPPLIER_GET,
    { schema: z.number().int().min(1) },
    async (id) => {
      return supplierService.getSupplier(id)
    }
  )

  registerRoute(
    IPC_CHANNELS.SUPPLIER_CREATE,
    { schema: supplierCreateSchema },
    async (payload) => {
      return supplierService.createSupplier(payload)
    }
  )

  registerRoute(
    IPC_CHANNELS.SUPPLIER_UPDATE,
    { schema: updateSupplierPayloadSchema },
    async (payload) => {
      return supplierService.updateSupplier(payload.id, payload.data)
    }
  )
}
