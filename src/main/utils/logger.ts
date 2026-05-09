// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Structured Logger
// Replaces all console.log/warn/error with a centralized
// logger that supports log levels and structured output.
// ESLint rule 'no-console' enforces usage of this logger.
// ────────────────────────────────────────────────────────

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
}

const currentLevel: LogLevel = process.env['NODE_ENV'] === 'development' ? 'debug' : 'info'

function shouldLog(level: LogLevel): boolean {
  return LOG_LEVELS[level] >= LOG_LEVELS[currentLevel]
}

function formatMessage(level: LogLevel, message: string, context?: Record<string, unknown>): string {
  const timestamp = new Date().toISOString()
  const prefix = `[${timestamp}] [${level.toUpperCase()}] [Costerra]`
  const contextStr =
    context !== undefined ? ` ${JSON.stringify(context)}` : ''
  return `${prefix} ${message}${contextStr}`
}

/**
 * Structured logger for the main process.
 * All log output goes through this — no raw console calls.
 */
export const logger = {
  debug(message: string, context?: Record<string, unknown>): void {
    if (shouldLog('debug')) {
      // eslint-disable-next-line no-console
      console.debug(formatMessage('debug', message, context))
    }
  },

  info(message: string, context?: Record<string, unknown>): void {
    if (shouldLog('info')) {
      // eslint-disable-next-line no-console
      console.info(formatMessage('info', message, context))
    }
  },

  warn(message: string, context?: Record<string, unknown>): void {
    if (shouldLog('warn')) {
      // eslint-disable-next-line no-console
      console.warn(formatMessage('warn', message, context))
    }
  },

  error(message: string, error?: unknown, context?: Record<string, unknown>): void {
    if (shouldLog('error')) {
      const errorMessage =
        error instanceof Error ? error.message : (error === null || error === undefined ? '' : (typeof error === 'string' ? error : JSON.stringify(error)))
      const fullContext = {
        ...context,
        ...(errorMessage.length > 0 ? { error: errorMessage } : {})
      }
      // eslint-disable-next-line no-console
      console.error(formatMessage('error', message, fullContext))
    }
  }
} as const
