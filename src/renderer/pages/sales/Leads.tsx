import { useState, useEffect, useCallback } from 'react'
import { PageContainer } from '../../components/layout/PageContainer'
import { DataTable } from '../../components/ui/DataTable'
import { Button } from '../../components/ui/Button'
import { CreateLeadModal } from '../../components/modals/CreateLeadModal'
import { ViewLeadModal } from '../../components/modals/ViewLeadModal'
import { Plus } from 'lucide-react'
import { toast } from '../../store/useToastStore'
import type { ColumnDef } from '@tanstack/react-table'

interface SalesLead {
  id: number
  leadNumber: string
  client: { name: string, surname: string }
  name: string
  status: 'IN_PROGRESS' | 'CLOSED_SALE' | 'CLOSED_NO_SALE'
  createdAt: string
}

const statusColors: Record<string, string> = {
  IN_PROGRESS: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  CLOSED_SALE: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  CLOSED_NO_SALE: 'bg-red-500/10 text-red-400 border-red-500/20'
}

const statusLabels: Record<string, string> = {
  IN_PROGRESS: 'In Progress',
  CLOSED_SALE: 'Closed with Sale',
  CLOSED_NO_SALE: 'Closed with no Sale'
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
        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${(statusColors[status] ?? 'bg-slate-500/10 text-slate-400 border-slate-500/20')}`}>
          {statusLabels[status] ?? status.replace('_', ' ')}
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
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [viewLeadId, setViewLeadId] = useState<number | null>(null)

  // Sorting & Filtering State
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<string | undefined>(undefined)
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | undefined>(undefined)

  const fetchLeads = useCallback(async (pageIndex: number, currentSearch: string, currentSortBy?: string, currentSortDir?: 'asc' | 'desc') => {
    setIsLoading(true)
    try {
      const res = await window.api.invoke<{ items: SalesLead[], total: number }>('lead:list', { 
        page: pageIndex, 
        pageSize: 15,
        search: currentSearch,
        sortBy: currentSortBy,
        sortDir: currentSortDir
      })
      setData(res.items)
      setTotalPages(Math.ceil(res.total / 15))
    } catch (error) {
      toast.error('Failed to load leads', (error as Error).message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchLeads(page, search, sortBy, sortDir)
  }, [page, search, sortBy, sortDir, fetchLeads])

  const handleLeadCreated = useCallback(() => {
    void fetchLeads(page, search, sortBy, sortDir)
  }, [page, search, sortBy, sortDir, fetchLeads])

  return (
    <PageContainer title="Sales Leads">
      <div className="mb-6 flex justify-between items-center no-drag">
        <p className="text-slate-400">Track active opportunities and lead conversions.</p>
        <Button onClick={() => { setIsCreateModalOpen(true); }}>
          <Plus size={16} className="mr-2" />
          Create Lead
        </Button>
      </div>

      <div className="flex-1 no-drag">
        {isLoading && data.length === 0 ? (
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
            onRowClick={(row) => { setViewLeadId(row.id); }}
            onSearchChange={(val) => { setSearch(val); setPage(1); }}
            onSortChange={(col, dir) => { setSortBy(col); setSortDir(dir); setPage(1); }}
          />
        )}
      </div>

      <CreateLeadModal
        isOpen={isCreateModalOpen}
        onClose={() => { setIsCreateModalOpen(false); }}
        onCreated={handleLeadCreated}
      />

      <ViewLeadModal
        isOpen={viewLeadId !== null}
        onClose={() => { setViewLeadId(null); }}
        onUpdated={handleLeadCreated}
        leadId={viewLeadId}
      />
    </PageContainer>
  )
}
