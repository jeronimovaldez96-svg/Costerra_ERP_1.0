// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Shared IPC Channel Constants
// Single source of truth for all Main ↔ Renderer comms.
// ────────────────────────────────────────────────────────

export const IPC_CHANNELS = {
  // ─── Dashboard ─────────────────────────────────────
  DASHBOARD_METRICS: 'dashboard:metrics',

  // ─── Product ───────────────────────────────────────
  PRODUCT_LIST: 'product:list',
  PRODUCT_GET: 'product:get',
  PRODUCT_CREATE: 'product:create',
  PRODUCT_UPDATE: 'product:update',
  PRODUCT_TOGGLE_ACTIVE: 'product:toggle-active',
  PRODUCT_HISTORY: 'product:history',

  // ─── Supplier ──────────────────────────────────────
  SUPPLIER_LIST: 'supplier:list',
  SUPPLIER_GET: 'supplier:get',
  SUPPLIER_CREATE: 'supplier:create',
  SUPPLIER_UPDATE: 'supplier:update',
  SUPPLIER_HISTORY: 'supplier:history',

  // ─── Purchase Order ────────────────────────────────
  PO_LIST: 'po:list',
  PO_GET: 'po:get',
  PO_CREATE: 'po:create',
  PO_UPDATE: 'po:update',
  PO_TRANSITION_STATUS: 'po:transition-status',

  // ─── Inventory ─────────────────────────────────────
  INVENTORY_BATCHES: 'inventory:batches',
  INVENTORY_SUMMARY: 'inventory:summary',

  // ─── Client ────────────────────────────────────────
  CLIENT_LIST: 'client:list',
  CLIENT_GET: 'client:get',
  CLIENT_CREATE: 'client:create',
  CLIENT_UPDATE: 'client:update',
  CLIENT_HISTORY: 'client:history',
  CLIENT_REPORT: 'client:report',

  // ─── Sales Lead ────────────────────────────────────
  LEAD_LIST: 'lead:list',
  LEAD_GET: 'lead:get',
  LEAD_DETAIL: 'lead:detail',
  LEAD_CREATE: 'lead:create',
  LEAD_UPDATE_STATUS: 'lead:update-status',

  // ─── Quote ─────────────────────────────────────────
  QUOTE_LIST: 'quote:list',
  QUOTE_GET: 'quote:get',
  QUOTE_CREATE: 'quote:create',
  QUOTE_UPDATE: 'quote:update',
  QUOTE_ADD_LINE_ITEM: 'quote:add-line-item',
  QUOTE_REMOVE_LINE_ITEM: 'quote:remove-line-item',
  QUOTE_SET_TAX_PROFILE: 'quote:set-tax-profile',
  QUOTE_PRINT_PDF: 'quote:print-pdf',
  QUOTE_VERSIONS: 'quote:versions',

  // ─── Sale ──────────────────────────────────────────
  SALE_EXECUTE: 'sale:execute',
  SALE_LIST: 'sale:list',
  SALE_GET: 'sale:get',
  SALE_PRINT_PDF: 'sale:print-pdf',

  // ─── PDF Generation ────────────────────────────────
  PDF_GENERATE_QUOTE: 'pdf:generate-quote',
  PDF_GENERATE_SALE: 'pdf:generate-sale',
  PDF_PROMPT_SAVE: 'pdf:prompt-save',

  // ─── Return ────────────────────────────────────────
  RETURN_CREATE: 'return:create',
  RETURN_PROCESS: 'return:process',
  RETURN_LIST: 'return:list',
  RETURN_GET: 'return:get',

  // ─── Tax Profile ───────────────────────────────────
  TAX_PROFILE_LIST: 'tax-profile:list',
  TAX_PROFILE_GET: 'tax-profile:get',
  TAX_PROFILE_CREATE: 'tax-profile:create',
  TAX_PROFILE_UPDATE: 'tax-profile:update',

  // ─── Analytics ─────────────────────────────────────
  ANALYTICS_DASHBOARD: 'analytics:dashboard',
  ANALYTICS_SALES: 'analytics:sales',

  // ─── Backup ────────────────────────────────────────
  BACKUP_CREATE: 'backup:create',
  BACKUP_RESTORE: 'backup:restore',
  BACKUP_LIST: 'backup:list',

  // ─── System ────────────────────────────────────────
  EXPORT_XLSX: 'export:xlsx',
  GET_APP_PATH: 'system:get-app-path',
  DATABASE_RESET: 'database:reset',

  // ─── App Updates ──────────────────────────────────
  UPDATE_CHECK: 'update:check',
  UPDATE_DOWNLOAD: 'update:download',
  UPDATE_INSTALL: 'update:install',
  UPDATE_STATUS: 'update:status'
} as const

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS]
