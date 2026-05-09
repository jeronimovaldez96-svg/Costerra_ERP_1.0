// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Create Supplier Modal
// Collects vendor data and sends to supplier:create.
// ────────────────────────────────────────────────────────

import React, { useState, useCallback } from 'react'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Textarea } from '../ui/Textarea'
import { Button } from '../ui/Button'
import { toast } from '../../store/useToastStore'
import { Truck } from 'lucide-react'

interface CreateSupplierModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
}

interface FormState {
  name: string
  contactName: string
  phone: string
  email: string
  notes: string
}

const INITIAL_FORM: FormState = {
  name: '',
  contactName: '',
  phone: '',
  email: '',
  notes: ''
}

export function CreateSupplierModal({ isOpen, onClose, onCreated }: CreateSupplierModalProps) {
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
    if (errors[field] !== undefined) {
      setErrors((prev) => ({ ...prev, [field]: undefined }))
    }
  }

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormState, string>> = {}

    if (!form.name.trim()) newErrors.name = 'Supplier name is required'

    // Email is optional, but if provided must be valid
    if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      newErrors.email = 'Invalid email address'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    try {
      await window.api.invoke('supplier:create', {
        name: form.name.trim(),
        contactName: form.contactName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        notes: form.notes.trim()
      })

      toast.success('Supplier Created', `"${form.name.trim()}" has been added to your vendor network.`)
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
    <Modal isOpen={isOpen} onClose={handleClose} title="Add New Supplier">
      <form onSubmit={(e) => { void handleSubmit(e); }} className="space-y-5">
        {/* Header icon */}
        <div className="flex items-center gap-3 pb-2 border-b border-white/5">
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
            <Truck size={20} />
          </div>
          <p className="text-sm text-slate-400">Add a new vendor to your supply chain. Only the name is required.</p>
        </div>

        {/* Supplier Name */}
        <div className="space-y-1.5">
          <label htmlFor="supplier-name" className="text-sm font-medium text-slate-300">Supplier Name *</label>
          <Input
            id="supplier-name"
            placeholder="e.g. Maderas del Norte S.A."
            value={form.name}
            onChange={(e) => { updateField('name', e.target.value); }}
            error={errors.name}
          />
        </div>

        {/* Contact Name */}
        <div className="space-y-1.5">
          <label htmlFor="supplier-contact" className="text-sm font-medium text-slate-300">Contact Name</label>
          <Input
            id="supplier-contact"
            placeholder="e.g. Carlos Mendoza"
            value={form.contactName}
            onChange={(e) => { updateField('contactName', e.target.value); }}
          />
        </div>

        {/* Phone + Email row */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="supplier-phone" className="text-sm font-medium text-slate-300">Phone</label>
            <Input
              id="supplier-phone"
              placeholder="e.g. +52 55 1234 5678"
              value={form.phone}
              onChange={(e) => { updateField('phone', e.target.value); }}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="supplier-email" className="text-sm font-medium text-slate-300">Email</label>
            <Input
              id="supplier-email"
              type="email"
              placeholder="e.g. ventas@maderas.mx"
              value={form.email}
              onChange={(e) => { updateField('email', e.target.value); }}
              error={errors.email}
            />
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-1.5">
          <label htmlFor="supplier-notes" className="text-sm font-medium text-slate-300">Notes</label>
          <Textarea
            id="supplier-notes"
            placeholder="Payment terms, delivery schedules, special conditions..."
            value={form.notes}
            onChange={(e) => { updateField('notes', e.target.value); }}
            rows={3}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Create Supplier
          </Button>
        </div>
      </form>
    </Modal>
  )
}
