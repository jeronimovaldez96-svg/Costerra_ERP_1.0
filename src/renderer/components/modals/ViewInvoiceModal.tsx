// ────────────────────────────────────────────────────────
// Costerra ERP v2 — View Invoice Modal
// Displays the breakdown of a completed sale including
// line items, FIFO-blended costs, tax, and profit.
// ────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { toast } from '../../store/useToastStore'
import { Receipt, Download } from 'lucide-react'

interface ViewInvoiceModalProps {
  isOpen: boolean
  onClose: () => void
  saleId: number | null
}

export function ViewInvoiceModal({ isOpen, onClose, saleId }: ViewInvoiceModalProps) {
  const [sale, setSale] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false)

  useEffect(() => {
    if (isOpen && saleId) {
      loadSale()
    } else {
      setSale(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, saleId])

  const loadSale = async () => {
    setIsLoading(true)
    try {
      const data = await window.api.invoke<any>('sale:get', saleId)
      setSale(data)
    } catch (error) {
      toast.error('Failed to load invoice', (error as Error).message)
      onClose()
    } finally {
      setIsLoading(false)
    }
  }

  const handlePrintPdf = async () => {
    if (!sale) return
    setIsGeneratingPdf(true)
    try {
      const { tempPath } = await window.api.invoke<{ tempPath: string }>('pdf:generate-sale', { saleId: sale.id })
      const { finalPath } = await window.api.invoke<{ finalPath: string | null }>('pdf:prompt-save', {
        tempPath,
        defaultName: `Invoice_${sale.saleNumber}.pdf`
      })
      if (finalPath) {
        toast.success('PDF Saved', `Invoice saved to ${finalPath}`)
      }
    } catch (error) {
      toast.error('PDF Generation Failed', (error as Error).message)
    } finally {
      setIsGeneratingPdf(false)
    }
  }

  const marginColor = (margin: number) => {
    if (margin > 30) return 'text-emerald-400'
    if (margin < 10) return 'text-amber-400'
    return 'text-slate-300'
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Invoice Details" className="max-w-3xl">
      {isLoading || !sale ? (
        <div className="flex items-center justify-center h-64">
          <span className="w-8 h-8 rounded-full border-4 border-primary-500/30 border-t-primary-500 animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/5">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400">
                <Receipt size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">{sale.saleNumber}</h3>
                <p className="text-sm text-slate-400">
                  {new Date(sale.saleDate).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-400 mb-1">Profit Margin</p>
              <span className={`text-lg font-bold ${marginColor(sale.profitMargin)}`}>
                {sale.profitMargin.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Line Items Table */}
          <div>
            <h4 className="text-sm font-medium text-slate-200 mb-3">Items Sold</h4>
            <div className="overflow-hidden rounded-lg border border-white/5">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-400 uppercase bg-slate-900/80 border-b border-white/5">
                  <tr>
                    <th className="px-4 py-3 font-medium">Product</th>
                    <th className="px-4 py-3 font-medium text-right">Qty</th>
                    <th className="px-4 py-3 font-medium text-right">Unit Price</th>
                    <th className="px-4 py-3 font-medium text-right">FIFO Cost</th>
                    <th className="px-4 py-3 font-medium text-right">Revenue</th>
                    <th className="px-4 py-3 font-medium text-right">Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {sale.lineItems?.map((item: any) => (
                    <tr key={item.id} className="bg-slate-900/30 hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3 text-slate-300">
                        {item.product?.name}
                        <span className="text-xs text-slate-500 block">{item.product?.skuNumber}</span>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-300">{item.quantity}</td>
                      <td className="px-4 py-3 text-right text-slate-300">${item.unitPrice.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-slate-400">${item.blendedUnitCost.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right text-slate-300">${item.lineRevenue.toFixed(2)}</td>
                      <td className={`px-4 py-3 text-right font-medium ${item.lineProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        ${item.lineProfit.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  {(!sale.lineItems || sale.lineItems.length === 0) && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-slate-500">No line items.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="space-y-2 p-4 rounded-lg border border-white/5 bg-slate-900/50">
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Total Revenue</span>
              <span className="text-slate-200">${sale.totalRevenue.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-400">Total Cost (FIFO)</span>
              <span className="text-slate-200">${sale.totalCost.toFixed(2)}</span>
            </div>
            {sale.taxAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Tax</span>
                <span className="text-slate-200">${sale.taxAmount.toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between text-base font-bold pt-2 border-t border-white/5">
              <span className="text-slate-200">Net Profit</span>
              <span className={sale.profitAmount >= 0 ? 'text-emerald-400' : 'text-red-400'}>
                ${sale.profitAmount.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Action Bar */}
          <div className="pt-4 border-t border-white/5 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={handlePrintPdf}
              isLoading={isGeneratingPdf}
              disabled={isGeneratingPdf}
            >
              <Download size={16} className="mr-2" />
              Save Invoice PDF
            </Button>

            <Button variant="ghost" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
