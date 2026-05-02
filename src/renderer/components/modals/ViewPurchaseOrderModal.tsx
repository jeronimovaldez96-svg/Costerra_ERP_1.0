// ────────────────────────────────────────────────────────
// Costerra ERP v2 — View Purchase Order Modal
// ────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Select } from '../ui/Select'
import { toast } from '../../store/useToastStore'
import { ClipboardList, ArrowRight } from 'lucide-react'

interface ViewPurchaseOrderModalProps {
  isOpen: boolean
  onClose: () => void
  onUpdated: () => void
  poId: number | null
}

const statusColors = {
  DRAFT: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  ORDERED: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  IN_TRANSIT: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  DELIVERED: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  IN_INVENTORY: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
}

const statusOrder = ['DRAFT', 'ORDERED', 'IN_TRANSIT', 'DELIVERED', 'IN_INVENTORY']

export function ViewPurchaseOrderModal({ isOpen, onClose, onUpdated, poId }: ViewPurchaseOrderModalProps) {
  const [po, setPo] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [nextStatus, setNextStatus] = useState<string>('')

  useEffect(() => {
    if (isOpen && poId) {
      loadPO()
    } else {
      setPo(null)
      setNextStatus('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, poId])

  const loadPO = async () => {
    setIsLoading(true)
    try {
      const data = await window.api.invoke<any>('po:get', poId)
      setPo(data)
      setNextStatus(data.status)
    } catch (error) {
      toast.error('Failed to load PO details', (error as Error).message)
      onClose()
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateStatus = async () => {
    if (!po || nextStatus === po.status) return

    setIsSubmitting(true)
    try {
      await window.api.invoke('po:transition-status', {
        id: po.id,
        data: { status: nextStatus }
      })
      toast.success('Status Updated', `PO ${po.poNumber} moved to ${nextStatus}`)
      onUpdated()
      loadPO() // Reload to get updated state
    } catch (error) {
      toast.error('Transition Failed', (error as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const calculateTotal = () => {
    if (!po || !po.items) return 0
    return po.items.reduce((sum: number, item: any) => sum + (item.quantity * item.unitCost), 0)
  }

  const availableStatuses = statusOrder.filter((status) => {
    // Only allow moving forward
    return statusOrder.indexOf(status) >= statusOrder.indexOf(po?.status || 'DRAFT')
  })

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Purchase Order Details" size="3xl">
      {isLoading || !po ? (
        <div className="flex items-center justify-center h-64">
          <span className="w-8 h-8 rounded-full border-4 border-primary-500/30 border-t-primary-500 animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-white/5">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-primary-500/10 text-primary-400">
                <ClipboardList size={24} />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-white">{po.poNumber}</h3>
                <p className="text-sm text-slate-400">Supplier: <span className="text-slate-200">{po.supplier?.name}</span></p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-slate-400 mb-1">Current Status</p>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusColors[po.status as keyof typeof statusColors]}`}>
                {po.status.replace('_', ' ')}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6 p-4 rounded-lg border border-white/5 bg-slate-900/50">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Description</p>
              <p className="text-sm text-slate-300">{po.description || 'No description provided.'}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Created At</p>
              <p className="text-sm text-slate-300">{new Date(po.createdAt).toLocaleString()}</p>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-slate-200 mb-3">Line Items</h4>
            <div className="overflow-hidden rounded-lg border border-white/5">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-400 uppercase bg-slate-900/80 border-b border-white/5">
                  <tr>
                    <th className="px-4 py-3 font-medium">Product</th>
                    <th className="px-4 py-3 font-medium text-right">Quantity</th>
                    <th className="px-4 py-3 font-medium text-right">Unit Cost</th>
                    <th className="px-4 py-3 font-medium text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {po.items?.map((item: any) => (
                    <tr key={item.id} className="bg-slate-900/30 hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-3 text-slate-300">{item.product?.name} <span className="text-xs text-slate-500 block">{item.product?.skuNumber}</span></td>
                      <td className="px-4 py-3 text-right text-slate-300">{item.quantity}</td>
                      <td className="px-4 py-3 text-right text-slate-300">${item.unitCost.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right font-medium text-white">${(item.quantity * item.unitCost).toFixed(2)}</td>
                    </tr>
                  ))}
                  {(!po.items || po.items.length === 0) && (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-slate-500">No items found.</td>
                    </tr>
                  )}
                </tbody>
                <tfoot className="bg-slate-900/80 border-t border-white/5">
                  <tr>
                    <td colSpan={3} className="px-4 py-3 text-right font-medium text-slate-400">Total Purchase Order Cost:</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-400">${calculateTotal().toFixed(2)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <div className="pt-4 border-t border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Select
                value={nextStatus}
                onChange={(e) => setNextStatus(e.target.value)}
                disabled={po.status === 'IN_INVENTORY'}
                className="w-48"
              >
                {availableStatuses.map(status => (
                  <option key={status} value={status}>
                    {status.replace('_', ' ')}
                  </option>
                ))}
              </Select>
              <Button 
                onClick={handleUpdateStatus} 
                disabled={nextStatus === po.status || po.status === 'IN_INVENTORY'}
                isLoading={isSubmitting}
              >
                <ArrowRight size={16} className="mr-2" />
                Update Status
              </Button>
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
