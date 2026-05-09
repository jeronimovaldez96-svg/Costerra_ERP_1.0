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

export function listProducts(params: ListParams): PaginatedResult<Product> {
  const page = params.page ?? 1
  const pageSize = params.pageSize ?? 50
  const search = params.search ?? ''

  return repo.listProducts(page, pageSize, search, params.sortBy, params.sortDir)
}

export function getProduct(id: number): ProductWithHistory {
  const product = repo.getProduct(id)
  if (product === null) {
    throw new Error(`Product with ID ${id.toString()} not found`)
  }
  return product
}

export function createProduct(
  data: Omit<ProductInsert, 'skuNumber'>,
  sourceImagePath?: string
): Product {
  let imagePath = data.imagePath

  // Persist image to app assets if a new source path is provided
  if (sourceImagePath !== undefined && sourceImagePath !== '') {
    imagePath = saveProductImage(sourceImagePath)
  }

  const skuNumber = generateId('SKU')

  return repo.createProduct({
    ...data,
    skuNumber,
    imagePath
  })
}

export function updateProduct(
  id: number,
  data: LoosePartial<ProductInsert>,
  sourceImagePath?: string
): Product {
  const existing = getProduct(id)
  let newImagePath = data.imagePath

  // Handle image updates
  if (sourceImagePath !== undefined && sourceImagePath !== '') {
    // Save new image
    newImagePath = saveProductImage(sourceImagePath)
    // Delete old image to free disk space
    if (existing.imagePath !== null && existing.imagePath !== '') {
      deleteImage(existing.imagePath)
    }
  }

  return repo.updateProduct(id, {
    ...data,
    ...(newImagePath !== undefined ? { imagePath: newImagePath } : {})
  })
}

export function toggleProductActive(id: number): Product {
  return repo.toggleProductActive(id)
}
