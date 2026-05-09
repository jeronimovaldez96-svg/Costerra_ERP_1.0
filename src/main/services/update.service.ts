import { autoUpdater } from 'electron-updater'
import { BrowserWindow } from 'electron'
import { logger } from '../utils/logger'
import { IPC_CHANNELS } from '../../shared/ipc-channels'

export type UpdateStatus = 
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'available'; version: string }
  | { state: 'not-available' }
  | { state: 'downloading'; percent: number }
  | { state: 'ready'; version: string }
  | { state: 'error'; message: string }

class UpdateService {
  private currentStatus: UpdateStatus = { state: 'idle' }

  constructor() {
    this.setupListeners()
    
    // Configure autoUpdater
    autoUpdater.autoDownload = false
    autoUpdater.autoInstallOnAppQuit = true
    
    logger.info('UpdateService initialized')
  }

  private setupListeners() {
    autoUpdater.on('checking-for-update', () => {
      this.setStatus({ state: 'checking' })
    })

    autoUpdater.on('update-available', (info) => {
      this.setStatus({ state: 'available', version: info.version })
    })

    autoUpdater.on('update-not-available', () => {
      this.setStatus({ state: 'not-available' })
      // Reset to idle after a few seconds
      setTimeout(() => this.setStatus({ state: 'idle' }), 5000)
    })

    autoUpdater.on('download-progress', (progress) => {
      this.setStatus({ state: 'downloading', percent: progress.percent })
    })

    autoUpdater.on('update-downloaded', (info) => {
      this.setStatus({ state: 'ready', version: info.version })
    })

    autoUpdater.on('error', (err) => {
      logger.error('AutoUpdater error', err)
      this.setStatus({ state: 'error', message: err.message })
    })
  }

  private setStatus(status: UpdateStatus) {
    this.currentStatus = status
    this.broadcastStatus()
  }

  public broadcastStatus() {
    const windows = BrowserWindow.getAllWindows()
    windows.forEach(win => {
      win.webContents.send(IPC_CHANNELS.UPDATE_STATUS, this.currentStatus)
    })
  }

  public getStatus(): UpdateStatus {
    return this.currentStatus
  }

  public async checkForUpdates() {
    try {
      await autoUpdater.checkForUpdates()
    } catch (err) {
      logger.error('Failed to check for updates', err)
      this.setStatus({ state: 'error', message: 'Failed to check for updates' })
    }
  }

  public async downloadUpdate() {
    try {
      await autoUpdater.downloadUpdate()
    } catch (err) {
      logger.error('Failed to download update', err)
      this.setStatus({ state: 'error', message: 'Failed to download update' })
    }
  }

  public installUpdate() {
    autoUpdater.quitAndInstall()
  }
}

export const updateService = new UpdateService()
