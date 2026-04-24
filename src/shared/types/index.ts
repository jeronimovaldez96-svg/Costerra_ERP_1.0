// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Shared TypeScript Types
// Inferred from Drizzle schema where possible.
// Imported by both Main (services) and Renderer (UI).
// ────────────────────────────────────────────────────────

import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import type {
  products,
  productHistory,
  suppliers,
  supplierHistory,
  purchaseOrders,
  purchaseOrderItems,
  inventoryBatches,
  clients,
  clientHistory,
  salesLeads,
  quotes,
  quoteLineItems,
  quoteVersions,
  taxProfiles,
  taxProfileComponents,
  sales,
  saleLineItems,
  returns,
  returnLineItems,
  creditNotes,
  backupLogs
} from '../schema'

// ─── Generic ─────────────────────────────────────────

/** Standard IPC response wrapper */
export interface IpcResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

/** Pagination params for list queries */
export interface ListParams {
  page?: number
  pageSize?: number
  search?: string
  sortBy?: string
  sortDir?: 'asc' | 'desc'
  filters?: Record<string, string | number | boolean>
}

/** Paginated list result */
export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ─── Drizzle-Inferred Types ──────────────────────────
// Select types = what comes OUT of the database
// Insert types = what goes IN to the database

export type Product = InferSelectModel<typeof products>
export type ProductInsert = InferInsertModel<typeof products>
export type ProductHistoryRecord = InferSelectModel<typeof productHistory>

export type Supplier = InferSelectModel<typeof suppliers>
export type SupplierInsert = InferInsertModel<typeof suppliers>
export type SupplierHistoryRecord = InferSelectModel<typeof supplierHistory>

export type PurchaseOrder = InferSelectModel<typeof purchaseOrders>
export type PurchaseOrderInsert = InferInsertModel<typeof purchaseOrders>
export type PurchaseOrderItem = InferSelectModel<typeof purchaseOrderItems>
export type PurchaseOrderItemInsert = InferInsertModel<typeof purchaseOrderItems>

export type InventoryBatch = InferSelectModel<typeof inventoryBatches>
export type InventoryBatchInsert = InferInsertModel<typeof inventoryBatches>

export type Client = InferSelectModel<typeof clients>
export type ClientInsert = InferInsertModel<typeof clients>
export type ClientHistoryRecord = InferSelectModel<typeof clientHistory>

export type SalesLead = InferSelectModel<typeof salesLeads>
export type SalesLeadInsert = InferInsertModel<typeof salesLeads>

export type Quote = InferSelectModel<typeof quotes>
export type QuoteInsert = InferInsertModel<typeof quotes>
export type QuoteLineItem = InferSelectModel<typeof quoteLineItems>
export type QuoteLineItemInsert = InferInsertModel<typeof quoteLineItems>
export type QuoteVersion = InferSelectModel<typeof quoteVersions>

export type TaxProfile = InferSelectModel<typeof taxProfiles>
export type TaxProfileInsert = InferInsertModel<typeof taxProfiles>
export type TaxProfileComponent = InferSelectModel<typeof taxProfileComponents>
export type TaxProfileComponentInsert = InferInsertModel<typeof taxProfileComponents>

export type Sale = InferSelectModel<typeof sales>
export type SaleInsert = InferInsertModel<typeof sales>
export type SaleLineItem = InferSelectModel<typeof saleLineItems>
export type SaleLineItemInsert = InferInsertModel<typeof saleLineItems>

export type Return = InferSelectModel<typeof returns>
export type ReturnInsert = InferInsertModel<typeof returns>
export type ReturnLineItem = InferSelectModel<typeof returnLineItems>
export type ReturnLineItemInsert = InferInsertModel<typeof returnLineItems>
export type CreditNote = InferSelectModel<typeof creditNotes>

export type BackupLog = InferSelectModel<typeof backupLogs>

// ─── Enriched Types (With Relations) ─────────────────
// Used in the renderer for display; constructed by repositories.

export interface ProductWithHistory extends Product {
  history: ProductHistoryRecord[]
}

export interface SupplierWithHistory extends Supplier {
  history: SupplierHistoryRecord[]
}

export interface PurchaseOrderWithItems extends PurchaseOrder {
  supplier: Supplier
  items: Array<PurchaseOrderItem & { product: Product }>
}

export interface ClientWithHistory extends Client {
  history: ClientHistoryRecord[]
}

export interface SalesLeadWithRelations extends SalesLead {
  client: Client
  quotes: Quote[]
}

export interface QuoteWithRelations extends Quote {
  salesLead: SalesLeadWithRelations
  lineItems: Array<QuoteLineItem & { product: Product }>
  sale: Sale | null
  taxProfile: TaxProfileWithComponents | null
}

export interface TaxProfileWithComponents extends TaxProfile {
  components: TaxProfileComponent[]
}

export interface SaleWithRelations extends Sale {
  quote: QuoteWithRelations
  lineItems: Array<SaleLineItem & { product: Product }>
  taxProfile: TaxProfileWithComponents | null
}

export interface ReturnWithRelations extends Return {
  sale: SaleWithRelations
  lineItems: Array<ReturnLineItem & { saleLineItem: SaleLineItem }>
  creditNote: CreditNote | null
}

export interface InventorySummary {
  productId: number
  skuNumber: string
  productName: string
  productGroup: string
  productFamily: string
  color: string
  totalUnits: number
  availableUnits: number
  reservedUnits: number
  avgUnitCost: number
  totalStockValue: number
}

export interface DashboardData {
  totalStockValue: number
  ytdRevenue: number
  ytdCost: number
  ytdProfit: number
  blendedProfitMargin: number
  totalSalesCount: number
  recentSales: SaleWithRelations[]
}
