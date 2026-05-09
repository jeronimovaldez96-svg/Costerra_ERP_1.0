// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Create Client Modal
// ────────────────────────────────────────────────────────

import { useState, type FormEvent } from 'react'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Textarea } from '../ui/Textarea'
import { Button } from '../ui/Button'
import { toast } from '../../store/useToastStore'

interface CreateClientModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
}

interface FormState {
  name: string
  surname: string
  address: string
  city: string
  zipCode: string
  phone: string
  email: string
  notes: string
}

const INITIAL_STATE: FormState = {
  name: '',
  surname: '',
  address: '',
  city: '',
  zipCode: '',
  phone: '',
  email: '',
  notes: ''
}

export function CreateClientModal({ isOpen, onClose, onCreated }: CreateClientModalProps) {
  const [form, setForm] = useState<FormState>(INITIAL_STATE)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleClose = () => {
    setForm(INITIAL_STATE)
    setErrors({})
    onClose()
  }

  const updateField = (field: keyof FormState, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormState, string>> = {}

    if (!form.name.trim()) newErrors.name = 'Name is required'
    if (!form.surname.trim()) newErrors.surname = 'Surname is required'

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!validate()) return

    setIsSubmitting(true)
    try {
      await window.api.invoke('client:create', {
        name: form.name.trim(),
        surname: form.surname.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        zipCode: form.zipCode.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        notes: form.notes.trim()
      })

      toast.success('Client Created', `Successfully added ${form.name.trim()} ${form.surname.trim()}`)
      onCreated()
      handleClose()
    } catch (error) {
      toast.error('Creation Failed', (error as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add New Client">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="client-name" className="text-sm font-medium text-slate-300">First Name *</label>
            <Input
              id="client-name"
              placeholder="e.g. John"
              value={form.name}
              onChange={(e) => { updateField('name', e.target.value); }}
              error={errors.name}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="client-surname" className="text-sm font-medium text-slate-300">Last Name *</label>
            <Input
              id="client-surname"
              placeholder="e.g. Doe"
              value={form.surname}
              onChange={(e) => { updateField('surname', e.target.value); }}
              error={errors.surname}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="client-address" className="text-sm font-medium text-slate-300">Address</label>
          <Input
            id="client-address"
            placeholder="e.g. 123 Main St"
            value={form.address}
            onChange={(e) => { updateField('address', e.target.value); }}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="client-city" className="text-sm font-medium text-slate-300">City</label>
            <Input
              id="client-city"
              placeholder="e.g. New York"
              value={form.city}
              onChange={(e) => { updateField('city', e.target.value); }}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="client-zipCode" className="text-sm font-medium text-slate-300">Zip Code</label>
            <Input
              id="client-zipCode"
              placeholder="e.g. 10001"
              value={form.zipCode}
              onChange={(e) => { updateField('zipCode', e.target.value); }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label htmlFor="client-phone" className="text-sm font-medium text-slate-300">Phone Number</label>
            <Input
              id="client-phone"
              placeholder="e.g. (555) 123-4567"
              value={form.phone}
              onChange={(e) => { updateField('phone', e.target.value); }}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="client-email" className="text-sm font-medium text-slate-300">Email Address</label>
            <Input
              id="client-email"
              type="email"
              placeholder="e.g. john@example.com"
              value={form.email}
              onChange={(e) => { updateField('email', e.target.value); }}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="client-notes" className="text-sm font-medium text-slate-300">Notes</label>
          <Textarea
            id="client-notes"
            placeholder="Optional notes or details..."
            value={form.notes}
            onChange={(e) => { updateField('notes', e.target.value); }}
            rows={3}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Create Client
          </Button>
        </div>
      </form>
    </Modal>
  )
}
