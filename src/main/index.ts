// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Electron Main Process Entry
// Creates the BrowserWindow, initializes Drizzle,
// registers IPC handlers, and sets up asset directories.
// ────────────────────────────────────────────────────────

import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { initDatabase, closeDatabase } from './database/client'
import { APP_CONFIG } from '../shared/constants'
import { logger } from './utils/logger'
import { registerAllIpcHandlers } from './ipc'
import * as backupService from './services/backup.service'
import * as settingsService from './services/settings.service'

/**
 * Checks if a backup is due and triggers it.
 * Interval is user-defined via Settings (default 24h).
 */
async function autoBackupCheck(): Promise<void> {
  try {
    const intervalHours = await settingsService.getNumericSetting('BACKUP_INTERVAL_HOURS', 24)
    const customDir = await settingsService.getSetting('BACKUP_DIRECTORY', '')
    const lastBackup = backupService.getLastBackupLog()

    if (!lastBackup) {
      logger.info('No previous backup found. Creating first automatic backup.')
      await performAutoBackup(customDir)
      return
    }

    const lastDate = new Date(lastBackup.createdAt)
    const now = new Date()
    const diffMs = now.getTime() - lastDate.getTime()
    const diffHours = diffMs / (1000 * 60 * 60)

    if (diffHours >= intervalHours) {
      logger.info(`Auto-backup due (last was ${diffHours.toFixed(1)}h ago, interval is ${intervalHours}h).`)
      await performAutoBackup(customDir)
    } else {
      logger.info(`Auto-backup not due (last was ${diffHours.toFixed(1)}h ago, interval is ${intervalHours}h).`)
    }
  } catch (err) {
    logger.error('Failed to run auto-backup check', err)
  }
}

async function performAutoBackup(customDir: string): Promise<void> {
  let targetPath: string | undefined = undefined

  if (customDir && customDir.trim().length > 0) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `costerra_auto_backup_${timestamp}.db`
    targetPath = join(customDir, filename)
  }

  await backupService.createBackup(true, targetPath)
}

/** Ensure required data directories exist inside userData */
function ensureDataDirectories(): void {
  const userDataPath = app.getPath('userData')
  const assetDir = join(userDataPath, APP_CONFIG.ASSETS_DIR)
  const backupDir = join(userDataPath, APP_CONFIG.BACKUPS_DIR)
  const productImageDir = join(assetDir, 'products')

  for (const dir of [assetDir, backupDir, productImageDir]) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true })
    }
  }
}

function createMainWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 680,
    show: false,
    title: APP_CONFIG.APP_NAME,
    titleBarStyle: 'hiddenInset',
    backgroundColor: 'hsl(226, 24%, 11%)',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  // Graceful show after content is ready (prevents white flash)
  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  // Open external links in the user's default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  // Forward renderer console logs to the main process terminal
  mainWindow.webContents.on('console-message', (_event, _level, message, line, sourceId) => {
    console.log(`[Renderer] ${message} (${sourceId}:${line})`)
  })

  // Load the renderer — dev server in development, built file in production
  if (process.env['ELECTRON_RENDERER_URL'] !== undefined) {
    void mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return mainWindow
}

// ─── Application Lifecycle ───────────────────────────

void app.whenReady().then(() => {
  logger.info('Application starting...')

  // 1. Ensure data directories exist
  ensureDataDirectories()

  // 2. Initialize database (runs migrations + connects)
  initDatabase()
  logger.info('Database initialized')

  // 3. Run auto-backup check
  void autoBackupCheck()

  // 4. Register all IPC handlers
  registerAllIpcHandlers()
  logger.info('IPC handlers registered')

  // 4. Create the main window
  createMainWindow()
  logger.info('Main window created')

  // macOS: recreate window when dock icon is clicked
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })
})

// Quit when all windows are closed (except macOS convention)
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// Graceful database shutdown to prevent SQLite corruption
app.on('before-quit', () => {
  closeDatabase()
})
