// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Create Purchase Order Modal
// Multi-step: select supplier, add dynamic line items,
// then submit to po:create. PO number is auto-generated.
// ────────────────────────────────────────────────────────

import { useState, useCallback, useEffect, type FormEvent } from 'react'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Textarea } from '../ui/Textarea'
import { Select } from '../ui/Select'
import { Button } from '../ui/Button'
import { toast } from '../../store/useToastStore'
import { ClipboardList, Plus, Trash2 } from 'lucide-react'

interface CreatePurchaseOrderModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
}

/** Lightweight types for the dropdown data — avoid importing heavy shared types into renderer */
interface SupplierOption {
  id: number
  name: string
}

interface ProductOption {
  id: number
  name: string
  skuNumber: string
  defaultUnitCost: number
}

interface LineItem {
  /** Client-side key for React reconciliation */
  key: string
  productId: string
  quantity: string
  unitCost: string
}

interface FormErrors {
  supplierId?: string
  lineItems?: string
  rows?: Record<number, Partial<Record<'productId' | 'quantity' | 'unitCost', string>>>
}

const createEmptyLine = (): LineItem => ({
  key: Math.random().toString(36).substring(2, 9),
  productId: '',
  quantity: '1',
  unitCost: ''
})

export function CreatePurchaseOrderModal({ isOpen, onClose, onCreated }: CreatePurchaseOrderModalProps) {
  // ─── Dropdown Data ───────────────────────────────────
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([])
  const [products, setProducts] = useState<ProductOption[]>([])
  const [isLoadingDropdowns, setIsLoadingDropdowns] = useState(false)

  // ─── Form State ──────────────────────────────────────
  const [supplierId, setSupplierId] = useState('')
  const [description, setDescription] = useState('')
  const [lineItems, setLineItems] = useState<LineItem[]>([createEmptyLine()])
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  // ─── Load Dropdown Data ──────────────────────────────
  useEffect(() => {
    if (!isOpen) return

    const loadDropdowns = async () => {
      setIsLoadingDropdowns(true)
      try {
        const [supplierRes, productRes] = await Promise.all([
          window.api.invoke<{ items: SupplierOption[] }>('supplier:list', { page: 1, pageSize: 500 }),
          window.api.invoke<{ items: ProductOption[] }>('product:list', { page: 1, pageSize: 500 })
        ])
        setSuppliers(supplierRes.items)
        setProducts(productRes.items)
      } catch (error) {
        toast.error('Failed to load data', (error as Error).message)
      } finally {
        setIsLoadingDropdowns(false)
      }
    }

    void loadDropdowns()
  }, [isOpen])

  // ─── Helpers ─────────────────────────────────────────
  const resetForm = useCallback(() => {
    setSupplierId('')
    setDescription('')
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

  const updateLineItem = (index: number, field: keyof Omit<LineItem, 'key'>, value: string) => {
    setLineItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    )
    // Clear row-level error on change
    if (errors.rows?.[index]?.[field as 'productId' | 'quantity' | 'unitCost']) {
      setErrors((prev) => {
        const newRows = { ...prev.rows }
        if (newRows[index]) {
          newRows[index] = { ...newRows[index], [field]: undefined }
        }
        return { ...prev, rows: newRows }
      })
    }
  }

  /**
   * Auto-populate unit cost when a product is selected.
   * Uses the product's defaultUnitCost as a convenience default.
   */
  const handleProductChange = (index: number, productIdStr: string) => {
    updateLineItem(index, 'productId', productIdStr)
    const product = products.find((p) => p.id === parseInt(productIdStr, 10))
    if (product) {
      updateLineItem(index, 'unitCost', product.defaultUnitCost.toString())
    }
  }

  // ─── Validation ──────────────────────────────────────
  const validate = (): boolean => {
    const newErrors: FormErrors = {}

    if (!supplierId) newErrors.supplierId = 'Supplier is required'

    const rowErrors: FormErrors['rows'] = {}
    let hasRowError = false

    lineItems.forEach((item, i) => {
      const rowErr: Partial<Record<'productId' | 'quantity' | 'unitCost', string>> = {}

      if (!item.productId) {
        rowErr.productId = 'Required'
        hasRowError = true
      }

      const qty = parseInt(item.quantity, 10)
      if (isNaN(qty) || qty < 1) {
        rowErr.quantity = '≥ 1'
        hasRowError = true
      }

      const cost = parseFloat(item.unitCost)
      if (isNaN(cost) || cost < 0) {
        rowErr.unitCost = '≥ 0'
        hasRowError = true
      }

      if (Object.keys(rowErr).length > 0) {
        rowErrors[i] = rowErr
      }
    })

    if (hasRowError) newErrors.rows = rowErrors
    if (lineItems.length === 0) newErrors.lineItems = 'At least one line item is required'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // ─── Submit ──────────────────────────────────────────
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    try {
      await window.api.invoke('po:create', {
        supplierId: parseInt(supplierId, 10),
        description: description.trim(),
        lineItems: lineItems.map((item) => ({
          productId: parseInt(item.productId, 10),
          quantity: parseInt(item.quantity, 10),
          unitCost: parseFloat(item.unitCost)
        }))
      })

      toast.success('Purchase Order Created', 'A new PO has been created in DRAFT status.')
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
  const totalCost = lineItems.reduce((sum, item) => {
    const qty = parseInt(item.quantity, 10) || 0
    const cost = parseFloat(item.unitCost) || 0
    return sum + qty * cost
  }, 0)

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Purchase Order" className="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3 pb-2 border-b border-white/5">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
            <ClipboardList size={20} />
          </div>
          <p className="text-sm text-slate-400">
            Create a procurement order. A PO number will be generated automatically. The order starts in DRAFT status.
          </p>
        </div>

        {/* Supplier Select */}
        <div className="space-y-1.5">
          <label htmlFor="po-supplier" className="text-sm font-medium text-slate-300">Supplier *</label>
          <Select
            id="po-supplier"
            value={supplierId}
            onChange={(e) => {
              setSupplierId(e.target.value)
              if (errors.supplierId) setErrors((prev) => ({ ...prev, supplierId: undefined }))
            }}
            disabled={isLoadingDropdowns}
            error={errors.supplierId}
          >
            <option value="">Select a supplier...</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <label htmlFor="po-description" className="text-sm font-medium text-slate-300">Description</label>
          <Textarea
            id="po-description"
            placeholder="Optional notes about this purchase order..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
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
          <div className="grid grid-cols-[1fr_80px_100px_36px] gap-2 px-1">
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Product</span>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Qty</span>
            <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Unit Cost</span>
            <span />
          </div>

          {/* Dynamic Rows */}
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {lineItems.map((item, index) => (
              <div key={item.key} className="grid grid-cols-[1fr_80px_100px_36px] gap-2 items-start">
                <Select
                  value={item.productId}
                  onChange={(e) => handleProductChange(index, e.target.value)}
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
                  onChange={(e) => updateLineItem(index, 'quantity', e.target.value)}
                  error={errors.rows?.[index]?.quantity}
                />

                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unitCost}
                  onChange={(e) => updateLineItem(index, 'unitCost', e.target.value)}
                  error={errors.rows?.[index]?.unitCost}
                />

                <button
                  type="button"
                  onClick={() => removeLineItem(index)}
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
              <span className="text-xs text-slate-500 uppercase tracking-wider mr-3">Estimated Total</span>
              <span className="text-lg font-bold text-white">${totalCost.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Create Purchase Order
          </Button>
        </div>
      </form>
    </Modal>
  )
}
