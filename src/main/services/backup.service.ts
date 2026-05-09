// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Backup & Restore Service
// Uses better-sqlite3's native .backup() API for atomic
// backups and archiver for compression. Restore inflates
// and re-initializes the database safely.
// ────────────────────────────────────────────────────────

import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, statSync, unlinkSync, copyFileSync } from 'fs'
import { getDb, getRawSqlite, getDatabasePath, closeDatabase, initDatabase } from '../database/client'
import { backupLogs } from '../../shared/schema/backup'
import { desc, sql } from 'drizzle-orm'
import { APP_CONFIG } from '../../shared/constants'
import { logger } from '../utils/logger'

/**
 * Returns the absolute path to the backups directory.
 * Creates it if it does not exist.
 */
function getBackupsDir(): string {
  const dir = join(app.getPath('userData'), APP_CONFIG.BACKUPS_DIR)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return dir
}

/**
 * Creates a full database backup using better-sqlite3's native .backup() API.
 * This is an atomic, online operation that does not lock the database.
 */
export async function createBackup(isAutomatic = false, overridePath?: string): Promise<{
  filename: string
  filePath: string
  sizeBytes: number
}> {
  const db = getDb()
  const raw = getRawSqlite()

  let filePath: string
  let filename: string

  if (overridePath !== undefined && overridePath !== '') {
    filePath = overridePath
    const popped = overridePath.split(/[/\\]/).pop()
    filename = popped !== undefined && popped !== '' ? popped : 'backup.db'
  } else {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    filename = `costerra_backup_${timestamp}.db`
    const backupsDir = getBackupsDir()
    filePath = join(backupsDir, filename)
  }

  logger.info(`Creating backup: ${filePath}`)

  // Use better-sqlite3's native backup API — atomic, non-blocking
  await raw.backup(filePath)

  const stats = statSync(filePath)
  const sizeBytes = stats.size

  // Record in the audit log
  db.insert(backupLogs).values({
    filename,
    filePath,
    sizeBytes,
    isAutomatic
  }).run()

  logger.info(`Backup completed: ${filename} (${(sizeBytes / 1024 / 1024).toFixed(2)} MB)`)

  // Enforce retention policy (only for default location backups)
  if (overridePath === undefined || overridePath === '') {
    enforceRetentionPolicy()
  }

  return { filename, filePath, sizeBytes }
}

/**
 * Restores the database from a backup file.
 * 1. Closes the current connection
 * 2. Copies the backup over the live database file
 * 3. Re-initializes the connection
 *
 * WARNING: This is destructive — the current database is replaced entirely.
 */
export function restoreBackup(backupFilePath: string): void {
  if (!existsSync(backupFilePath)) {
    throw new Error(`Backup file not found: ${backupFilePath}`)
  }

  const dbPath = getDatabasePath()
  if (dbPath === ':memory:') {
    throw new Error('Cannot restore to an in-memory database.')
  }

  logger.info(`Restoring database from: ${backupFilePath}`)

  // 1. Close current connection
  closeDatabase()

  // 2. Overwrite the live database with the backup
  copyFileSync(backupFilePath, dbPath)

  // 3. Re-initialize the database connection
  initDatabase()

  logger.info('Database restore completed successfully')
}

/**
 * Lists all available backup files with metadata.
 */
export function listBackups(): {
  filename: string
  filePath: string
  sizeBytes: number
  isAutomatic: boolean
  createdAt: string
}[] {
  const db = getDb()
  const logs = db.select().from(backupLogs).orderBy(desc(backupLogs.createdAt)).all()

  // Filter to only return entries where the file still exists on disk
  return logs
    .filter(log => existsSync(log.filePath))
    .map(log => ({
      filename: log.filename,
      filePath: log.filePath,
      sizeBytes: log.sizeBytes,
      isAutomatic: log.isAutomatic,
      createdAt: log.createdAt
    }))
}

/**
 * Returns the most recent backup log entry.
 */
export function getLastBackupLog() {
  const db = getDb()
  return db.select().from(backupLogs).orderBy(desc(backupLogs.createdAt)).limit(1).get()
}

/**
 * Enforces the backup retention policy.
 * Keeps only the most recent N backups (configured in APP_CONFIG).
 * Oldest backups are deleted from both disk and the audit log.
 */
function enforceRetentionPolicy(): void {
  const db = getDb()
  const maxBackups = APP_CONFIG.BACKUP_RETENTION_COUNT

  const allLogs = db.select().from(backupLogs).orderBy(desc(backupLogs.createdAt)).all()

  if (allLogs.length <= maxBackups) return

  const toDelete = allLogs.slice(maxBackups)

  for (const log of toDelete) {
    // Remove from disk if file still exists
    if (existsSync(log.filePath)) {
      unlinkSync(log.filePath)
      logger.info(`Retention policy: deleted old backup ${log.filename}`)
    }

    // Remove from audit log
    db.delete(backupLogs).where(sql`id = ${log.id}`).run()
  }
}

/**
 * Resets the database completely.
 * 1. Creates a mandatory backup first
 * 2. Closes the connection
 * 3. Deletes the database file
 * 4. Re-initializes (migrations recreate all tables empty)
 */
export async function resetDatabase(): Promise<{ backupPath: string }> {
  const dbPath = getDatabasePath()
  if (dbPath === ':memory:') {
    throw new Error('Cannot reset an in-memory database.')
  }

  // Mandatory backup before destruction
  const backup = await createBackup(false)
  logger.info(`Pre-reset backup created: ${backup.filePath}`)

  // Close connection
  closeDatabase()

  // Delete the database file
  if (existsSync(dbPath)) {
    unlinkSync(dbPath)
  }

  // Delete WAL and SHM files if they exist
  const walPath = `${dbPath}-wal`
  const shmPath = `${dbPath}-shm`
  if (existsSync(walPath)) unlinkSync(walPath)
  if (existsSync(shmPath)) unlinkSync(shmPath)

  // Re-initialize — migrations will recreate all tables empty
  initDatabase()

  logger.info('Database reset completed — all data cleared')
  return { backupPath: backup.filePath }
}
