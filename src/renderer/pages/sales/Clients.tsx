import { useState, useEffect, useCallback } from 'react'
import { PageContainer } from '../../components/layout/PageContainer'
import { DataTable } from '../../components/ui/DataTable'
import { Button } from '../../components/ui/Button'
import { CreateClientModal } from '../../components/modals/CreateClientModal'
import { Plus } from 'lucide-react'
import { toast } from '../../store/useToastStore'
import type { ColumnDef } from '@tanstack/react-table'

interface Client {
  id: number
  clientNumber: string
  name: string
  surname: string
  city: string
  phone: string
  email: string
  createdAt: string
}

const columns: ColumnDef<Client>[] = [
  { accessorKey: 'clientNumber', header: 'Client #' },
  { 
    id: 'fullName',
    header: 'Full Name',
    cell: ({ row }) => <span className="font-medium text-white">{row.original.name} {row.original.surname}</span>
  },
  { accessorKey: 'city', header: 'City' },
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'phone', header: 'Phone' },
  { 
    accessorKey: 'createdAt', 
    header: 'Member Since',
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString()
  }
]

export function Clients() {
  const [data, setData] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  
  // Sorting & Filtering State
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<string | undefined>(undefined)
  const [sortDir, setSortDir] = useState<'asc' | 'desc' | undefined>(undefined)

  const fetchClients = useCallback(async (pageIndex: number, currentSearch: string, currentSortBy?: string, currentSortDir?: 'asc' | 'desc') => {
    setIsLoading(true)
    try {
      const res = await window.api.invoke<{ items: Client[], total: number }>('client:list', { 
        page: pageIndex, 
        pageSize: 15,
        search: currentSearch,
        sortBy: currentSortBy,
        sortDir: currentSortDir
      })
      setData(res.items)
      setTotalPages(Math.ceil(res.total / 15))
    } catch (error) {
      toast.error('Failed to load clients', (error as Error).message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchClients(page, search, sortBy, sortDir)
  }, [page, search, sortBy, sortDir, fetchClients])

  const handleClientCreated = useCallback(() => {
    fetchClients(page, search, sortBy, sortDir)
  }, [page, search, sortBy, sortDir, fetchClients])

  return (
    <PageContainer title="Clients">
      <div className="mb-6 flex justify-between items-center no-drag">
        <p className="text-slate-400">Manage your CRM pipeline and customer details.</p>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus size={16} className="mr-2" />
          Add Client
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
            onRowClick={(row) => toast.info('Client Details', `View details for ${row.name} ${row.surname}`)}
            onSearchChange={(val) => { setSearch(val); setPage(1); }}
            onSortChange={(col, dir) => { setSortBy(col); setSortDir(dir); setPage(1); }}
          />
        )}
      </div>

      <CreateClientModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={handleClientCreated}
      />
    </PageContainer>
  )
}
