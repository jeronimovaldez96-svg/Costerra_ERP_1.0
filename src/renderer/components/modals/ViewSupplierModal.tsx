// ────────────────────────────────────────────────────────
// Costerra ERP v2 — View/Edit Supplier Modal
// ────────────────────────────────────────────────────────

import { useState, useEffect, type FormEvent } from 'react'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Textarea } from '../ui/Textarea'
import { Button } from '../ui/Button'
import { toast } from '../../store/useToastStore'
import { Truck } from 'lucide-react'

interface ViewSupplierModalProps {
  isOpen: boolean
  onClose: () => void
  onUpdated: () => void
  supplierId: number | null
}

interface FormState {
  name: string
  contactName: string
  phone: string
  email: string
  notes: string
}

export function ViewSupplierModal({ isOpen, onClose, onUpdated, supplierId }: ViewSupplierModalProps) {
  const [form, setForm] = useState<FormState | null>(null)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen && supplierId) {
      loadSupplier()
    } else {
      setForm(null)
      setErrors({})
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, supplierId])

  const loadSupplier = async () => {
    setIsLoading(true)
    try {
      const supplier = await window.api.invoke<any>('supplier:get', supplierId)
      setForm({
        name: supplier.name,
        contactName: supplier.contactName,
        phone: supplier.phone,
        email: supplier.email,
        notes: supplier.notes
      })
    } catch (error) {
      toast.error('Failed to load supplier details', (error as Error).message)
      onClose()
    } finally {
      setIsLoading(false)
    }
  }

  const updateField = (field: keyof FormState, value: string) => {
    setForm((prev) => prev ? { ...prev, [field]: value } : null)
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const validate = (): boolean => {
    if (!form) return false
    const newErrors: Partial<Record<keyof FormState, string>> = {}

    if (!form.name.trim()) newErrors.name = 'Supplier name is required'

    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      newErrors.email = 'Invalid email address'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!validate() || !form || !supplierId) return

    setIsSubmitting(true)
    try {
      await window.api.invoke('supplier:update', {
        id: supplierId,
        data: {
          name: form.name.trim(),
          contactName: form.contactName.trim(),
          phone: form.phone.trim(),
          email: form.email.trim(),
          notes: form.notes.trim()
        }
      })

      toast.success('Supplier Updated', `"${form.name.trim()}" has been updated.`)
      onUpdated()
      onClose()
    } catch (error) {
      toast.error('Update Failed', (error as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Supplier Details">
      {isLoading || !form ? (
        <div className="flex items-center justify-center h-48">
          <span className="w-8 h-8 rounded-full border-4 border-primary-500/30 border-t-primary-500 animate-spin" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="flex items-center gap-3 pb-2 border-b border-white/5">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Truck size={20} />
            </div>
            <p className="text-sm text-slate-400">Update vendor details.</p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="edit-supplier-name" className="text-sm font-medium text-slate-300">Supplier Name *</label>
            <Input
              id="edit-supplier-name"
              value={form.name}
              onChange={(e) => { updateField('name', e.target.value); }}
              error={errors.name}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="edit-supplier-contact" className="text-sm font-medium text-slate-300">Contact Name</label>
            <Input
              id="edit-supplier-contact"
              value={form.contactName}
              onChange={(e) => { updateField('contactName', e.target.value); }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="edit-supplier-phone" className="text-sm font-medium text-slate-300">Phone</label>
              <Input
                id="edit-supplier-phone"
                value={form.phone}
                onChange={(e) => { updateField('phone', e.target.value); }}
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="edit-supplier-email" className="text-sm font-medium text-slate-300">Email</label>
              <Input
                id="edit-supplier-email"
                type="email"
                value={form.email}
                onChange={(e) => { updateField('email', e.target.value); }}
                error={errors.email}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="edit-supplier-notes" className="text-sm font-medium text-slate-300">Notes</label>
            <Textarea
              id="edit-supplier-notes"
              value={form.notes}
              onChange={(e) => { updateField('notes', e.target.value); }}
              rows={3}
            />
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
