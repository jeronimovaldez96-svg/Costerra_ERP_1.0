import { useState, useEffect } from 'react'
import { PageContainer } from '../../components/layout/PageContainer'
import { DataTable } from '../../components/ui/DataTable'
import { Button } from '../../components/ui/Button'
import { Plus } from 'lucide-react'
import { toast } from '../../store/useToastStore'
import type { ColumnDef } from '@tanstack/react-table'

interface SalesLead {
  id: number
  leadNumber: string
  client: { name: string, surname: string }
  name: string
  status: 'IN_PROGRESS' | 'SOLD' | 'NOT_SOLD' | 'CLOSED'
  createdAt: string
}

const statusColors = {
  IN_PROGRESS: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  SOLD: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  NOT_SOLD: 'bg-red-500/10 text-red-400 border-red-500/20',
  CLOSED: 'bg-slate-500/10 text-slate-400 border-slate-500/20'
}

const columns: ColumnDef<SalesLead>[] = [
  { accessorKey: 'leadNumber', header: 'Lead #' },
  { accessorKey: 'name', header: 'Opportunity Name' },
  { 
    id: 'clientName',
    header: 'Client',
    cell: ({ row }) => `${row.original.client.name} ${row.original.client.surname}`
  },
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

export function Leads() {
  const [data, setData] = useState<SalesLead[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    fetchLeads(page)
  }, [page])

  const fetchLeads = async (pageIndex: number) => {
    setIsLoading(true)
    try {
      const res = await window.api.invoke<{ items: SalesLead[], total: number }>('lead:list', { page: pageIndex, pageSize: 15 })
      setData(res.items)
      setTotalPages(Math.ceil(res.total / 15))
    } catch (error) {
      toast.error('Failed to load leads', (error as Error).message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <PageContainer title="Sales Leads">
      <div className="mb-6 flex justify-between items-center no-drag">
        <p className="text-slate-400">Track active opportunities and lead conversions.</p>
        <Button onClick={() => toast.info('WIP', 'Lead creation coming soon.')}>
          <Plus size={16} className="mr-2" />
          Create Lead
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
            onRowClick={(row) => toast.info('Lead Details', `View pipeline for ${row.leadNumber}`)}
          />
        )}
      </div>
    </PageContainer>
  )
}
