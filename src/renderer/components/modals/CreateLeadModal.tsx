// ────────────────────────────────────────────────────────
// Costerra ERP v2 — Create Sales Lead Modal
// ────────────────────────────────────────────────────────

import { useState, useEffect, type FormEvent } from 'react'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { Select } from '../ui/Select'
import { Button } from '../ui/Button'
import { toast } from '../../store/useToastStore'

interface CreateLeadModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: () => void
}

interface ClientOption {
  id: number
  name: string
  surname: string
}

export function CreateLeadModal({ isOpen, onClose, onCreated }: CreateLeadModalProps) {
  const [clientId, setClientId] = useState('')
  const [leadName, setLeadName] = useState('')
  const [clients, setClients] = useState<ClientOption[]>([])
  const [isLoadingClients, setIsLoadingClients] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      loadClients()
    } else {
      setClientId('')
      setLeadName('')
      setError('')
    }
  }, [isOpen])

  const loadClients = async () => {
    setIsLoadingClients(true)
    try {
      // Fetching max page size to populate the dropdown for now
      const res = await window.api.invoke<{ items: ClientOption[], total: number }>('client:list', { page: 1, pageSize: 500 })
      setClients(res.items)
    } catch (err) {
      toast.error('Failed to load clients', (err as Error).message)
    } finally {
      setIsLoadingClients(false)
    }
  }

  const handleClose = () => {
    setClientId('')
    setLeadName('')
    setError('')
    onClose()
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!clientId) {
      setError('Please select a client.')
      return
    }
    if (!leadName.trim()) {
      setError('Opportunity name is required.')
      return
    }

    setIsSubmitting(true)
    try {
      await window.api.invoke('lead:create', {
        clientId: parseInt(clientId, 10),
        name: leadName.trim()
      })

      toast.success('Lead Created', `New opportunity "${leadName.trim()}" added.`)
      onCreated()
      handleClose()
    } catch (err) {
      toast.error('Creation Failed', (err as Error).message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Create Sales Lead">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg">
            {error}
          </div>
        )}

        <div className="space-y-1.5">
          <label htmlFor="lead-client" className="text-sm font-medium text-slate-300">Client *</label>
          <Select
            id="lead-client"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            disabled={isLoadingClients}
          >
            <option value="">Select a client...</option>
            {clients.map(client => (
              <option key={client.id} value={client.id}>
                {client.name} {client.surname}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="lead-name" className="text-sm font-medium text-slate-300">Opportunity Name *</label>
          <Input
            id="lead-name"
            placeholder="e.g. Acme Corp Web App Renewal"
            value={leadName}
            onChange={(e) => setLeadName(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
          <Button type="button" variant="ghost" onClick={handleClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            Create Lead
          </Button>
        </div>
      </form>
    </Modal>
  )
}
