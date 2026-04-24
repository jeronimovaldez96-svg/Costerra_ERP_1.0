// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Product IPC Handlers
// Registers routes using the centralized router + Zod.
// ────────────────────────────────────────────────────────

import { z } from 'zod'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { registerRoute } from './router'
import * as productService from '../services/product.service'
import { 
  paginationSchema, 
  productCreateSchema, 
  updatePayloadSchema, 
  productUpdateSchema 
} from '../../shared/validation'

// Extend schema for the create handler because the UI might send a `sourceImagePath`
const createProductPayloadSchema = productCreateSchema.extend({
  sourceImagePath: z.string().optional()
})

const updateProductPayloadSchema = updatePayloadSchema(
  productUpdateSchema.extend({
    sourceImagePath: z.string().optional()
  })
)

export function registerProductHandlers(): void {
  registerRoute(
    IPC_CHANNELS.PRODUCT_LIST,
    { schema: paginationSchema },
    async (params) => {
      return productService.listProducts(params)
    }
  )

  registerRoute(
    IPC_CHANNELS.PRODUCT_GET,
    { schema: z.number().int().min(1) },
    async (id) => {
      return productService.getProduct(id)
    }
  )

  registerRoute(
    IPC_CHANNELS.PRODUCT_CREATE,
    { schema: createProductPayloadSchema },
    async (payload) => {
      const { sourceImagePath, ...productData } = payload
      return productService.createProduct(productData, sourceImagePath)
    }
  )

  registerRoute(
    IPC_CHANNELS.PRODUCT_UPDATE,
    { schema: updateProductPayloadSchema },
    async (payload) => {
      const { sourceImagePath, ...productData } = payload.data
      return productService.updateProduct(payload.id, productData, sourceImagePath)
    }
  )

  registerRoute(
    IPC_CHANNELS.PRODUCT_TOGGLE_ACTIVE,
    { schema: z.number().int().min(1) },
    async (id) => {
      return productService.toggleProductActive(id)
    }
  )
}
