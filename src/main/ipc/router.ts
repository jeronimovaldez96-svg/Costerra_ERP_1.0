// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Centralized IPC Router
// Replaces per-handler try/catch with a single middleware
// that validates input (Zod), routes to services, and
// wraps all responses in a consistent IpcResponse envelope.
// ────────────────────────────────────────────────────────

import { ipcMain } from 'electron'
import type { IpcMainInvokeEvent } from 'electron'
import type { IpcResponse } from '../../shared/types'
import type { IpcChannel } from '../../shared/ipc-channels'
import { logger } from '../utils/logger'
import type { ZodType } from 'zod'

/**
 * Handler function signature for IPC routes.
 * Receives the validated payload and the raw IPC event.
 */
type IpcHandler<TInput, TOutput> = (
  payload: TInput,
  event: IpcMainInvokeEvent
) => Promise<TOutput> | TOutput

interface RouteOptions<TInput> {
  /** Zod schema for input validation. Omit for no-payload channels. */
  schema?: ZodType<TInput>
}

/**
 * Registers a type-safe IPC handler with centralized error handling.
 *
 * Benefits over the legacy pattern:
 * - ONE try/catch for all handlers (not duplicated per handler)
 * - Input validation via Zod schemas before the handler runs
 * - Consistent IpcResponse envelope for all responses
 * - Structured logging for every request/error
 *
 * @example
 * registerRoute('product:list', { schema: listParamsSchema }, async (params) => {
 *   return productService.list(params)
 * })
 */
export function registerRoute<TInput = void, TOutput = unknown>(
  channel: IpcChannel,
  options: RouteOptions<TInput>,
  handler: IpcHandler<TInput, TOutput>
): void {
  ipcMain.handle(channel, async (event, ...args: unknown[]): Promise<IpcResponse<TOutput>> => {
    try {
      let payload: TInput

      // Validate input if a schema is provided
      if (options.schema !== undefined) {
        const rawInput: unknown = args[0]
        const parseResult = options.schema.safeParse(rawInput)

        if (!parseResult.success) {
          const errorMessage = parseResult.error.errors
            .map((e) => `${e.path.join('.')}: ${e.message}`)
            .join('; ')

          logger.warn(`Validation failed on ${channel}`, { errors: errorMessage })

          return {
            success: false,
            error: `Validation error: ${errorMessage}`
          }
        }

        payload = parseResult.data
      } else {
        // No schema — pass first arg as-is (for simple handlers like get-by-id)
        payload = args[0] as TInput
      }

      const result = await handler(payload, event)

      return {
        success: true,
        data: result
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred'

      logger.error(`IPC handler error on ${channel}`, err)

      return {
        success: false,
        error: message
      }
    }
  })
}

/**
 * Registers a simple IPC handler that takes no input arguments.
 * Useful for channels like analytics:dashboard or backup:list.
 */
export function registerSimpleRoute<TOutput = unknown>(
  channel: IpcChannel,
  handler: (event: IpcMainInvokeEvent) => Promise<TOutput> | TOutput
): void {
  ipcMain.handle(channel, async (event): Promise<IpcResponse<TOutput>> => {
    try {
      const result = await handler(event)
      return { success: true, data: result }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred'
      logger.error(`IPC handler error on ${channel}`, err)
      return { success: false, error: message }
    }
  })
}
