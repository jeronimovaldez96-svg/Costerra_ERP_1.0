// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Quote IPC Handlers
// ────────────────────────────────────────────────────────

import { z } from 'zod'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { registerRoute } from './router'
import * as quoteService from '../services/quote.service'
import { paginationSchema, quoteCreateSchema, quoteUpdateSchema, quoteTransitionSchema, updatePayloadSchema } from '../../shared/validation'

const updateQuotePayloadSchema = updatePayloadSchema(quoteUpdateSchema)
const transitionQuotePayloadSchema = updatePayloadSchema(quoteTransitionSchema)

export function registerQuoteHandlers(): void {
  registerRoute(
    IPC_CHANNELS.QUOTE_LIST,
    { schema: paginationSchema },
    async (params) => quoteService.listQuotes(params)
  )

  registerRoute(
    IPC_CHANNELS.QUOTE_GET,
    { schema: z.number().int().min(1) },
    async (id) => quoteService.getQuote(id)
  )

  registerRoute(
    IPC_CHANNELS.QUOTE_CREATE,
    { schema: quoteCreateSchema },
    async (payload) => {
      const { lineItems, ...metadata } = payload
      return quoteService.createQuote(metadata, lineItems)
    }
  )

  registerRoute(
    IPC_CHANNELS.QUOTE_UPDATE,
    { schema: updateQuotePayloadSchema },
    async (payload) => {
      const { lineItems, ...metadata } = payload.data
      return quoteService.updateQuote(payload.id, metadata, lineItems)
    }
  )

  registerRoute(
    IPC_CHANNELS.QUOTE_VERSIONS,
    { schema: z.number().int().min(1) },
    async (quoteId) => quoteService.getQuoteVersions(quoteId)
  )

  // Quote status transitions are routed through a dedicated channel
  // that maps to QUOTE_SET_TAX_PROFILE for "SENT" (re-using existing channel)
  // For now, using a custom approach via update payload with status
}
