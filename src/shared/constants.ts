// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Shared Constants
// Enums and app-wide constants for both Main & Renderer.
// ────────────────────────────────────────────────────────

/** Purchase Order status state machine: DRAFT → IN_TRANSIT → DELIVERED */
export const PO_STATUS = {
  DRAFT: 'DRAFT',
  IN_TRANSIT: 'IN_TRANSIT',
  DELIVERED: 'DELIVERED'
} as const
export type PoStatus = (typeof PO_STATUS)[keyof typeof PO_STATUS]

/** Valid PO status transitions */
export const PO_TRANSITIONS: Record<PoStatus, readonly PoStatus[]> = {
  DRAFT: ['IN_TRANSIT'],
  IN_TRANSIT: ['DELIVERED'],
  DELIVERED: []
} as const

/** Sales Lead status workflow */
export const LEAD_STATUS = {
  IN_PROGRESS: 'IN_PROGRESS',
  SOLD: 'SOLD',
  NOT_SOLD: 'NOT_SOLD',
  CLOSED: 'CLOSED'
} as const
export type LeadStatus = (typeof LEAD_STATUS)[keyof typeof LEAD_STATUS]

/** Quote lifecycle */
export const QUOTE_STATUS = {
  DRAFT: 'DRAFT',
  SENT: 'SENT',
  SOLD: 'SOLD',
  REJECTED: 'REJECTED',
  NOT_SOLD: 'NOT_SOLD'
} as const
export type QuoteStatus = (typeof QUOTE_STATUS)[keyof typeof QUOTE_STATUS]

/** Return status */
export const RETURN_STATUS = {
  DRAFT: 'DRAFT',
  PROCESSED: 'PROCESSED'
} as const
export type ReturnStatus = (typeof RETURN_STATUS)[keyof typeof RETURN_STATUS]

/** Tax component type */
export const TAX_TYPE = {
  PERCENTAGE: 'PERCENTAGE'
} as const
export type TaxType = (typeof TAX_TYPE)[keyof typeof TAX_TYPE]

/** Auto-ID prefix configuration */
export const ID_PREFIXES = {
  SKU: 'SKU',
  PO: 'PO',
  CLIENT: 'CLI',
  LEAD: 'LEAD',
  QUOTE: 'QUO',
  SALE: 'SALE',
  RETURN: 'RET',
  CREDIT_NOTE: 'CN'
} as const

/** Application metadata */
export const APP_CONFIG = {
  APP_NAME: 'Costerra ERP',
  DB_FILENAME: 'costerra.db',
  ASSETS_DIR: 'assets',
  BACKUPS_DIR: 'backups',
  MAX_IMAGE_SIZE_MB: 5,
  SUPPORTED_IMAGE_TYPES: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
  BACKUP_RETENTION_COUNT: 30,
  BACKUP_INTERVAL_MS: 24 * 60 * 60 * 1000
} as const
