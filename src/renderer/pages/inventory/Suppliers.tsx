import { useState, useEffect, useCallback } from 'react'
import { PageContainer } from '../../components/layout/PageContainer'
import { DataTable } from '../../components/ui/DataTable'
import { Button } from '../../components/ui/Button'
import { CreateSupplierModal } from '../../components/modals/CreateSupplierModal'
import { Plus } from 'lucide-react'
import { toast } from '../../store/useToastStore'
import type { ColumnDef } from '@tanstack/react-table'

interface Supplier {
  id: number
  name: string
  contactName: string
  email: string
  phone: string
}

const columns: ColumnDef<Supplier>[] = [
  { accessorKey: 'name', header: 'Supplier Name' },
  { accessorKey: 'contactName', header: 'Contact' },
  { accessorKey: 'email', header: 'Email' },
  { accessorKey: 'phone', header: 'Phone' }
]

export function Suppliers() {
  const [data, setData] = useState<Supplier[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const fetchSuppliers = useCallback(async (pageIndex: number) => {
    setIsLoading(true)
    try {
      const res = await window.api.invoke<{ items: Supplier[], total: number }>('supplier:list', { page: pageIndex, pageSize: 15 })
      setData(res.items)
      setTotalPages(Math.ceil(res.total / 15))
    } catch (error) {
      toast.error('Failed to load suppliers', (error as Error).message)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchSuppliers(page)
  }, [page, fetchSuppliers])

  const handleSupplierCreated = useCallback(() => {
    fetchSuppliers(page)
  }, [page, fetchSuppliers])

  return (
    <PageContainer title="Suppliers">
      <div className="mb-6 flex justify-between items-center no-drag">
        <p className="text-slate-400">Manage your vendor network.</p>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus size={16} className="mr-2" />
          Add Supplier
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
            onRowClick={(row) => toast.info('Supplier Details', `View details for ${row.name}`)}
          />
        )}
      </div>

      <CreateSupplierModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreated={handleSupplierCreated}
      />
    </PageContainer>
  )
}
