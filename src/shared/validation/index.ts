// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Shared Validation Schemas
// Defines Zod schemas for IPC requests and business rules.
// ────────────────────────────────────────────────────────

import { z } from 'zod'

// ─── Common ──────────────────────────────────────────────
export const paginationSchema = z.object({
  page: z.number().int().min(1).optional(),
  pageSize: z.number().int().min(1).optional(),
  search: z.string().optional(),
  sortBy: z.string().optional(),
  sortDir: z.enum(['asc', 'desc']).optional(),
  filters: z.record(z.union([z.string(), z.number(), z.boolean()])).optional()
})

// ─── Products ────────────────────────────────────────────
export const productCreateSchema = z.object({
  productGroup: z.string().min(1, 'Product Group is required'),
  productFamily: z.string().min(1, 'Product Family is required'),
  name: z.string().min(1, 'Product Name is required'),
  color: z.string().min(1, 'Color is required'),
  imagePath: z.string().nullable().optional(),
  defaultUnitCost: z.number().min(0, 'Cost must be >= 0'),
  defaultUnitPrice: z.number().min(0, 'Price must be >= 0'),
  isActive: z.boolean().optional()
})

export const productUpdateSchema = productCreateSchema.partial()

// ─── Suppliers ───────────────────────────────────────────
export const supplierCreateSchema = z.object({
  name: z.string().min(1, 'Supplier Name is required'),
  contactName: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  email: z.string().email('Invalid email address').or(z.literal('')).optional().default(''),
  notes: z.string().optional().default('')
})

export const supplierUpdateSchema = supplierCreateSchema.partial()

// ─── Clients ─────────────────────────────────────────────
export const clientCreateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  surname: z.string().min(1, 'Surname is required'),
  address: z.string().optional().default(''),
  city: z.string().optional().default(''),
  zipCode: z.string().optional().default(''),
  phone: z.string().optional().default(''),
  notes: z.string().optional().default('')
})

export const clientUpdateSchema = clientCreateSchema.partial()

// ─── Purchase Orders ─────────────────────────────────────
export const poLineItemSchema = z.object({
  productId: z.number().int().min(1),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  unitCost: z.number().min(0, 'Unit cost must be positive')
})

export const poCreateSchema = z.object({
  supplierId: z.number().int().min(1),
  description: z.string().optional().default(''),
  lineItems: z.array(poLineItemSchema).min(1, 'Purchase Order must have at least one line item.')
})

export const poUpdateSchema = z.object({
  supplierId: z.number().int().min(1).optional(),
  description: z.string().optional(),
  lineItems: z.array(poLineItemSchema).min(1, 'Purchase Order must have at least one line item.').optional()
})

export const poTransitionSchema = z.object({
  status: z.enum(['ORDERED', 'IN_TRANSIT', 'DELIVERED', 'IN_INVENTORY'])
})

// ─── Taxes ───────────────────────────────────────────────
export const taxProfileComponentSchema = z.object({
  name: z.string().min(1, 'Tax component name is required'),
  rate: z.number().min(0, 'Tax rate must be positive')
})

export const taxProfileCreateSchema = z.object({
  name: z.string().min(1, 'Tax Profile name is required'),
  description: z.string().optional().default(''),
  components: z.array(taxProfileComponentSchema).min(1, 'Tax profile must map to at least one physical tax component.')
})

export const taxProfileUpdateSchema = taxProfileCreateSchema.extend({
  isActive: z.boolean().optional()
}).partial()

// ─── Sales Leads ─────────────────────────────────────────
export const salesLeadCreateSchema = z.object({
  clientId: z.number().int().min(1, 'Client ID is required'),
  name: z.string().min(1, 'Lead Name is required')
})

export const salesLeadUpdateSchema = z.object({
  name: z.string().optional(),
  status: z.enum(['IN_PROGRESS', 'CLOSED_SALE', 'CLOSED_NO_SALE']).optional()
})

// ─── Quotes ──────────────────────────────────────────────
export const quoteLineItemSchema = z.object({
  productId: z.number().int().min(1),
  quantity: z.number().int().min(1)
})

export const quoteCreateSchema = z.object({
  salesLeadId: z.number().int().min(1),
  taxProfileId: z.number().int().min(1).nullable().optional(),
  notes: z.string().optional().default(''),
  lineItems: z.array(quoteLineItemSchema).min(1, 'Quote must have at least one valid line item')
})

export const quoteUpdateSchema = z.object({
  taxProfileId: z.number().int().nullable().optional(),
  notes: z.string().optional(),
  lineItems: z.array(quoteLineItemSchema).min(1, 'Quote must have at least one valid line item').optional()
})

export const quoteTransitionSchema = z.object({
  status: z.enum(['SENT', 'REJECTED']) // DRAFT handled by create, SOLD / NOT_SOLD handled by Sales Cascade.
})

// ─── Sales ───────────────────────────────────────────────
export const saleExecuteSchema = z.object({
  quoteId: z.number().int().min(1, 'Quote ID is required to execute sale')
})

// Request wrapper schema for update operations (ID + payload)
export const updatePayloadSchema = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({
    id: z.number().int().min(1),
    data: schema
  })

// ─── Returns ─────────────────────────────────────────────
export const returnLineItemSchema = z.object({
  saleLineItemId: z.number().int().min(1),
  quantityReturned: z.number().int().min(1, 'Quantity must be at least 1'),
  restockDisposition: z.enum(['RESTOCK', 'DEFECTIVE']).default('RESTOCK')
})

export const returnCreateSchema = z.object({
  saleId: z.number().int().min(1, 'Sale ID is required'),
  reason: z.string().min(1, 'Reason is required'),
  items: z.array(returnLineItemSchema).min(1, 'At least one item must be returned')
})

export type PaginationSchema = z.infer<typeof paginationSchema>
