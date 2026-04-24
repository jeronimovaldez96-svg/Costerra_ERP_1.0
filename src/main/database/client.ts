// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Database Client (Drizzle + better-sqlite3)
// Zero Prisma. Zero binary engines. Zero asarUnpack hacks.
//
// Drizzle wraps better-sqlite3 directly — the only native
// module we need. Schema types flow from the TS definitions
// in src/shared/schema/ WITH ZERO CODE GENERATION.
// ────────────────────────────────────────────────────────

import Database from 'better-sqlite3'
import { drizzle } from 'drizzle-orm/better-sqlite3'
import { migrate } from 'drizzle-orm/better-sqlite3/migrator'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import * as schema from '../../shared/schema'
import { APP_CONFIG } from '../../shared/constants'
import { logger } from '../utils/logger'

import type { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3'

/** Full typed database instance with schema awareness */
export type AppDatabase = BetterSQLite3Database<typeof schema>

let db: AppDatabase | null = null
let sqlite: ReturnType<typeof Database> | null = null

/**
 * Returns the absolute path to the runtime SQLite database.
 * Uses an in-memory database during Vitest runs.
 */
export function getDatabasePath(): string {
  if (process.env.NODE_ENV === 'test') {
    return ':memory:'
  }
  return join(app.getPath('userData'), APP_CONFIG.DB_FILENAME)
}

/**
 * Returns the singleton Drizzle database instance.
 * Lazily initializes on first call.
 */
export function getDb(): AppDatabase {
  if (db === null) {
    throw new Error('[Costerra] Database not initialized. Call initDatabase() first.')
  }
  return db
}

/**
 * Returns the path to bundled migrations.
 * In development: ./drizzle/migrations
 * In production: extraResources/migrations
 */
function getMigrationsPath(): string {
  if (app.isPackaged) {
    return join(process.resourcesPath, 'migrations')
  }
  return join(app.getAppPath(), 'drizzle', 'migrations')
}

/**
 * Initialize the database connection, run migrations, and return the instance.
 * Called once during app startup in main/index.ts.
 *
 * This is the ENTIRE database bootstrap — no CLI tools, no npx, no codegen.
 */
export function initDatabase(): AppDatabase {
  const dbPath = getDatabasePath()

  // Ensure the directory exists
  const dbDir = join(dbPath, '..')
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true })
  }

  logger.info(`Initializing database at: ${dbPath}`)

  // Create the better-sqlite3 connection
  sqlite = new Database(dbPath)

  // Enable WAL mode for better concurrent read performance
  sqlite.pragma('journal_mode = WAL')

  // Foreign keys are OFF by default in SQLite — enforce them
  sqlite.pragma('foreign_keys = ON')

  // Create the Drizzle instance with full schema typing
  db = drizzle(sqlite, { schema })

  // Run migrations — pure SQL files, no CLI required
  const migrationsPath = getMigrationsPath()
  if (existsSync(migrationsPath)) {
    logger.info(`Running migrations from: ${migrationsPath}`)
    migrate(db, { migrationsFolder: migrationsPath })
    logger.info('Migrations completed successfully')
  } else {
    logger.warn(`Migrations folder not found at: ${migrationsPath}`)
  }

  return db
}

/**
 * Gracefully close the database connection.
 * Called during app shutdown to prevent SQLite corruption.
 */
export function closeDatabase(): void {
  if (sqlite !== null) {
    sqlite.close()
    sqlite = null
    db = null
    logger.info('Database connection closed')
  }
}

/**
 * Returns the raw better-sqlite3 instance for operations
 * that require direct access (e.g., backup, reset).
 */
export function getRawSqlite(): ReturnType<typeof Database> {
  if (sqlite === null) {
    throw new Error('[Costerra] Raw SQLite not available. Call initDatabase() first.')
  }
  return sqlite
}
