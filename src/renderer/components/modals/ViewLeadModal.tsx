// ────────────────────────────────────────────────────────
// Costerra ERP v2 — View Sales Lead Modal
// Displays lead details, associated quotes, and manual
// status closure actions (Closed with Sale / No Sale).
// ────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { toast } from '../../store/useToastStore'
import {
  Target,
  CheckCircle,
  XCircle,
  FileText
} from 'lucide-react'

interface ViewLeadModalProps {
  isOpen: boolean
  onClose: () => void
  onUpdated: () => void
  leadId: number | null
}

const statusColors: Record<string, string> = {
  IN_PROGRESS: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  CLOSED_SALE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  CLOSED_NO_SALE: 'bg-red-500/10 text-red-400 border-red-500/20'
}

const statusLabels: Record<string, string> = {
  IN_PROGRESS: 'In Progress',
  CLOSED_SALE: 'Closed with Sale',
  CLOSED_NO_SALE: 'Closed with no Sale'
}

const quoteStatusColors: Record<string, string> = {
  DRAFT: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  SENT: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  SOLD: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  REJECTED: 'bg-red-500/10 text-red-400 border-red-500/20',
  NOT_SOLD: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
}

export function ViewLeadModal({ isOpen, onClose, onUpdated, leadId }: ViewLeadModalProps) {
  const [lead, setLead] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)

  useEffect(() => {
    if (isOpen && leadId) {
      loadLead()
    } else {
      setLead(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, leadId])

  const loadLead = async () => {
    setIsLoading(true)
    try {
      const data = await window.api.invoke<any>('lead:detail', leadId)
      setLead(data)
    } catch (error) {
      toast.error('Failed to load lead details', (error as Error).message)
      onClose()
    } finally {
      setIsLoading(false)
    }
  }

  const handleCloseWithSale = async () => {
    if (!lead) return
    setIsTransitioning(true)
    try {
      await window.api.invoke('lead:update-status', {
        id: lead.id,
        data: { status: 'CLOSED_SALE' }
      })
      toast.success('Lead Closed', 'Lead has been closed with a sale.')
      onUpdated()
      loadLead()
    } catch (error) {
      toast.error('Transition Failed', (error as Error).message)
    } finally {
      setIsTransitioning(false)
    }
  }

  const handleCloseWithNoSale = async () => {
    if (!lead) return
    setIsTransitioning(true)
    try {
      await window.api.invoke('lead:update-status', {
        id: lead.id,
        data: { status: 'CLOSED_NO_SALE' }
      })
      toast.success('Lead Closed', 'Lead has been closed with no sale. Open quotes have been marked NOT_SOLD.')
      onUpdated()
      loadLead()
    } catch (error) {
      toast.error('Transition Failed', (error as Error).message)
    } finally {
      setIsTransitioning(false)
    }
  }

  const isClosed = lead?.status === 'CLOSED_SALE' || lead?.status === 'CLOSED_NO_SALE'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Sales Lead Details" className="max-w-3xl">
      {isLoading || !lead ? (
        <div className="flex items-center justify-center h-64">
          <span className="w-8 h-8 rounded-full border-4 border-primary-500/30 border-t-primary-500 animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/5">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary-500/10 text-primary-400">
                <Target size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">{lead.leadNumber}</h3>
                <p className="text-sm text-slate-400">{lead.name}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-400 mb-1">Status</p>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusColors[lead.status] || 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
                {statusLabels[lead.status] || lead.status}
              </span>
            </div>
          </div>

          {/* Client Info */}
          <div className="grid grid-cols-3 gap-4 p-4 rounded-lg border border-white/5 bg-slate-900/50">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Client</p>
              <p className="text-sm text-slate-300">
                {lead.client ? `${lead.client.name} ${lead.client.surname}` : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Created</p>
              <p className="text-sm text-slate-300">{new Date(lead.createdAt).toLocaleDateString()}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Last Updated</p>
              <p className="text-sm text-slate-300">{new Date(lead.updatedAt).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Quotes Table */}
          <div>
            <h4 className="text-sm font-medium text-slate-200 mb-3 flex items-center gap-2">
              <FileText size={16} />
              Quotes ({lead.quotes?.length || 0})
            </h4>
            <div className="overflow-hidden rounded-lg border border-white/5">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-400 uppercase bg-slate-900/80 border-b border-white/5">
                  <tr>
                    <th className="px-4 py-3 font-medium">Quote #</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {lead.quotes?.map((q: any) => (
                    <tr key={q.id} className="bg-slate-900/30 hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3 text-slate-300 font-medium">{q.quoteNumber}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${quoteStatusColors[q.status] || ''}`}>
                          {q.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-400">
                        {new Date(q.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {(!lead.quotes || lead.quotes.length === 0) && (
                    <tr>
                      <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                        No quotes have been created for this lead yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Action Bar */}
          <div className="pt-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {!isClosed && (
                <>
                  <Button
                    onClick={handleCloseWithSale}
                    isLoading={isTransitioning}
                    disabled={isTransitioning}
                    className="bg-emerald-600 hover:bg-emerald-500"
                  >
                    <CheckCircle size={16} className="mr-2" />
                    Closed with Sale
                  </Button>

                  <Button
                    variant="ghost"
                    onClick={handleCloseWithNoSale}
                    isLoading={isTransitioning}
                    disabled={isTransitioning}
                    className="text-red-400 hover:bg-red-500/10"
                  >
                    <XCircle size={16} className="mr-2" />
                    Closed with no Sale
                  </Button>
                </>
              )}

              {isClosed && (
                <span className="text-xs text-slate-500 italic">
                  This lead has been closed. No further actions available.
                </span>
              )}
            </div>

            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
