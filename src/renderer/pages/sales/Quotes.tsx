import { useState, useEffect } from 'react'
import { PageContainer } from '../../components/layout/PageContainer'
import { DataTable } from '../../components/ui/DataTable'
import { Button } from '../../components/ui/Button'
import { CreateQuoteModal } from '../../components/modals/CreateQuoteModal'
import { Plus } from 'lucide-react'
import { toast } from '../../store/useToastStore'
import type { ColumnDef } from '@tanstack/react-table'

interface Quote {
  id: number
  quoteNumber: string
  salesLead: { leadNumber: string, client: { name: string, surname: string } }
  status: 'DRAFT' | 'SENT' | 'SOLD' | 'REJECTED' | 'NOT_SOLD'
  createdAt: string
}

const statusColors = {
  DRAFT: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  SENT: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  SOLD: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  REJECTED: 'bg-red-500/10 text-red-400 border-red-500/20',
  NOT_SOLD: 'bg-amber-500/10 text-amber-400 border-amber-500/20'
}

const columns: ColumnDef<Quote>[] = [
  { accessorKey: 'quoteNumber', header: 'Quote #' },
  { 
    id: 'clientName',
    header: 'Client',
    cell: ({ row }) => `${row.original.salesLead.client.name} ${row.original.salesLead.client.surname}`
  },
  { accessorKey: 'salesLead.leadNumber', header: 'Lead Ref' },
  { 
    accessorKey: 'createdAt', 
    header: 'Created',
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString()
  },
  { 
    accessorKey: 'status', 
    header: 'Status',
    cell: ({ row }) => {
      const status = row.original.status
      return (
        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusColors[status]}`}>
          {status.replace('_', ' ')}
        </span>
      )
    }
  }
]

export function Quotes() {
  const [data, setData] = useState<Quote[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  useEffect(() => {
    fetchQuotes(page)
  }, [page])

  const fetchQuotes = async (pageIndex: number) => {
    setIsLoading(true)
    try {
      const res = await window.api.invoke<{ items: Quote[], total: number }>('quote:list', { page: pageIndex, pageSize: 15 })
      setData(res.items)
      setTotalPages(Math.ceil(res.total / 15))
    } catch (error) {
      toast.error('Failed to load quotes', (error as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleQuoteCreated = () => {
    fetchQuotes(page)
  }

  return (
    <PageContainer title="Quotes">
      <div className="mb-6 flex justify-between items-center no-drag">
        <p className="text-slate-400">Manage pricing proposals and send quotes to clients.</p>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus size={16} className="mr-2" />
          Create Quote
        </Button>
      </div>

      <div className="flex-1 no-drag">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <span className="w-8 h-8 rounded-full border-4 border-primary-500/30 border-t-primary-500 animate-spin" />
          </div>
        ) : (
          <DataTable 
            columns={columns} 
            data={data} 
            pageIndex={page}
            pageCount={totalPages}
            onPageChange={setPage}
            onRowClick={(row) => toast.info('Quote Details', `View details for ${row.quoteNumber}`)}
          />
        )}
      </div>

      <CreateQuoteModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={handleQuoteCreated}
      />
    </PageContainer>
  )
}
