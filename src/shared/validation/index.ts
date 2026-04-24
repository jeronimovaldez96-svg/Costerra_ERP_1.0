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

// Request wrapper schema for update operations (ID + payload)
export const updatePayloadSchema = <T extends z.ZodTypeAny>(schema: T) =>
  z.object({
    id: z.number().int().min(1),
    data: schema
  })

export type PaginationSchema = z.infer<typeof paginationSchema>
