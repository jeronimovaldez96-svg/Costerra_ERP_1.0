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
  status: z.enum(['IN_TRANSIT', 'DELIVERED'])
})

// Request wrapper schema for update operations (ID + payload)
export const updatePayloadSchema = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({
    id: z.number().int().min(1),
    data: schema
  })

export type PaginationSchema = z.infer<typeof paginationSchema>
