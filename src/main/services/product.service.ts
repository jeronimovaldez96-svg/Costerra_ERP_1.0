// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Product Service
// Business logic wrapping the repository layer.
// ────────────────────────────────────────────────────────

import * as repo from '../repositories/product.repository'
import { generateId } from '../utils/id-generator'
import { saveProductImage, deleteImage } from '../utils/file-manager'
import type {
  Product,
  ProductInsert,
  ProductWithHistory,
  PaginatedResult,
  ListParams,
  LoosePartial
} from '../../shared/types'

export async function listProducts(params: ListParams): Promise<PaginatedResult<Product>> {
  const page = params.page ?? 1
  const pageSize = params.pageSize ?? 50
  const search = params.search ?? ''

  return repo.listProducts(page, pageSize, search, params.sortBy, params.sortDir)
}

export async function getProduct(id: number): Promise<ProductWithHistory> {
  const product = await repo.getProduct(id)
  if (product === null) {
    throw new Error(`Product with ID ${id} not found`)
  }
  return product
}

export async function createProduct(
  data: Omit<ProductInsert, 'skuNumber'>,
  sourceImagePath?: string
): Promise<Product> {
  let imagePath = data.imagePath

  // Persist image to app assets if a new source path is provided
  if (sourceImagePath) {
    imagePath = saveProductImage(sourceImagePath)
  }

  const skuNumber = await generateId('SKU')

  return repo.createProduct({
    ...data,
    skuNumber,
    imagePath
  })
}

export async function updateProduct(
  id: number,
  data: LoosePartial<ProductInsert>,
  sourceImagePath?: string
): Promise<Product> {
  const existing = await getProduct(id)
  let newImagePath = data.imagePath

  // Handle image updates
  if (sourceImagePath) {
    // Save new image
    newImagePath = saveProductImage(sourceImagePath)
    // Delete old image to free disk space
    if (existing.imagePath) {
      deleteImage(existing.imagePath)
    }
  }

  return repo.updateProduct(id, {
    ...data,
    ...(newImagePath !== undefined ? { imagePath: newImagePath } : {})
  })
}

export async function toggleProductActive(id: number): Promise<Product> {
  return repo.toggleProductActive(id)
}
