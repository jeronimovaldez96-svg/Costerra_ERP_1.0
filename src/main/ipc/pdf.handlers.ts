// ────────────────────────────────────────────────────────
// Costerra ERP v2 — PDF Generate IPC Handlers
// ────────────────────────────────────────────────────────

import { z } from 'zod'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { registerRoute } from './router'
import * as pdfService from '../services/pdf.service'

export function registerPdfHandlers(): void {
  registerRoute(
    IPC_CHANNELS.PDF_GENERATE_QUOTE,
    { schema: z.object({ quoteId: z.number().int().min(1) }) },
    async ({ quoteId }) => {
      const filePath = await pdfService.generateQuotePdf(quoteId)
      return { tempPath: filePath }
    }
  )

  registerRoute(
    IPC_CHANNELS.PDF_GENERATE_SALE,
    { schema: z.object({ saleId: z.number().int().min(1) }) },
    async ({ saleId }) => {
      const filePath = await pdfService.generateSalePdf(saleId)
      return { tempPath: filePath }
    }
  )

  registerRoute(
    IPC_CHANNELS.PDF_PROMPT_SAVE,
    { 
      schema: z.object({ 
        tempPath: z.string().min(1),
        defaultName: z.string().min(1)
      }) 
    },
    async ({ tempPath, defaultName }) => {
      const finalPath = await pdfService.promptSaveTemporaryPdf(tempPath, defaultName)
      return { finalPath }
    }
  )
}
