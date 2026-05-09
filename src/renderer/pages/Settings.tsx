import { useState, useEffect } from 'react'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import { PageContainer } from '../components/layout/PageContainer'
import { GlassCard } from '../components/layout/GlassCard'
import { Button } from '../components/ui/Button'
import { toast } from '../store/useToastStore'
import { Download, Database, RefreshCcw, Upload, History, Clock, ArrowUpCircle, ShieldCheck, AlertCircle } from 'lucide-react'

interface BackupLog {
  filename: string
  filePath: string
  sizeBytes: number
  isAutomatic: boolean
  createdAt: string
}

type UpdateStatus = 
  | { state: 'idle' }
  | { state: 'checking' }
  | { state: 'available'; version: string }
  | { state: 'not-available' }
  | { state: 'downloading'; percent: number }
  | { state: 'ready'; version: string }
  | { state: 'error'; message: string }

export function Settings() {
  const [isBackingUp, setIsBackingUp] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  
  const [backups, setBackups] = useState<BackupLog[]>([])
  const [backupInterval, setBackupInterval] = useState('24')
  const [backupDirectory, setBackupDirectory] = useState('')
  const [isSavingInterval, setIsSavingInterval] = useState(false)
  const [isSavingDirectory, setIsSavingDirectory] = useState(false)

  // Update System State
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({ state: 'idle' })

  useEffect(() => {
    void fetchBackups()
    void fetchInterval()
    void fetchDirectory()
    
    // Initial update status
    void window.api.invoke<UpdateStatus>(IPC_CHANNELS.UPDATE_GET_STATUS).then(setUpdateStatus)

    // Listen for update events
    const unsubscribe = window.api.on('update:status', (status: UpdateStatus) => {
      setUpdateStatus(status)
    })

    return () => { unsubscribe(); }
  }, [])

  const fetchBackups = async () => {
    try {
      const res = await window.api.invoke<BackupLog[]>('backup:list')
      setBackups(res.slice(0, 5)) // Show only last 5
    } catch (error) {
      toast.error('Failed to fetch backups', (error as Error).message)
    }
  }

  const fetchInterval = async () => {
    try {
      const res = await window.api.invoke<string>('settings:get', { key: 'BACKUP_INTERVAL_HOURS', defaultValue: '24' })
      setBackupInterval(res)
    } catch (error) {
      toast.error('Failed to fetch interval', (error as Error).message)
    }
  }

  const fetchDirectory = async () => {
    try {
      const res = await window.api.invoke<string>('settings:get', { key: 'BACKUP_DIRECTORY', defaultValue: '' })
      setBackupDirectory(res)
    } catch (error) {
      toast.error('Failed to fetch directory', (error as Error).message)
    }
  }

  const handleUpdateInterval = async () => {
    setIsSavingInterval(true)
    try {
      await window.api.invoke('settings:update', { key: 'BACKUP_INTERVAL_HOURS', value: backupInterval })
      toast.success('Settings Updated', 'Auto-backup interval has been saved.')
    } catch (error) {
      toast.error('Update Failed', (error as Error).message)
    } finally {
      setIsSavingInterval(false)
    }
  }

  const handleSelectDirectory = async () => {
    try {
      const path = await window.api.invoke<string | null>('system:select-directory', {
        title: 'Select Auto-Backup Directory'
      })
      if (path !== null && path !== '') {
        setIsSavingDirectory(true)
        await window.api.invoke('settings:update', { key: 'BACKUP_DIRECTORY', value: path })
        setBackupDirectory(path)
        toast.success('Directory Set', 'Automated backups will now be saved to the selected folder.')
      }
    } catch (error) {
      toast.error('Update Failed', (error as Error).message)
    } finally {
      setIsSavingDirectory(false)
    }
  }

  const handleBackup = async () => {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
      const defaultFilename = `costerra_backup_${timestamp}.db`
      
      const filePath = await window.api.invoke<string | null>('system:save-dialog', {
        title: 'Save Manual Backup',
        defaultPath: defaultFilename,
        filters: [{ name: 'Database Files', extensions: ['db'] }]
      })

      if (filePath === null || filePath === '') return

      setIsBackingUp(true)
      await window.api.invoke('backup:create', { isAutomatic: false, filePath })
      toast.success('Backup Successful', `Manual backup saved to: ${filePath}`)
      void fetchBackups()
    } catch (error) {
      toast.error('Backup Failed', (error as Error).message)
    } finally {
      setIsBackingUp(false)
    }
  }

  const handleImportBackup = async () => {
    setIsImporting(true)
    try {
      const filePath = await window.api.invoke<string | null>('system:select-file', {
        title: 'Select Backup Database',
        filters: [{ name: 'Database Files', extensions: ['db'] }]
      })

      if (filePath === null || filePath === '') return

      if (window.confirm('Are you sure you want to IMPORT and RESTORE this database? This will completely overwrite your current data.')) {
        setIsRestoring(true)
        await window.api.invoke('backup:restore', { backupFilePath: filePath })
        toast.success('Import Successful', 'Database has been restored from the selected file. Reloading...')
        setTimeout(() => { window.location.reload(); }, 2000)
      }
    } catch (error) {
      toast.error('Import Failed', (error as Error).message)
    } finally {
      setIsImporting(false)
      setIsRestoring(false)
    }
  }

  const handleRestoreFromHistory = async (filePath: string) => {
    if (!window.confirm('Are you sure you want to RESTORE this backup? Your current data will be overwritten.')) {
      return
    }

    setIsRestoring(true)
    try {
      await window.api.invoke('backup:restore', { backupFilePath: filePath })
      toast.success('Restore Successful', 'Database has been rolled back. Reloading...')
      setTimeout(() => { window.location.reload(); }, 2000)
    } catch (error) {
      toast.error('Restore Failed', (error as Error).message)
      setIsRestoring(false)
    }
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const res = await window.api.invoke<{ filePath: string }>('export:xlsx', { entity: 'sales' })
      if (res.filePath !== '') {
        toast.success('Export Complete', `File saved to ${res.filePath}`)
      } else {
        toast.info('Export Cancelled', 'No file was selected.')
      }
    } catch (error) {
      toast.error('Export Failed', (error as Error).message)
    } finally {
      setIsExporting(false)
    }
  }

  const handleReset = async () => {
    if (!window.confirm('WARNING: This will wipe all data and reset the database to factory settings. A backup will be created first. Are you absolutely sure?')) {
      return
    }
    
    setIsResetting(true)
    try {
      await window.api.invoke(IPC_CHANNELS.DATABASE_RESET, { confirmed: true })
      toast.success('Reset Complete', 'Database has been wiped and re-initialized.')
      setTimeout(() => { window.location.reload(); }, 2000)
    } catch (error) {
      toast.error('Reset Failed', (error as Error).message)
      setIsResetting(false)
    }
  }

  // Update Handlers
  const handleCheckUpdate = () => { void window.api.invoke(IPC_CHANNELS.UPDATE_CHECK) }
  const handleDownloadUpdate = () => { void window.api.invoke(IPC_CHANNELS.UPDATE_DOWNLOAD) }
  const handleInstallUpdate = () => { void window.api.invoke(IPC_CHANNELS.UPDATE_INSTALL) }

  return (
    <PageContainer title="Settings">
      <div className="space-y-6 max-w-4xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Backup Card */}
          <GlassCard className="h-full">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <Database size={20} className="text-primary-400" />
              Backup & Recovery
            </h2>
            
            <div className="space-y-6">
              <div className="flex flex-col gap-2">
                <h3 className="font-medium text-slate-200 text-sm uppercase tracking-wider">Manual Operations</h3>
                <div className="flex flex-wrap gap-3 mt-1">
                  <Button onClick={() => { void handleBackup(); }} isLoading={isBackingUp} size="sm">
                    <Database size={14} className="mr-2" />
                    Create Backup (Save As...)
                  </Button>
                  <Button variant="secondary" onClick={() => { void handleImportBackup(); }} isLoading={isImporting || isRestoring} size="sm">
                    <Upload size={14} className="mr-2" />
                    Restore from File
                  </Button>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 space-y-4">
                <div>
                  <h3 className="font-medium text-slate-200 text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Clock size={14} className="text-primary-400" />
                    Auto-Backup Interval
                  </h3>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1 max-w-[120px]">
                      <input 
                        type="number"
                        value={backupInterval}
                        onChange={(e) => { setBackupInterval(e.target.value); }}
                        className="w-full bg-slate-900/50 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-primary-500/50 pr-8"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 font-medium">h</span>
                    </div>
                    <Button variant="secondary" onClick={handleUpdateInterval} isLoading={isSavingInterval} size="sm">
                      Save Interval
                    </Button>
                  </div>
                </div>

                <div>
                  <h3 className="font-medium text-slate-200 text-sm uppercase tracking-wider mb-3">Auto-Backup Directory</h3>
                  <div className="space-y-2">
                    <div className="p-3 rounded-lg bg-slate-900/50 border border-white/10 text-xs text-slate-400 break-all min-h-[40px]">
                      {backupDirectory || 'Using default application data folder...'}
                    </div>
                    <Button variant="secondary" onClick={handleSelectDirectory} isLoading={isSavingDirectory} size="sm" className="w-full">
                      Change Directory
                    </Button>
                  </div>
                </div>
                
                <p className="text-xs text-slate-500 italic mt-2">Backups are triggered on app startup if the interval has passed.</p>
              </div>
            </div>
          </GlassCard>

          {/* Update Card */}
          <GlassCard className="h-full">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <ArrowUpCircle size={20} className="text-primary-400" />
              Application Update
            </h2>

            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary-500/20 text-primary-400">
                      <ShieldCheck size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">Current Version</p>
                      <p className="text-xs text-slate-400">Costerra ERP v1.0.0</p>
                    </div>
                  </div>
                  {updateStatus.state === 'idle' && (
                    <Button variant="secondary" size="sm" onClick={handleCheckUpdate}>
                      Check for Updates
                    </Button>
                  )}
                </div>

                {/* Status Driven UI */}
                {updateStatus.state === 'checking' && (
                  <div className="flex items-center gap-2 text-slate-400 text-sm animate-pulse">
                    <RefreshCcw size={14} className="animate-spin" />
                    Checking GitHub for the latest release...
                  </div>
                )}

                {updateStatus.state === 'available' && (
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
                      <ArrowUpCircle size={16} />
                      New version available: {updateStatus.version}
                    </div>
                    <Button className="w-full" onClick={handleDownloadUpdate}>
                      Download & Install Now
                    </Button>
                  </div>
                )}

                {updateStatus.state === 'not-available' && (
                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2">
                    <ShieldCheck size={16} />
                    You are running the latest version!
                  </div>
                )}

                {updateStatus.state === 'downloading' && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-slate-400">
                      <span>Downloading...</span>
                      <span>{Math.round(updateStatus.percent)}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-1.5">
                      <div 
                        className="bg-primary-500 h-1.5 rounded-full transition-all duration-300" 
                        style={{ width: `${updateStatus.percent}%` }}
                      />
                    </div>
                  </div>
                )}

                {updateStatus.state === 'ready' && (
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-primary-500/20 border border-primary-500/30 text-white text-sm">
                      Update {updateStatus.version} is ready to install!
                    </div>
                    <Button className="w-full bg-primary-600 hover:bg-primary-500" onClick={handleInstallUpdate}>
                      Restart to Apply Update
                    </Button>
                  </div>
                )}

                {updateStatus.state === 'error' && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-2">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <p>{updateStatus.message}</p>
                  </div>
                )}
              </div>
              
              <p className="text-xs text-slate-500 italic">
                Updates are fetched from the official GitHub repository. Always ensure you have a stable internet connection.
              </p>
            </div>
          </GlassCard>
        </div>

        {/* Recent Backups Card (Moved to full width row) */}
        <GlassCard>
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <History size={20} className="text-primary-400" />
            Recent Backups
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {backups.length === 0 ? (
              <div className="col-span-full text-center py-8 text-slate-500 text-sm">
                No local backups found.
              </div>
            ) : (
              backups.map((b) => (
                <div key={b.createdAt} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-200 truncate">{b.filename}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(b.createdAt).toLocaleString()} • {(b.sizeBytes / 1024 / 1024).toFixed(1)} MB
                      {b.isAutomatic && <span className="ml-2 text-primary-400/80 font-semibold uppercase text-[10px]">Auto</span>}
                    </p>
                  </div>
                  <Button 
                    variant="secondary" 
                    size="sm" 
                    onClick={() => handleRestoreFromHistory(b.filePath)}
                    disabled={isRestoring}
                    className="ml-4 shrink-0"
                  >
                    Restore
                  </Button>
                </div>
              ))
            )}
          </div>
        </GlassCard>

        {/* Data Management Card */}
        <GlassCard>
          <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <Download size={20} className="text-emerald-400" />
            Data Management
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between py-4 border-b border-white/5">
              <div>
                <h3 className="font-medium text-slate-200">Export Ledger</h3>
                <p className="text-sm text-slate-400">Export your finalized sales ledger to an XLSX spreadsheet for accounting.</p>
              </div>
              <Button variant="secondary" onClick={handleExport} isLoading={isExporting}>
                <Download size={16} className="mr-2" />
                Export XLSX
              </Button>
            </div>

            <div className="flex items-center justify-between py-4">
              <div>
                <h3 className="font-medium text-red-400">System Reset</h3>
                <p className="text-sm text-slate-400">Wipe all data and start fresh. A mandatory full backup is created automatically first.</p>
              </div>
              <Button variant="danger" onClick={handleReset} isLoading={isResetting}>
                <RefreshCcw size={16} className="mr-2" />
                Factory Reset
              </Button>
            </div>
          </div>
        </GlassCard>
      </div>
    </PageContainer>
  )
}
