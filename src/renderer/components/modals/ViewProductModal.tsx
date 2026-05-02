// ────────────────────────────────────────────────────────
// Costerra ERP v2 — View/Edit Product Modal
// ────────────────────────────────────────────────────────

import { useState, useEffect, type FormEvent } from 'react'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { toast } from '../../store/useToastStore'
import { Package } from 'lucide-react'

interface ViewProductModalProps {
  isOpen: boolean
  onClose: () => void
  onUpdated: () => void
  productId: number | null
}

interface FormState {
  name: string
  productGroup: string
  productFamily: string
  color: string
  defaultUnitCost: string
  defaultUnitPrice: string
  isActive: boolean
}

export function ViewProductModal({ isOpen, onClose, onUpdated, productId }: ViewProductModalProps) {
  const [form, setForm] = useState<FormState | null>(null)
  const [skuNumber, setSkuNumber] = useState('')
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen && productId) {
      loadProduct()
    } else {
      setForm(null)
      setErrors({})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, productId])

  const loadProduct = async () => {
    setIsLoading(true)
    try {
      // Need to type the response because product:get returns a specific shape
      const product = await window.api.invoke<any>('product:get', productId)
      setSkuNumber(product.skuNumber)
      setForm({
        name: product.name,
        productGroup: product.productGroup,
        productFamily: product.productFamily,
        color: product.color,
        defaultUnitCost: product.defaultUnitCost.toString(),
        defaultUnitPrice: product.defaultUnitPrice.toString(),
        isActive: product.isActive
      })
    } catch (error) {
      toast.error('Failed to load product details', (error as Error).message)
      onClose()
    } finally {
      setIsLoading(false)
    }
  }

  const updateField = (field: keyof FormState, value: string | boolean) => {
    setForm((prev) => prev ? { ...prev, [field]: value } : null)
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const validate = (): boolean => {
    if (!form) return false
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
    if (!validate() || !form || !productId) return

    setIsSubmitting(true)
    try {
      await window.api.invoke('product:update', {
        id: productId,
        data: {
          name: form.name.trim(),
          productGroup: form.productGroup.trim(),
          productFamily: form.productFamily.trim(),
          color: form.color.trim(),
          defaultUnitCost: parseFloat(form.defaultUnitCost),
          defaultUnitPrice: parseFloat(form.defaultUnitPrice),
          isActive: form.isActive
        }
      })

      toast.success('Product Updated', `"${form.name.trim()}" has been updated.`)
      onUpdated()
      onClose()
    } catch (error) {
      toast.error('Update Failed', (error as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Product Details">
      {isLoading || !form ? (
        <div className="flex items-center justify-center h-48">
          <span className="w-8 h-8 rounded-full border-4 border-primary-500/30 border-t-primary-500 animate-spin" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex items-center justify-between pb-2 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary-500/10 text-primary-400">
                <Package size={20} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-200">SKU: {skuNumber}</p>
                <p className="text-xs text-slate-400">Update product details below</p>
              </div>
            </div>
            
            <label className="flex items-center gap-2 cursor-pointer">
              <span className="text-sm font-medium text-slate-300">Active</span>
              <input 
                type="checkbox" 
                checked={form.isActive}
                onChange={(e) => updateField('isActive', e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-surface-raised text-primary-500 focus:ring-primary-500 focus:ring-offset-slate-900"
              />
            </label>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="edit-product-name" className="text-sm font-medium text-slate-300">Product Name *</label>
            <Input
              id="edit-product-name"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              error={errors.name}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="edit-product-group" className="text-sm font-medium text-slate-300">Product Group *</label>
              <Input
                id="edit-product-group"
                value={form.productGroup}
                onChange={(e) => updateField('productGroup', e.target.value)}
                error={errors.productGroup}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="edit-product-family" className="text-sm font-medium text-slate-300">Product Family *</label>
              <Input
                id="edit-product-family"
                value={form.productFamily}
                onChange={(e) => updateField('productFamily', e.target.value)}
                error={errors.productFamily}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="edit-product-color" className="text-sm font-medium text-slate-300">Color *</label>
            <Input
              id="edit-product-color"
              value={form.color}
              onChange={(e) => updateField('color', e.target.value)}
              error={errors.color}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="edit-product-cost" className="text-sm font-medium text-slate-300">Default Unit Cost *</label>
              <Input
                id="edit-product-cost"
                type="number"
                step="0.01"
                min="0"
                value={form.defaultUnitCost}
                onChange={(e) => updateField('defaultUnitCost', e.target.value)}
                error={errors.defaultUnitCost}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="edit-product-price" className="text-sm font-medium text-slate-300">Default Unit Price *</label>
              <Input
                id="edit-product-price"
                type="number"
                step="0.01"
                min="0"
                value={form.defaultUnitPrice}
                onChange={(e) => updateField('defaultUnitPrice', e.target.value)}
                error={errors.defaultUnitPrice}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
            <Button type="button" variant="ghost" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" isLoading={isSubmitting}>
              Save Changes
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
