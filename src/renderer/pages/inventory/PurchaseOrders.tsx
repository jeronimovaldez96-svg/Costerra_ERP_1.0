import { useState, useEffect, useCallback } from 'react'
import { PageContainer } from '../../components/layout/PageContainer'
import { DataTable } from '../../components/ui/DataTable'
import { Button } from '../../components/ui/Button'
import { CreatePurchaseOrderModal } from '../../components/modals/CreatePurchaseOrderModal'
import { Plus } from 'lucide-react'
import { toast } from '../../store/useToastStore'
import type { ColumnDef } from '@tanstack/react-table'

interface PurchaseOrder {
  id: number
  poNumber: string
  supplier: { name: string }
  description: string
  status: 'DRAFT' | 'IN_TRANSIT' | 'DELIVERED'
  createdAt: string
}

const statusColors = {
  DRAFT: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
  IN_TRANSIT: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  DELIVERED: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
}

const columns: ColumnDef<PurchaseOrder>[] = [
  { accessorKey: 'poNumber', header: 'PO Number' },
  { accessorKey: 'supplier.name', header: 'Supplier' },
  { accessorKey: 'description', header: 'Description' },
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

export function PurchaseOrders() {
  const [data, setData] = useState<PurchaseOrder[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const fetchPOs = useCallback(async (pageIndex: number) => {
    setIsLoading(true)
    try {
      const res = await window.api.invoke<{ items: PurchaseOrder[], total: number }>('po:list', { page: pageIndex, pageSize: 15 })
      setData(res.items)
      setTotalPages(Math.ceil(res.total / 15))
    } catch (error) {
      toast.error('Failed to load purchase orders', (error as Error).message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPOs(page)
  }, [page, fetchPOs])

  const handlePOCreated = useCallback(() => {
    fetchPOs(page)
  }, [page, fetchPOs])

  return (
    <PageContainer title="Purchase Orders">
      <div className="mb-6 flex justify-between items-center no-drag">
        <p className="text-slate-400">Track inbound inventory shipments.</p>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus size={16} className="mr-2" />
          Create PO
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
            onRowClick={(row) => toast.info('PO Details', `View details for ${row.poNumber}`)}
          />
        )}
      </div>

      <CreatePurchaseOrderModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={handlePOCreated}
      />
    </PageContainer>
  )
}
