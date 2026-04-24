// ────────────────────────────────────────────────────────
// Costerra ERP v2 — File Manager
// Handles saving, resolving, and deleting local images.
// ────────────────────────────────────────────────────────

import { app } from 'electron'
import { join, extname } from 'path'
import { copyFileSync, existsSync, unlinkSync, mkdirSync } from 'fs'
import { APP_CONFIG } from '../../shared/constants'

export function getProductImageDir(): string {
  return join(app.getPath('userData'), APP_CONFIG.ASSETS_DIR, 'products')
}

/**
 * Copies a source image to the userData assets directory and timestamps it.
 * Overwrites or creates the necessary folders automatically.
 * Returns the relative path for DB storage (e.g. 'products/123456789.png').
 */
export function saveProductImage(sourcePath: string): string {
  const ext = extname(sourcePath).toLowerCase()
  const allowed = APP_CONFIG.SUPPORTED_IMAGE_TYPES

  // Explicitly check boolean via `.includes` instead of relying on falsy bypass
  const isAllowed = allowed.some((allowedExt) => allowedExt === ext)
  if (!isAllowed) {
    throw new Error(`Unsupported image type: ${ext}. Allowed: ${allowed.join(', ')}`)
  }

  const imageDir = getProductImageDir()
  if (!existsSync(imageDir)) {
    mkdirSync(imageDir, { recursive: true })
  }

  const filename = `${Date.now().toString()}${ext}`
  const destPath = join(imageDir, filename)
  copyFileSync(sourcePath, destPath)

  return `products/${filename}`
}

/**
 * Resolves a DB path (e.g. 'products/123...') to a full filesystem path.
 * Returns null if the file does not exist.
 */
export function resolveImagePath(relativePath: string | null | undefined): string | null {
  if (relativePath === null || relativePath === undefined || relativePath.trim() === '') {
    return null
  }
  const absolutePath = join(app.getPath('userData'), APP_CONFIG.ASSETS_DIR, relativePath)
  return existsSync(absolutePath) ? absolutePath : null
}

/**
 * Deletes an image from the disk using its relative DB path.
 * Fails silently if the file doesn't exist.
 */
export function deleteImage(relativePath: string | null | undefined): void {
  if (relativePath === null || relativePath === undefined || relativePath.trim() === '') {
    return
  }
  const absolutePath = join(app.getPath('userData'), APP_CONFIG.ASSETS_DIR, relativePath)
  if (existsSync(absolutePath)) {
    unlinkSync(absolutePath)
  }
}
