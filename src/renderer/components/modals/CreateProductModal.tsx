// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Create Product Modal
// Collects product catalog data and sends to product:create.
// ────────────────────────────────────────────────────────

import { useState, useCallback, type FormEvent } from 'react'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { toast } from '../../store/useToastStore'
import { Package } from 'lucide-react'

interface CreateProductModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
}

interface FormState {
  name: string
  productGroup: string
  productFamily: string
  color: string
  defaultUnitCost: string
  defaultUnitPrice: string
}

const INITIAL_FORM: FormState = {
  name: '',
  productGroup: '',
  productFamily: '',
  color: '',
  defaultUnitCost: '',
  defaultUnitPrice: ''
}

export function CreateProductModal({ isOpen, onClose, onCreated }: CreateProductModalProps) {
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const resetForm = useCallback(() => {
    setForm(INITIAL_FORM)
    setErrors({})
  }, [])

  const handleClose = useCallback(() => {
    resetForm()
    onClose()
  }, [onClose, resetForm])

  const updateField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
    // Clear field-level error on change
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormState, string>> = {}

    if (!form.name.trim()) newErrors.name = 'Product name is required'
    if (!form.productGroup.trim()) newErrors.productGroup = 'Product group is required'
    if (!form.productFamily.trim()) newErrors.productFamily = 'Product family is required'
    if (!form.color.trim()) newErrors.color = 'Color is required'

    const cost = parseFloat(form.defaultUnitCost)
    if (isNaN(cost) || cost < 0) newErrors.defaultUnitCost = 'Cost must be ≥ 0'

    const price = parseFloat(form.defaultUnitPrice)
    if (isNaN(price) || price < 0) newErrors.defaultUnitPrice = 'Price must be ≥ 0'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    try {
      await window.api.invoke('product:create', {
        name: form.name.trim(),
        productGroup: form.productGroup.trim(),
        productFamily: form.productFamily.trim(),
        color: form.color.trim(),
        defaultUnitCost: parseFloat(form.defaultUnitCost),
        defaultUnitPrice: parseFloat(form.defaultUnitPrice)
      })

      toast.success('Product Created', `"${form.name.trim()}" has been added to the catalog.`)
      resetForm()
      onCreated()
      onClose()
    } catch (error) {
      toast.error('Creation Failed', (error as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add New Product">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Header icon */}
        <div className="flex items-center gap-3 pb-2 border-b border-white/5">
          <div className="p-2 rounded-lg bg-primary-500/10 text-primary-400">
            <Package size={20} />
          </div>
          <p className="text-sm text-slate-400">Fill in the product details below. A unique SKU will be generated automatically.</p>
        </div>

        {/* Name */}
        <div className="space-y-1.5">
          <label htmlFor="product-name" className="text-sm font-medium text-slate-300">Product Name *</label>
          <Input
            id="product-name"
            placeholder="e.g. Premium Oak Panel"
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
            error={errors.name}
          />
        </div>

        {/* Group + Family row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="product-group" className="text-sm font-medium text-slate-300">Product Group *</label>
            <Input
              id="product-group"
              placeholder="e.g. Panels"
              value={form.productGroup}
              onChange={(e) => updateField('productGroup', e.target.value)}
              error={errors.productGroup}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="product-family" className="text-sm font-medium text-slate-300">Product Family *</label>
            <Input
              id="product-family"
              placeholder="e.g. Wood"
              value={form.productFamily}
              onChange={(e) => updateField('productFamily', e.target.value)}
              error={errors.productFamily}
            />
          </div>
        </div>

        {/* Color */}
        <div className="space-y-1.5">
          <label htmlFor="product-color" className="text-sm font-medium text-slate-300">Color *</label>
          <Input
            id="product-color"
            placeholder="e.g. Natural Oak"
            value={form.color}
            onChange={(e) => updateField('color', e.target.value)}
            error={errors.color}
          />
        </div>

        {/* Cost + Price row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="product-cost" className="text-sm font-medium text-slate-300">Default Unit Cost *</label>
            <Input
              id="product-cost"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={form.defaultUnitCost}
              onChange={(e) => updateField('defaultUnitCost', e.target.value)}
              error={errors.defaultUnitCost}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="product-price" className="text-sm font-medium text-slate-300">Default Unit Price *</label>
            <Input
              id="product-price"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={form.defaultUnitPrice}
              onChange={(e) => updateField('defaultUnitPrice', e.target.value)}
              error={errors.defaultUnitPrice}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Create Product
          </Button>
        </div>
      </form>
    </Modal>
  )
}
