// ────────────────────────────────────────────────────────
// Costerra ERP v2 — View Quote Modal
// Displays quote details, line items, and provides actions:
//   - Print as PDF
//   - Transition status (DRAFT→SENT→SOLD/REJECTED)
//   - Execute sale (when SENT)
// ────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { toast } from '../../store/useToastStore'
import {
  FileText,
  Send,
  CheckCircle,
  XCircle,
  Download
} from 'lucide-react'

interface ViewQuoteModalProps {
  isOpen: boolean
  onClose: () => void
  onUpdated: () => void
  quoteId: number | null
}

const statusColors: Record<string, string> = {
  DRAFT: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  SENT: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  SOLD: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  REJECTED: 'bg-red-500/10 text-red-400 border-red-500/20',
  NOT_SOLD: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
}

export function ViewQuoteModal({ isOpen, onClose, onUpdated, quoteId }: ViewQuoteModalProps) {
  const [quote, setQuote] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)
  const [isExecutingSale, setIsExecutingSale] = useState(false)

  useEffect(() => {
    if (isOpen && quoteId) {
      loadQuote()
    } else {
      setQuote(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, quoteId])

  const loadQuote = async () => {
    setIsLoading(true)
    try {
      const data = await window.api.invoke<any>('quote:get', quoteId)
      setQuote(data)
    } catch (error) {
      toast.error('Failed to load quote', (error as Error).message)
      onClose()
    } finally {
      setIsLoading(false)
    }
  }

  // ─── PDF Generation ──────────────────────────────────
  const handlePrintPdf = async () => {
    if (!quote) return
    setIsGeneratingPdf(true)
    try {
      const { tempPath } = await window.api.invoke<{ tempPath: string }>('pdf:generate-quote', { quoteId: quote.id })
      const { finalPath } = await window.api.invoke<{ finalPath: string | null }>('pdf:prompt-save', {
        tempPath,
        defaultName: `Quote_${quote.quoteNumber}.pdf`
      })

      if (finalPath) {
        toast.success('PDF Saved', `Quote saved to ${finalPath}`)
      }
    } catch (error) {
      toast.error('PDF Generation Failed', (error as Error).message)
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  // ─── Status Transitions ──────────────────────────────
  const handleTransition = async (nextStatus: 'SENT' | 'REJECTED') => {
    if (!quote) return
    setIsTransitioning(true)
    try {
      await window.api.invoke('quote:set-tax-profile', {
        id: quote.id,
        data: { status: nextStatus }
      })
      toast.success('Status Updated', `Quote moved to ${nextStatus}`)
      onUpdated()
      loadQuote()
    } catch (error) {
      toast.error('Transition Failed', (error as Error).message)
    } finally {
      setIsTransitioning(false)
    }
  }

  // ─── Sale Execution ──────────────────────────────────
  const handleExecuteSale = async () => {
    if (!quote) return
    setIsExecutingSale(true)
    try {
      await window.api.invoke('sale:execute', { quoteId: quote.id })
      toast.success('Sale Executed', `Quote ${quote.quoteNumber} has been converted to a sale.`)
      onUpdated()
      loadQuote()
    } catch (error) {
      toast.error('Sale Execution Failed', (error as Error).message)
    } finally {
      setIsExecutingSale(false)
    }
  }

  // ─── Computed ────────────────────────────────────────
  const subtotal = quote?.lineItems?.reduce((sum: number, item: any) => sum + (item.lineTotal || 0), 0) ?? 0

  const taxAmount = (() => {
    if (!quote?.taxProfile?.components) return 0
    return quote.taxProfile.components.reduce(
      (sum: number, comp: any) => sum + (subtotal * comp.rate),
      0
    )
  })()

  const grandTotal = subtotal + taxAmount

  // Terminal states where no further transitions are possible
  const isTerminal = ['SOLD', 'REJECTED', 'NOT_SOLD'].includes(quote?.status)

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Quote Details" className="max-w-3xl">
      {isLoading || !quote ? (
        <div className="flex items-center justify-center h-64">
          <span className="w-8 h-8 rounded-full border-4 border-primary-500/30 border-t-primary-500 animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/5">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary-500/10 text-primary-400">
                <FileText size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">{quote.quoteNumber}</h3>
                <p className="text-sm text-slate-400">
                  Created {new Date(quote.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-400 mb-1">Status</p>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusColors[quote.status] || ''}`}>
                {quote.status.replace('_', ' ')}
              </span>
            </div>
          </div>

          {/* Meta Info */}
          <div className="grid grid-cols-3 gap-4 p-4 rounded-lg border border-white/5 bg-slate-900/50">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Lead</p>
              <p className="text-sm text-slate-300">{quote.salesLeadId}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Tax Profile</p>
              <p className="text-sm text-slate-300">{quote.taxProfile?.name || 'None'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Notes</p>
              <p className="text-sm text-slate-300 truncate">{quote.notes || '—'}</p>
            </div>
          </div>

          {/* Line Items Table */}
          <div>
            <h4 className="text-sm font-medium text-slate-200 mb-3">Line Items</h4>
            <div className="overflow-hidden rounded-lg border border-white/5">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-400 uppercase bg-slate-900/80 border-b border-white/5">
                  <tr>
                    <th className="px-4 py-3 font-medium">Product</th>
                    <th className="px-4 py-3 font-medium text-right">Qty</th>
                    <th className="px-4 py-3 font-medium text-right">Unit Price</th>
                    <th className="px-4 py-3 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {quote.lineItems?.map((item: any) => (
                    <tr key={item.id} className="bg-slate-900/30 hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3 text-slate-300">
                        {item.product?.name}
                        <span className="text-xs text-slate-500 block">{item.product?.skuNumber}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-300">{item.quantity}</td>
                      <td className="px-4 py-3 text-right text-slate-300">${item.unitPrice.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-medium text-white">${item.lineTotal.toFixed(2)}</td>
                    </tr>
                  ))}
                  {(!quote.lineItems || quote.lineItems.length === 0) && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-500">No line items.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="space-y-2 p-4 rounded-lg border border-white/5 bg-slate-900/50">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Subtotal</span>
              <span className="text-slate-200">${subtotal.toFixed(2)}</span>
            </div>
            {quote.taxProfile && (
              <>
                {quote.taxProfile.components.map((comp: any) => (
                  <div key={comp.id} className="flex justify-between text-sm">
                    <span className="text-slate-400">{comp.name} ({(comp.rate * 100).toFixed(1)}%)</span>
                    <span className="text-slate-200">${(subtotal * comp.rate).toFixed(2)}</span>
                  </div>
                ))}
              </>
            )}
            <div className="flex justify-between text-base font-bold pt-2 border-t border-white/5">
              <span className="text-slate-200">Grand Total</span>
              <span className="text-emerald-400">${grandTotal.toFixed(2)}</span>
            </div>
          </div>

          {/* Action Bar */}
          <div className="pt-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Always available: PDF */}
              <Button
                variant="ghost"
                onClick={handlePrintPdf}
                isLoading={isGeneratingPdf}
                disabled={isGeneratingPdf}
              >
                <Download size={16} className="mr-2" />
                Save PDF
              </Button>

              {/* DRAFT → SENT */}
              {quote.status === 'DRAFT' && (
                <Button
                  onClick={() => handleTransition('SENT')}
                  isLoading={isTransitioning}
                  disabled={isTransitioning}
                >
                  <Send size={16} className="mr-2" />
                  Mark as Sent
                </Button>
              )}

              {/* SENT → SOLD (execute sale) */}
              {quote.status === 'SENT' && (
                <Button
                  onClick={handleExecuteSale}
                  isLoading={isExecutingSale}
                  disabled={isExecutingSale}
                  className="bg-emerald-600 hover:bg-emerald-500"
                >
                  <CheckCircle size={16} className="mr-2" />
                  Confirm Sale
                </Button>
              )}

              {/* SENT → REJECTED */}
              {quote.status === 'SENT' && (
                <Button
                  variant="ghost"
                  onClick={() => handleTransition('REJECTED')}
                  isLoading={isTransitioning}
                  disabled={isTransitioning}
                  className="text-red-400 hover:bg-red-500/10"
                >
                  <XCircle size={16} className="mr-2" />
                  Reject Quote
                </Button>
              )}

              {/* Terminal State Indicator */}
              {isTerminal && (
                <span className="text-xs text-slate-500 italic ml-2">
                  No further actions available.
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
