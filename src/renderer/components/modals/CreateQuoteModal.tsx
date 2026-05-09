// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Create Quote Modal
// ────────────────────────────────────────────────────────

import React, { useState, useCallback, useEffect } from 'react'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Textarea } from '../ui/Textarea'
import { Select } from '../ui/Select'
import { Button } from '../ui/Button'
import { toast } from '../../store/useToastStore'
import { FileText, Plus, Trash2 } from 'lucide-react'

interface CreateQuoteModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
}

interface LeadOption {
  id: number
  leadNumber: string
  name: string
  client: { name: string, surname: string }
}

interface TaxProfileOption {
  id: number
  name: string
}

interface ProductOption {
  id: number
  name: string
  skuNumber: string
  defaultUnitPrice: number
}

interface LineItem {
  key: string
  productId: string
  quantity: string
  // Used only for client-side estimated calculation, not submitted to backend
  unitPrice: number
}

interface FormErrors {
  salesLeadId?: string | undefined
  lineItems?: string | undefined
  rows?: Record<number, Partial<Record<'productId' | 'quantity', string>>> | undefined
}

const createEmptyLine = (): LineItem => ({
  key: Math.random().toString(36).substring(2, 9),
  productId: '',
  quantity: '1',
  unitPrice: 0
})

export function CreateQuoteModal({ isOpen, onClose, onCreated }: CreateQuoteModalProps) {
  // ─── Dropdown Data ───────────────────────────────────
  const [leads, setLeads] = useState<LeadOption[]>([])
  const [taxProfiles, setTaxProfiles] = useState<TaxProfileOption[]>([])
  const [products, setProducts] = useState<ProductOption[]>([])
  const [isLoadingDropdowns, setIsLoadingDropdowns] = useState(false)

  // ─── Form State ──────────────────────────────────────
  const [salesLeadId, setSalesLeadId] = useState('')
  const [taxProfileId, setTaxProfileId] = useState('')
  const [notes, setNotes] = useState('')
  const [lineItems, setLineItems] = useState<LineItem[]>([createEmptyLine()])
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // ─── Load Dropdown Data ──────────────────────────────
  useEffect(() => {
    if (!isOpen) return

    const loadDropdowns = async () => {
      setIsLoadingDropdowns(true)
      try {
        const [leadRes, taxRes, productRes] = await Promise.all([
          window.api.invoke<{ items: LeadOption[] }>('lead:list', { page: 1, pageSize: 500 }),
          window.api.invoke<{ items: TaxProfileOption[] }>('tax-profile:list', { page: 1, pageSize: 500 }),
          window.api.invoke<{ items: ProductOption[] }>('product:list', { page: 1, pageSize: 500 })
        ])
        setLeads(leadRes.items)
        setTaxProfiles(taxRes.items)
        setProducts(productRes.items)
      } catch (error) {
        toast.error('Failed to load dropdown data', (error as Error).message)
      } finally {
        setIsLoadingDropdowns(false)
      }
    }

    void loadDropdowns()
  }, [isOpen])

  // ─── Helpers ─────────────────────────────────────────
  const resetForm = useCallback(() => {
    setSalesLeadId('')
    setTaxProfileId('')
    setNotes('')
    setLineItems([createEmptyLine()])
    setErrors({})
  }, [])

  const handleClose = useCallback(() => {
    resetForm()
    onClose()
  }, [onClose, resetForm])

  const addLineItem = () => {
    setLineItems((prev) => [...prev, createEmptyLine()])
  }

  const removeLineItem = (index: number) => {
    setLineItems((prev) => {
      if (prev.length <= 1) return prev
      return prev.filter((_, i) => i !== index)
    })
  }

  const updateLineItem = (index: number, field: keyof Omit<LineItem, 'key' | 'unitPrice'>, value: string) => {
    setLineItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    )
    if (errors.rows?.[index]?.[field] !== undefined) {
      setErrors((prev) => {
        const newRows = { ...prev.rows }
        const row = newRows[index]
        if (row !== undefined) {
          newRows[index] = { ...row, [field]: undefined }
        }
        return { ...prev, rows: newRows }
      })
    }
  }

  const handleProductChange = (index: number, productIdStr: string) => {
    updateLineItem(index, 'productId', productIdStr)
    const product = products.find((p) => p.id === parseInt(productIdStr, 10))
    setLineItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, unitPrice: product?.defaultUnitPrice ?? 0 } : item))
    )
  }

  // ─── Validation ──────────────────────────────────────
  const validate = (): boolean => {
    const newErrors: FormErrors = {}

    if (salesLeadId === '') newErrors.salesLeadId = 'Sales lead is required'

    const rowErrors: FormErrors['rows'] = {}

    lineItems.forEach((item, i) => {
      const rowErr: Partial<Record<'productId' | 'quantity', string>> = {}

      if (!item.productId) {
        rowErr.productId = 'Required'
      }

      const qty = parseInt(item.quantity, 10)
      if (isNaN(qty) || qty < 1) {
        rowErr.quantity = '≥ 1'
      }

      if (Object.keys(rowErr).length > 0) {
        rowErrors[i] = rowErr
      }
    })

    if (Object.keys(rowErrors).length > 0) newErrors.rows = rowErrors
    if (lineItems.length === 0) newErrors.lineItems = 'At least one line item is required'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // ─── Submit ──────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    try {
      await window.api.invoke('quote:create', {
        salesLeadId: parseInt(salesLeadId, 10),
        taxProfileId: taxProfileId ? parseInt(taxProfileId, 10) : undefined,
        notes: notes.trim(),
        lineItems: lineItems.map((item) => ({
          productId: parseInt(item.productId, 10),
          quantity: parseInt(item.quantity, 10)
        }))
      })

      toast.success('Quote Created', 'A new pricing proposal has been generated.')
      resetForm()
      onCreated()
      onClose()
    } catch (error) {
      toast.error('Creation Failed', (error as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // ─── Computed ────────────────────────────────────────
  const estimatedSubtotal = lineItems.reduce((sum, item) => {
    const qty = parseInt(item.quantity, 10) || 0
    return sum + (qty * item.unitPrice)
  }, 0)

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Quote" className="max-w-3xl">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3 pb-2 border-b border-white/5">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
            <FileText size={20} />
          </div>
          <p className="text-sm text-slate-400">
            Generate a new pricing proposal for a sales lead.
          </p>
        </div>

        {/* Dropdowns */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="quote-lead" className="text-sm font-medium text-slate-300">Sales Lead *</label>
            <Select
              id="quote-lead"
              value={salesLeadId}
              onChange={(e) => {
                setSalesLeadId(e.target.value)
                if (errors.salesLeadId) setErrors((prev) => ({ ...prev, salesLeadId: undefined }))
              }}
              disabled={isLoadingDropdowns}
              error={errors.salesLeadId}
            >
              <option value="">Select a lead...</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.client.name} {l.client.surname} — {l.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1.5">
            <label htmlFor="quote-tax" className="text-sm font-medium text-slate-300">Tax Profile (Optional)</label>
            <Select
              id="quote-tax"
              value={taxProfileId}
              onChange={(e) => { setTaxProfileId(e.target.value); }}
              disabled={isLoadingDropdowns}
            >
              <option value="">No Tax Applied</option>
              {taxProfiles.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label htmlFor="quote-notes" className="text-sm font-medium text-slate-300">Notes & Terms</label>
          <Textarea
            id="quote-notes"
            placeholder="Terms and conditions or notes for the client..."
            value={notes}
            onChange={(e) => { setNotes(e.target.value); }}
            rows={2}
          />
        </div>

        {/* Line Items */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-slate-300">Line Items *</label>
            <Button type="button" variant="ghost" size="sm" onClick={addLineItem} disabled={isLoadingDropdowns}>
              <Plus size={14} className="mr-1" />
              Add Item
            </Button>
          </div>

          {errors.lineItems && (
            <p className="text-xs text-red-500">{errors.lineItems}</p>
          )}

          {/* Column Headers */}
          <div className="grid grid-cols-[1fr_100px_100px_36px] gap-2 px-1">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Product</span>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Qty</span>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider text-right">Unit Price</span>
            <span />
          </div>

          {/* Dynamic Rows */}
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {lineItems.map((item, index) => (
              <div key={item.key} className="grid grid-cols-[1fr_100px_100px_36px] gap-2 items-start">
                <Select
                  value={item.productId}
                  onChange={(e) => { handleProductChange(index, e.target.value); }}
                  disabled={isLoadingDropdowns}
                  error={errors.rows?.[index]?.productId}
                >
                  <option value="">Select product...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.skuNumber} — {p.name}
                    </option>
                  ))}
                </Select>

                <Input
                  type="number"
                  min="1"
                  step="1"
                  value={item.quantity}
                  onChange={(e) => { updateLineItem(index, 'quantity', e.target.value); }}
                  error={errors.rows?.[index]?.quantity}
                />

                <div className="flex items-center justify-end h-10 px-3 text-sm text-slate-400 bg-slate-900/50 rounded-lg border border-white/5">
                  ${item.unitPrice.toFixed(2)}
                </div>

                <button
                  type="button"
                  onClick={() => { removeLineItem(index); }}
                  disabled={lineItems.length <= 1}
                  className="flex items-center justify-center h-10 w-9 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* Running Total */}
          <div className="flex justify-end pt-2 border-t border-white/5">
            <div className="text-right">
              <span className="text-xs text-slate-500 uppercase tracking-wider mr-3">Estimated Subtotal</span>
              <span className="text-lg font-bold text-white">${estimatedSubtotal.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Create Quote
          </Button>
        </div>
      </form>
    </Modal>
  )
}
