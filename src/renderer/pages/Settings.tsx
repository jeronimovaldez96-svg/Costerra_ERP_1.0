import { useState } from 'react'
import { PageContainer } from '../components/layout/PageContainer'
import { GlassCard } from '../components/layout/GlassCard'
import { Button } from '../components/ui/Button'
import { toast } from '../store/useToastStore'
import { Download, Database, RefreshCcw } from 'lucide-react'

export function Settings() {
  const [isBackingUp, setIsBackingUp] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  const handleBackup = async () => {
    setIsBackingUp(true)
    try {
      await window.api.invoke('backup:create', { isAutomatic: false })
      toast.success('Backup Successful', 'Your database backup was created securely.')
    } catch (error) {
      toast.error('Backup Failed', (error as Error).message)
    } finally {
      setIsBackingUp(false)
    }
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      // For now we export sales, could be extended to a dropdown of entities
      const res = await window.api.invoke<{ filePath: string }>('export:xlsx', { entity: 'sales' })
      if (res?.filePath) {
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
      await window.api.invoke('database:reset', { confirmed: true })
      toast.success('Reset Complete', 'Database has been wiped and re-initialized.')
      // In a real app we might force a reload here, but toast is fine for now
      setTimeout(() => window.location.reload(), 2000)
    } catch (error) {
      toast.error('Reset Failed', (error as Error).message)
      setIsResetting(false) // Only reset state if failed, otherwise reloading
    }
  }

  return (
    <PageContainer title="Settings">
      <div className="space-y-6 max-w-3xl">
        <GlassCard>
          <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
            <Database size={20} className="text-primary-400" />
            System Operations
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between py-4 border-b border-white/5">
              <div>
                <h3 className="font-medium text-slate-200">Manual Backup</h3>
                <p className="text-sm text-slate-400">Create an instant, atomic backup of your current database without blocking writes.</p>
              </div>
              <Button onClick={handleBackup} isLoading={isBackingUp}>
                <Database size={16} className="mr-2" />
                Create Backup
              </Button>
            </div>

            <div className="flex items-center justify-between py-4 border-b border-white/5">
              <div>
                <h3 className="font-medium text-slate-200">Export Sales Data</h3>
                <p className="text-sm text-slate-400">Export your finalized sales ledger to an XLSX spreadsheet.</p>
              </div>
              <Button variant="secondary" onClick={handleExport} isLoading={isExporting}>
                <Download size={16} className="mr-2" />
                Export XLSX
              </Button>
            </div>

            <div className="flex items-center justify-between py-4">
              <div>
                <h3 className="font-medium text-red-400">Factory Reset</h3>
                <p className="text-sm text-slate-400">Wipe all data and start fresh. A mandatory full backup will be created first to prevent data loss.</p>
              </div>
              <Button variant="danger" onClick={handleReset} isLoading={isResetting}>
                <RefreshCcw size={16} className="mr-2" />
                Reset Database
              </Button>
            </div>
          </div>
        </GlassCard>
      </div>
    </PageContainer>
  )
}
