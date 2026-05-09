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
    (params) => quoteService.listQuotes(params)
  )

  registerRoute(
    IPC_CHANNELS.QUOTE_GET,
    { schema: z.number().int().min(1) },
    (id) => quoteService.getQuote(id)
  )

  registerRoute(
    IPC_CHANNELS.QUOTE_CREATE,
    { schema: quoteCreateSchema },
    (payload) => {
      const { lineItems, ...metadata } = payload
      return quoteService.createQuote(metadata, lineItems)
    }
  )

  registerRoute(
    IPC_CHANNELS.QUOTE_UPDATE,
    { schema: updateQuotePayloadSchema },
    (payload) => {
      const { lineItems, ...metadata } = payload.data
      return quoteService.updateQuote(payload.id, metadata, lineItems)
    }
  )

  registerRoute(
    IPC_CHANNELS.QUOTE_VERSIONS,
    { schema: z.number().int().min(1) },
    (quoteId) => quoteService.getQuoteVersions(quoteId)
  )

  registerRoute(
    IPC_CHANNELS.QUOTE_SET_TAX_PROFILE, // Re-used as transition channel
    { schema: transitionQuotePayloadSchema },
    (payload) => quoteService.transitionQuote(payload.id, payload.data.status)
  )
}
